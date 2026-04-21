import pdfplumber
import re
from dataclasses import dataclass, field
from typing import Optional
import io
import numpy as np
from PIL import Image

# EasyOCR reader — loaded lazily (first call downloads ~500MB model)
_ocr_reader = None

def get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(['he', 'en'], gpu=False)
    return _ocr_reader


@dataclass
class ParsedProduct:
    name: str
    price: float
    code: Optional[str] = None
    unit: Optional[str] = None
    category: Optional[str] = None


PRICE_PATTERNS = [
    r'₪\s*([\d,]+\.?\d*)',
    r'([\d,]+\.?\d*)\s*₪',
    r'(?:מחיר|עלות|price)[:\s]+([\d,]+\.?\d*)',
    r'\b(\d{1,4}(?:\.\d{1,2})?)\b',  # fallback: standalone number
]

NAME_HEADERS = ['שם', 'מוצר', 'תיאור', 'פריט', 'name', 'product', 'description', 'item']
PRICE_HEADERS = ['מחיר', 'עלות', 'price', 'cost', 'סכום']
CODE_HEADERS = ['קוד', 'מקט', 'מק"ט', 'מק״ט', 'מספר', 'code', 'sku', 'ref', '#', 'item']
UNIT_HEADERS = ['יחידה', 'אריזה', 'כמות', 'unit', 'pack', 'qty']

# All known Hebrew keywords (forward + reversed) for visual-order detection
_ALL_HE_KEYWORDS = NAME_HEADERS[:5] + PRICE_HEADERS[:3] + CODE_HEADERS[:3] + UNIT_HEADERS[:3]


def _is_hebrew(text: str) -> bool:
    return any('\u05d0' <= c <= '\u05ea' for c in (text or ''))


def _fix_visual_rtl(text: str) -> str:
    """
    Some PDF generators store Hebrew in visual order (chars reversed).
    Reverse the string while keeping numeric sub-strings intact.
    E.g. 'תויינבגע 6.90' → '6.90 עגבניות'
    """
    if not text or not _is_hebrew(text):
        return text
    # Split into segments of (hebrew/mixed) vs (ascii-digits / punctuation)
    # Simple approach: reverse the whole string then fix number segments
    parts = re.split(r'(\d[\d.,]*)', text)
    # Reverse the list of parts AND reverse each non-numeric part
    reversed_parts = []
    for part in reversed(parts):
        if re.fullmatch(r'\d[\d.,]*', part):
            reversed_parts.append(part)   # numbers stay as-is
        else:
            reversed_parts.append(part[::-1])  # reverse Hebrew text
    return ''.join(reversed_parts).strip()


_HEBREW_SOFIT = set('ךםןףץ')  # final-form letters only appear at END of words


def _detect_visual_order(tables: list) -> bool:
    """
    Detect reversed (visual-order) Hebrew using two methods:
    1. Header keyword matching (reversed vs forward)
    2. Sofit (final-form) letters appearing at the START of words
       — this is physically impossible in correct Hebrew.
    """
    if not tables or not tables[0]:
        return False

    # Method 1: header keyword matching
    header_row = tables[0][0]
    if header_row:
        header_text = ' '.join(str(c) for c in header_row if c)
        if _is_hebrew(header_text):
            forward = sum(1 for kw in _ALL_HE_KEYWORDS if kw in header_text)
            backward = sum(1 for kw in _ALL_HE_KEYWORDS if kw in header_text[::-1])
            if backward > forward:
                return True

    # Method 2: scan data rows for sofit letters at word starts
    sofit_starts = 0
    total_he_words = 0
    for row in tables[0][1:min(8, len(tables[0]))]:  # first 7 data rows
        for cell in (row or []):
            if not cell or not _is_hebrew(str(cell)):
                continue
            for word in str(cell).split():
                if _is_hebrew(word):
                    total_he_words += 1
                    if word[0] in _HEBREW_SOFIT:
                        sofit_starts += 1

    if total_he_words >= 3 and sofit_starts / total_he_words > 0.08:
        return True

    return False


