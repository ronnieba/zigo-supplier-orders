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
CODE_HEADERS = ['קוד', 'מקט', 'מספר', 'code', 'sku', 'ref', '#']
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


def _find_price_col(table: list[list], num_cols: int) -> Optional[int]:
    """Find the column index where >40% of data rows look like prices."""
    for col_idx in range(num_cols):
        values = [row[col_idx] for row in table[1:] if row and col_idx < len(row)]
        if not values:
            continue
        prices_found = sum(1 for v in values if extract_price(str(v)) is not None)
        if prices_found > len(values) * 0.4:
            return col_idx
    return None


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
            if len(name) >= 2:
                products.append(ParsedProduct(name=name, price=price))
    return products


def deduplicate(products: list[ParsedProduct]) -> list[ParsedProduct]:
    seen = set()
    result = []
    for p in products:
        key = (p.name.lower()[:40], round(p.price, 1))
        if key not in seen:
            seen.add(key)
            result.append(p)
    return result


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


def parse_catalog_excel(file_bytes: bytes) -> list[ParsedProduct]:
    """Parse a supplier catalog from an Excel file (.xlsx)."""
    import openpyxl
    wb = openpyxl.load_workbook(io.BytesIO(file_bytes), data_only=True)
    all_products: list[ParsedProduct] = []

    for sheet in wb.worksheets:
        # Convert sheet to list of lists (same format as pdf tables)
        rows = []
        for row in sheet.iter_rows(values_only=True):
            rows.append([str(cell).strip() if cell is not None else '' for cell in row])

        # Skip empty or very small sheets
        non_empty = [r for r in rows if any(c for c in r)]
        if len(non_empty) < 2:
            continue

        # Find header row: first row with text cells that match known headers
        header_idx = 0
        for i, row in enumerate(non_empty[:10]):
            row_text = ' '.join(c.lower() for c in row if c)
            if any(kw in row_text for kw in NAME_HEADERS + PRICE_HEADERS):
                header_idx = i
                break

        table = non_empty[header_idx:]
        parsed = parse_table(table)
        if parsed:
            all_products.extend(parsed)
        elif len(table) >= 2:
            # fallback: try all rows as free text
            for row in table[1:]:
                line = ' '.join(c for c in row if c)
                price = extract_price(line)
                if price and 0.5 <= price <= 9999:
                    name = re.sub(r'[\d,]+\.?\d*', '', line).strip(' .-|,₪')
                    if len(name) >= 2:
                        all_products.append(ParsedProduct(name=name, price=price))

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