def extract_price(text: str) -> Optional[float]:
    if not text:
        return None
    text = str(text).strip()
    for pattern in PRICE_PATTERNS[:-1]:  # try specific patterns first
        m = re.search(pattern, text)
        if m:
            try:
                return float(m.group(1).replace(',', ''))
            except ValueError:
                continue
    # fallback: find any number that looks like a price (1-9999)
    # but reject pure long integers (6+ digits = likely SKU/code)
    if re.fullmatch(r'\d{6,}', text.strip()):
        return None  # looks like a code, not a price
    m = re.search(r'\b(\d{1,4}(?:\.\d{1,2})?)\b', text)
    if m:
        val = float(m.group(1))
        if 0.1 <= val <= 9999:
            return val
    return None


def detect_column_map(headers: list[str], fix_rtl: bool = False) -> dict:
    mapping = {}
    for i, h in enumerate(headers):
        h_str = str(h).strip() if h else ''
        if fix_rtl:
            h_str = _fix_visual_rtl(h_str)
        h_lower = h_str.lower()
        if any(kw in h_lower for kw in NAME_HEADERS) and 'name' not in mapping:
            mapping['name'] = i
        elif any(kw in h_lower for kw in PRICE_HEADERS) and 'price' not in mapping:
            mapping['price'] = i
        elif any(kw in h_lower for kw in CODE_HEADERS) and 'code' not in mapping:
            mapping['code'] = i
        elif any(kw in h_lower for kw in UNIT_HEADERS) and 'unit' not in mapping:
            mapping['unit'] = i
    return mapping


def _looks_like_sku(text: str) -> bool:
    """Return True if text looks like a SKU/code — pure integer with 5+ digits."""
    t = str(text).strip()
    return bool(re.fullmatch(r'\d{5,}', t))  # 5+ digit integer = likely a code


def _find_price_col(table: list[list], num_cols: int) -> Optional[int]:
    """Find the column index that best looks like prices.

    Scoring:
    - +2 for values with decimal point (e.g. 12.50)
    - +1 for values that are numeric and in price range
    - -2 for values that look like SKUs (long integers)
    Prefer the column with the highest score.
    """
    best_col, best_score = None, -1
    for col_idx in range(num_cols):
        values = [str(row[col_idx]).strip() for row in table[1:] if row and col_idx < len(row) and row[col_idx]]
        if not values:
            continue
        score = 0
        for v in values:
            if re.search(r'\d+\.\d{1,2}', v):          # has decimal → strong price signal
                score += 2
            elif re.search(r'₪', v):                    # has shekel sign
                score += 2
            elif _looks_like_sku(v):                    # long integer → penalise
                score -= 2
            elif extract_price(v) is not None:          # generic number in price range
                score += 1
        # require at least 40% of rows to contribute positively
        positive = sum(1 for v in values if re.search(r'\d+\.\d{1,2}', v) or re.search(r'₪', v) or (not _looks_like_sku(v) and extract_price(v) is not None))
        if positive > len(values) * 0.4 and score > best_score:
            best_score = score
            best_col = col_idx
    return best_col


def _find_name_col(table: list[list], num_cols: int, exclude: int) -> int:
    """Find the column with the most non-numeric, non-empty text (excluding the price col)."""
    best_col, best_score = 0, -1
    for col_idx in range(num_cols):
        if col_idx == exclude:
            continue
        values = [str(row[col_idx]) for row in table[1:] if row and col_idx < len(row) and row[col_idx]]
        # Score: cells that have letters (not just numbers)
        score = sum(1 for v in values if re.search(r'[^\d\s.,₪"\'()\-]', v))
        if score > best_score:
            best_score, best_col = score, col_idx
    return best_col


def parse_table(table: list[list], fix_rtl: bool = False) -> list[ParsedProduct]:
    products = []
    if not table or len(table) < 2:
        return products

    num_cols = max(len(row) for row in table if row)
    headers = [str(h).strip() if h else '' for h in table[0]]
    col_map = detect_column_map(headers, fix_rtl=fix_rtl)

    # Heuristic fallback: find price column first, then name column
    if 'price' not in col_map:
        price_col = _find_price_col(table, num_cols)
        if price_col is not None:
            col_map['price'] = price_col

    if 'name' not in col_map:
        price_col = col_map.get('price', -1)
        col_map['name'] = _find_name_col(table, num_cols, exclude=price_col)

    # If name and price ended up on the same column, fix name
    if col_map.get('name') == col_map.get('price'):
        price_col = col_map['price']
        col_map['name'] = _find_name_col(table, num_cols, exclude=price_col)

    for row in table[1:]:
        if not row:
            continue
        try:
            name_idx = col_map.get('name', 0)
            price_idx = col_map.get('price', 1)

            if name_idx >= len(row) or price_idx >= len(row):
                continue

            raw_name = str(row[name_idx]).strip() if row[name_idx] else ''
            name = _fix_visual_rtl(raw_name) if fix_rtl else raw_name
            if not name or len(name) < 2:
                continue

            price = extract_price(str(row[price_idx]) if row[price_idx] else '')
            if price is None or price <= 0:
                continue

            unit_raw = str(row[col_map['unit']]).strip() if 'unit' in col_map and col_map['unit'] < len(row) else None
            unit = _fix_visual_rtl(unit_raw) if (fix_rtl and unit_raw) else unit_raw

            # Clean name: strip leading asterisks/bullets and extract embedded unit
            name, unit = _clean_product_name(name, unit)

            products.append(ParsedProduct(
                name=name,
                price=price,
                code=str(row[col_map['code']]).strip() if 'code' in col_map and col_map['code'] < len(row) else None,
                unit=unit,
            ))
        except Exception:
            continue

    return products


def parse_text_lines(text: str) -> list[ParsedProduct]:
    """Fallback: parse free text line by line."""
    products = []
    for line in text.split('\n'):
        line = line.strip()
        if not line or len(line) < 3:
            continue
        price = extract_price(line)
        if price and 0.5 <= price <= 5000:
            # strip price from line to get name
            name = re.sub(r'₪\s*[\d,]+\.?\d*', '', line)
            name = re.sub(r'[\d,]+\.?\d*\s*₪', '', name)
            name = re.sub(r'\b\d{1,4}(?:\.\d{1,2})?\b', '', name)
            name = name.strip(' .-|,')
            # Clean name: strip leading asterisks/bullets and extract embedded unit
            name, unit = _clean_product_name(name)
            if len(name) >= 2:
                products.append(ParsedProduct(name=name, price=price, unit=unit))
    return products


def deduplicate(products: list[ParsedProduct]) -> list[ParsedProduct]:
    seen: dict = {}
    for p in products:
        # If product has a code, use code as unique key (same code = same product)
        if p.code and p.code.strip():
            key = f"code:{p.code.strip().lower()}"
        else:
            key = f"name:{p.name.strip().lower()[:50]}"
        existing = seen.get(key)
        # Keep product with price info (prefer non-zero price over zero)
        if existing is None or (p.price and p.price > 0 and (not existing.price or existing.price <= 0)):
            seen[key] = p
    return list(seen.values())


def parse_catalog_image(file_bytes: bytes) -> list[ParsedProduct]:
    """
    Parse a catalog from an image file (JPG/PNG/WEBP) using EasyOCR.
    Groups detected text into rows by Y position, then extracts name+price per row.
    """
    img = Image.open(io.BytesIO(file_bytes)).convert('RGB')
    img_np = np.array(img)

    reader = get_ocr_reader()
    results = reader.readtext(img_np)
    # results: list of ([box], text, confidence)

    if not results:
        return []

    # Build list of (center_y, center_x, text) sorted by Y
    detections = []
    for (box, text, conf) in results:
        if conf < 0.3 or not text.strip():
            continue
        ys = [pt[1] for pt in box]
        xs = [pt[0] for pt in box]
        cy = (min(ys) + max(ys)) / 2
        cx = (min(xs) + max(xs)) / 2
        detections.append((cy, cx, text.strip()))

    if not detections:
        return []

    # Group into rows: items within 15px vertically are the same row
    detections.sort(key=lambda d: d[0])
    row_threshold = max(12, (detections[-1][0] - detections[0][0]) / len(detections) * 0.8)

    rows: list[list[tuple]] = []
    current_row: list[tuple] = [detections[0]]
    for det in detections[1:]:
        if abs(det[0] - current_row[-1][0]) <= row_threshold:
            current_row.append(det)
        else:
            rows.append(current_row)
            current_row = [det]
    rows.append(current_row)

    # For each row: sort by X (right-to-left for Hebrew), separate text from price
    products = []
    for row in rows:
        row.sort(key=lambda d: d[1])  # sort left→right by X
        texts = [d[2] for d in row]

        # Find price among the tokens
        price = None
        name_parts = []
        for token in texts:
            p = extract_price(token)
            if p and price is None:
                price = p
            else:
                name_parts.append(token)

        if price is None or not name_parts:
            continue

        name = ' '.join(name_parts).strip()
        # Remove leftover price artifacts
        name = re.sub(r'\b\d{1,4}(?:\.\d{1,2})?\b', '', name).strip(' .-|,₪')
        if len(name) < 2:
            continue

        products.append(ParsedProduct(name=name, price=price))

    return deduplicate(products)


def _clean_product_name(name: str, unit: Optional[str] = None) -> tuple[str, Optional[str]]:
    """
    Normalize a product name that may contain formatting artifacts:
    1. Strip leading bullets/asterisks: '* product' → 'product'
    2. Extract embedded unit from 'product,unit' format if no unit was already found.
       Only splits if the suffix is short (≤15 chars), has no digits, and contains Hebrew.
    Returns (cleaned_name, unit).
    """
    # Strip leading asterisks, bullets, dashes, whitespace
    cleaned = re.sub(r'^[\*\•\-–—\s]+', '', name).strip()

    # Extract unit from trailing ',unit' if no unit col provided
    extracted_unit = unit
    if not extracted_unit and ',' in cleaned:
        parts = cleaned.rsplit(',', 1)
        suffix = parts[1].strip()
        # Valid unit suffix: short, no digits, contains Hebrew (e.g. "יח", "קרטון")
        if len(suffix) <= 20 and not re.search(r'\d', suffix) and _is_hebrew(suffix):
            cleaned = parts[0].strip()
            extracted_unit = suffix
        # Also handle weight/size suffix with digits: '4 ק"ג', '125 גרם', '0.5 ליטר'
        elif re.match(
            r'^\d+(?:[.,]\d+)?\s*'
            r'(?:ק["\u05f4\u2019]?ג|גרם|מ["\u05f4\u2019]?ל|ליטר|יח["\u05f4\u2019]?|kg\b|gr\b|ml\b)',
            suffix, re.IGNORECASE
        ):
            cleaned = parts[0].strip()
            extracted_unit = suffix

    return cleaned, extracted_unit


def _is_product_code(val: str) -> bool:
    """Return True if a cell value looks like a product code (not a price)."""
    if not val:
        return False
    # Codes are typically alphanumeric strings like "MH-S1015", "ABC123", etc.
    # They contain letters mixed with numbers, or are clearly not standalone prices
    return bool(re.match(r'^[A-Za-z][\w\s\-/]+$', val.strip()))


def _is_valid_price(v) -> bool:
    """Return True if value looks like a real product price (not a year, date, code)."""
    import datetime
    if isinstance(v, datetime.datetime) or isinstance(v, datetime.date):
        return False
    if isinstance(v, bool):
        return False
    if isinstance(v, (int, float)):
        f = float(v)
        # Exclude years (2000-2099) and values out of price range
        if 2000 <= f <= 2099:
            return False
        return 0.1 <= f <= 9999
    if isinstance(v, str):
        s = v.strip()
        if re.match(r'^20[0-9]{2}$', s):  # year like 2026
            return False
        p = extract_price(s)
        return p is not None and 0.1 <= p <= 9999
    return False


# Pattern for weight/size units (Hebrew + common English)
_WEIGHT_UNIT_RE = re.compile(
    r'(\d+(?:[.,]\d+)?)\s*'
    r'(?:ק["\u05f4\u2019]?ג|גרם|מ["\u05f4\u2019]?ל|ליטר|יח["\u05f4\u2019]?|kg\b|gr\b|ml\b)',
    re.IGNORECASE,
)


def _col_values_are_weights(col_idx: int, data_rows: list[list], num_cols: int) -> bool:
    """
    Return True if the numeric values in col_idx look like weights, not prices.
    Logic: for each row, if the same number appears in another column's text
    followed by a weight unit (e.g. value=4 and another cell contains '4 ק"ג'),
    it is a weight column.  Requires ≥5 checked rows and >30% match rate.
    """
    matches = 0
    checked = 0

    for row in data_rows[:40]:
        if col_idx >= len(row) or row[col_idx] is None:
            continue
        pval = row[col_idx]
        if not isinstance(pval, (int, float)):
            continue
        checked += 1
        pval_f = float(pval)

        for other_idx in range(num_cols):
            if other_idx == col_idx or other_idx >= len(row):
                continue
            cell = row[other_idx]
            if not cell or not isinstance(cell, str):
                continue
            for m in _WEIGHT_UNIT_RE.finditer(cell):
                w = float(m.group(1).replace(',', '.'))
                if abs(w - pval_f) < 0.01:
                    matches += 1
                    break

    return checked >= 5 and (matches / checked) > 0.3


def _find_price_col_excel(data_rows: list[list], num_cols: int) -> Optional[int]:
    """
    Find the column that contains numeric prices — ONLY if the column is
    purely numeric (all non-empty values are valid prices, no text mixed in),
    AND the values are not weights embedded in product names.
    Returns None if no clearly numeric price column is found.
    """
    best_col = None
    best_score = 0

    for col_idx in range(num_cols):
        values = [row[col_idx] for row in data_rows if col_idx < len(row)]
        numeric_prices = 0
        total_non_empty = 0
        has_text = False

        for v in values:
            if v is None or v == '':
                continue
            total_non_empty += 1
            if isinstance(v, str) and re.search(r'[א-ת]', v):
                # Column has Hebrew text — not a price column
                has_text = True
                break
            if _is_valid_price(v):
                numeric_prices += 1

        if has_text or total_non_empty == 0:
            continue

        score = numeric_prices / total_non_empty
        # Require >80% of values to be valid prices (stricter threshold)
        if score > best_score and score >= 0.8:
            # Skip columns whose values are weights embedded in product names
            if _col_values_are_weights(col_idx, data_rows, num_cols):
                continue
            best_score = score
            best_col = col_idx

    return best_col


def _find_name_col_excel(data_rows: list[list], num_cols: int, exclude_cols: set) -> int:
    """Find the column with the most Hebrew/text content (excluding excluded cols)."""
    best_col = 0
    best_score = -1
    for col_idx in range(num_cols):
        if col_idx in exclude_cols:
            continue
        values = [row[col_idx] for row in data_rows if col_idx < len(row) and row[col_idx] not in (None, '')]
        # Score: cells with Hebrew characters
        score = sum(1 for v in values if isinstance(v, str) and _is_hebrew(str(v)))
        # Also count long text strings
        score += sum(0.5 for v in values if isinstance(v, str) and len(str(v)) > 5)
        if score > best_score:
            best_score = score
            best_col = col_idx
    return best_col


def parse_catalog_excel(file_bytes: bytes) -> list[ParsedProduct]:
    """Parse a supplier catalog from an Excel file (.xlsx/.xls)."""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    all_products: list[ParsedProduct] = []

    for sheet in wb.worksheets:
        # Get all rows with raw values (keep types — floats stay floats)
        raw_rows = list(sheet.iter_rows(values_only=True))
        non_empty = [list(r) for r in raw_rows if any(v is not None and v != '' for v in r)]
        if len(non_empty) < 2:
            continue

        # Find header row (first row with text keywords)
        header_idx = 0
        for i, row in enumerate(non_empty[:10]):
            row_text = ' '.join(str(v).lower() for v in row if v is not None)
            if any(kw in row_text for kw in NAME_HEADERS + PRICE_HEADERS + CODE_HEADERS):
                header_idx = i
                break

        header = non_empty[header_idx]
        data_rows = non_empty[header_idx + 1:]
        if not data_rows:
            continue

        num_cols = max(len(r) for r in non_empty)

        # Try to map columns from header keywords
        col_map = {}
        for i, h in enumerate(header):
            if h is None:
                continue
            h_lower = str(h).lower().strip()
            if any(kw in h_lower for kw in NAME_HEADERS) and 'name' not in col_map:
                col_map['name'] = i
            elif any(kw in h_lower for kw in PRICE_HEADERS) and 'price' not in col_map:
                col_map['price'] = i
            elif any(kw in h_lower for kw in CODE_HEADERS) and 'code' not in col_map:
                col_map['code'] = i
            elif any(kw in h_lower for kw in UNIT_HEADERS) and 'unit' not in col_map:
                col_map['unit'] = i

        # Fallback: detect price col heuristically (pure numeric column)
        if 'price' not in col_map:
            price_col = _find_price_col_excel(data_rows, num_cols)
            if price_col is not None:
                col_map['price'] = price_col

        # Fallback: detect name col (most Hebrew text)
        if 'name' not in col_map:
            exclude = {col_map.get('price', -1), col_map.get('code', -1)} - {-1}
            col_map['name'] = _find_name_col_excel(data_rows, num_cols, exclude)

        # Make sure name and price aren't the same column
        if col_map.get('name') == col_map.get('price'):
            exclude = {col_map['price']}
            col_map['name'] = _find_name_col_excel(data_rows, num_cols, exclude)

        name_col = col_map.get('name', 0)
        price_col = col_map.get('price')
        code_col = col_map.get('code')
        unit_col = col_map.get('unit')

        for row in data_rows:
            try:
                # Get name
                name_val = row[name_col] if name_col < len(row) else None
                if name_val is None or str(name_val).strip() == '':
                    continue
                name = str(name_val).strip()
                if len(name) < 2:
                    continue

                # Get price
                price = None
                if price_col is not None and price_col < len(row):
                    pval = row[price_col]
                    if _is_valid_price(pval):
                        if isinstance(pval, (int, float)):
                            price = float(pval)
                        else:
                            price = extract_price(str(pval))

                # Allow adding product even without price

                # Get code
                code = None
                if code_col is not None and code_col < len(row):
                    cv = row[code_col]
                    code = str(cv).strip() if cv not in (None, '') else None

                # Get unit
                unit = None
                if unit_col is not None and unit_col < len(row):
                    uv = row[unit_col]
                    unit = str(uv).strip() if uv not in (None, '') else None

                # Clean name: strip leading asterisks/bullets and extract embedded unit
                name, unit = _clean_product_name(name, unit)
                if len(name) < 2:
                    continue

                all_products.append(ParsedProduct(
                    name=name,
                    price=price if price is not None else 0.0,
                    code=code,
                    unit=unit,
                ))
            except Exception:
                continue

    return deduplicate(all_products)


def parse_catalog_pdf(file_bytes: bytes) -> list[ParsedProduct]:
    """Main entry point: parse a supplier catalog PDF."""
    all_products: list[ParsedProduct] = []

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()

            # Detect visual-order (reversed) Hebrew on first page with tables
            fix_rtl = False
            if tables:
                fix_rtl = _detect_visual_order(tables)

            found_in_tables = False
            for table in tables:
                parsed = parse_table(table, fix_rtl=fix_rtl)
                if parsed:
                    all_products.extend(parsed)
                    found_in_tables = True

            # Fallback to text if no tables
            if not found_in_tables:
                text = page.extract_text() or ''
                if text:
                    lines_fixed = _fix_visual_rtl(text) if fix_rtl else text
                    all_products.extend(parse_text_lines(lines_fixed))

    return deduplicate(all_products)
