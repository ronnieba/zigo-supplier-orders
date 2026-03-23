# 🍵 ZIGO Cafe — מערכת הזמנות ספקים

מערכת ווב מלאה לניהול הזמנות מספקים עבור בית קפה. בנויה עם FastAPI בצד שרת ו-React/TypeScript בצד לקוח, עם שמירה ב-Supabase PostgreSQL.

---

## ✨ תכונות המערכת

### 📦 ניהול הזמנות
- יצירת הזמנות חדשות לפי ספק, עם בחירה מהקטלוג
- **התראות סטייה** — אזהרה אוטומטית כשכמות מוזמנת סוטה >50% מהממוצע ההיסטורי
- **תבניות הזמנה** — שמירה וטעינה של הזמנות חוזרות (למשל "הזמנה שבועית רגילה")
- היסטוריית הזמנות עם סינון לפי ספק ותאריך

### 🔍 חיפוש מתקדם
- **חיפוש בכל הספקים במקביל** — חיפוש מוצר אחד וראיית תוצאות מכל הספקים יחד
- **התאמה מטושטשת (Fuzzy)** — מוצא מוצרים גם עם הבדלים קלים בכתיב (למשל "חלב" / "חלבr")
- **סינון "הוזמנו לאחרונה"** — מציג רק מוצרים שהוזמנו בעבר (ממוצע כמות > 0)

### 📲 ייצוא ושיתוף
- **שליחה ב-WhatsApp** — לחץ כפתור וההזמנה נשלחת לספק ישירות דרך WhatsApp Web
- **עריכת מספר לפני שליחה** — חלון עריכה עם פורמט אוטומטי למספרים ישראליים (05X → 9725X)
- **הדפסה / ייצוא PDF** — תצוגת הדפסה נקייה ללא ניווט ותפריטים
- **הסתרת מחירים בייצוא** — אפשרות להדפיס/לשלוח הזמנה ללא עמודות מחיר

### 📊 אנליטיקות ולוח בקרה
- לוח בקרה עם סיכום הוצאות שבועי וחודשי לכל ספק
- **תקציב שבועי** — הגדרת תקציב לכל ספק עם פס התקדמות (ירוק → כתום → אדום)
- **באנר תזכורת היום** — מוצג בלוח הבקרה אם יש ספקים שהיום הוא יום הזמנה שלהם
- **באנר תזכורת מחר** — מוצג גם עבור ספקים שמחר הוא יום ההזמנה שלהם
- גרפים של הוצאות לאורך זמן
- **לוח שנה** — תצוגה חודשית של ימי הזמנות עם סיכום שבועי

### 🛒 סל קניות
- **סל קניות גלובלי** — הוסף מוצרים לסל מכל ספק בזמן גלישה בקטלוג
- **הפרדה לפי ספק** — הסל מסודר אוטומטית לפי ספק עם סיכום לכל ספק
- יצירת הזמנה ישירות מהסל בלחיצה אחת

### 🏪 ניהול ספקים
- **שדות קשר מפורטים** — טלפון, WhatsApp, דוא"ל, כתובת, הערות — כל אחד בשדה נפרד
- **ימי תזכורת** — הגדר יומי הזמנה קבועים לכל ספק (א׳–ש׳)
- תצוגת כרטיסיות עם פרטים מורחבים בלחיצה

### 📦 ניהול מלאי
- **מסך מלאי** — עקוב אחר כמות נוכחית ורמת מינימום לכל מוצר
- **התראת מלאי נמוך** — שורות אדומות וספירת מוצרים תחת מינימום
- **סינון "מלאי נמוך בלבד"** — ראה בבת אחת מה צריך להזמין
- עדכון מלאי מהיר ישירות מהטבלה

### 🛒 קטלוג וספקים
- ניהול קטלוג מוצרים לכל ספק עם מחירים עדכניים
- **נורמליזציה של יחידות מידה** — קג/קילוגרם/kg → ק״ג, יח׳/יחידה → יח׳ וכד׳
- **השוואת מחירים** — חיפוש מוצר ובדיקת המחיר אצל כל הספקים (הזול ביותר מודגש בירוק)
- היסטוריית מחירים לכל מוצר

### 📱 PWA — אפליקציה להתקנה
- ניתן להתקין כאפליקציה על מסך הבית בנייד ובדסקטופ
- Service Worker לטעינה מהירה
- קיצורי דרך ישירים להזמנה חדשה ולהיסטוריה

### 🌙 ערכת צבעים
- תמיכה מלאה במצב כהה (Dark Mode) ומצב בהיר (Light Mode)
- עיצוב עקבי בכל הדפים

### ❓ מרכז עזרה מובנה
- דף עזרה מלא בתוך המערכת (כפתור "עזרה" בניווט)
- הסבר על כל פיצ'ר בעברית עם שאלות ותשובות בהרחבה
- טיפים מהירים וסעיפים לכל דף במערכת

### 📋 סקירה כללית של כל הספקים
- לחץ "כל הספקים" בלוח הבקרה לראות את הוצאות השבוע של כל הספקים יחד
- סה"כ כולל שבועי ומצב תקציב לכל ספק

### 🔍 חיפוש מוצר בהיסטוריה
- סנן הזמנות לפי שם מוצר — ראה מתי ובאיזה מחיר הוזמן

### 📊 ייצוא לExcel
- הורד את כל ההזמנות (עם פילטר אופציונלי) כקובץ `.xlsx` מסודר

### 💾 גיבוי ושחזור
- ייצוא מלא של כל הנתונים לקובץ JSON
- ייבוא בטוח — מוסיף רשומות חדשות בלבד, ללא מחיקת קיימות

### 👥 ניהול משתמשים
- הוספה, עריכה ומחיקה של משתמשים דרך ממשק מסודר
- שני תפקידים: **מנהל** (גישה מלאה) ו**צפייה בלבד** (קריאה ללא עריכה)
- אפס סיסמה, השבת / הפעל משתמש
- הגנה: לא ניתן למחוק/לשנות את המנהל האחרון

### 🔐 שלושה מצבי אבטחה
| מצב | תיאור |
|-----|-------|
| **פתוח** | ללא APP_PASSWORD וללא משתמשים — גישה חופשית |
| **סיסמה אחידה** | הגדר `APP_PASSWORD` ב-Render — כניסה עם סיסמה משותפת |
| **ניהול משתמשים** | צור משתמשים דרך הממשק — כל אחד עם כניסה ותפקיד משלו |

---

## 🗂️ מבנה הפרויקט

```
BookmarkDashboard/
├── backend/
│   ├── main.py              # FastAPI app + CORS + static files + migrations
│   ├── models.py            # SQLAlchemy models (DB schema)
│   ├── database.py          # חיבור DB (SQLite / PostgreSQL)
│   ├── requirements.txt
│   └── api/
│       ├── suppliers.py     # ספקים + תקציב שבועי + ימי תזכורת
│       ├── catalogs.py      # קטלוג מוצרים
│       ├── products.py      # מוצרים + השוואת מחירים + fuzzy + נורמליזציה
│       ├── orders.py        # הזמנות
│       ├── templates.py     # תבניות הזמנה
│       ├── backup.py        # ייצוא/ייבוא JSON
│       ├── auth.py          # אימות + JWT tokens
│       ├── users.py         # ניהול משתמשים (CRUD)
│       ├── analytics.py     # לוח בקרה + אנליטיקות
│       └── inventory.py     # ניהול מלאי + התראות מלאי נמוך
├── frontend/
│   ├── index.html           # PWA meta tags
│   ├── public/
│   │   ├── manifest.json    # PWA manifest
│   │   └── sw.js            # Service Worker
│   └── src/
│       ├── App.tsx          # Router + Navigation
│       ├── api.ts           # כל קריאות ה-API
│       ├── index.css        # CSS variables + print styles
│       └── pages/
│           ├── Dashboard.tsx      # לוח בקרה + תקציב + באנרי תזכורת
│           ├── NewOrder.tsx       # הזמנה חדשה + תבניות + חיפוש גלובלי
│           ├── OrderHistory.tsx   # היסטוריה + WhatsApp + הסתרת מחירים
│           ├── OrderPrint.tsx     # דף הדפסה (תומך הסתרת מחירים)
│           ├── Catalog.tsx        # קטלוג + השוואת מחירים
│           ├── Analytics.tsx      # גרפים ואנליטיקות
│           ├── CalendarPage.tsx   # לוח שנה
│           ├── CartPage.tsx       # סל קניות מפוצל לפי ספק
│           ├── InventoryPage.tsx  # ניהול מלאי + התראות
│           ├── HelpPage.tsx       # מרכז עזרה מקיף
│           ├── BackupPage.tsx     # גיבוי ושחזור
│           ├── LoginPage.tsx      # כניסה (תומך 3 מצבים)
│           ├── UsersPage.tsx      # ניהול משתמשים
│           └── Suppliers.tsx      # ניהול ספקים עם שדות קשר מלאים
├── render.yaml              # הגדרות פריסה ב-Render
├── runtime.txt              # גרסת Python
└── start.bat                # הפעלה מקומית (Windows)
```

---

## 🛠️ טכנולוגיות

| שכבה | טכנולוגיה |
|------|-----------|
| Backend | Python 3.11 + FastAPI + SQLAlchemy |
| Frontend | React 18 + TypeScript + Vite |
| עיצוב | Tailwind CSS + CSS Custom Properties |
| מסד נתונים | PostgreSQL (Supabase) / SQLite (פיתוח מקומי) |
| פריסה | Render.com (Web Service) |
| PWA | Web App Manifest + Service Worker |

---

## 🚀 פריסה ב-Render.com

### דרישות מוקדמות
1. חשבון ב-[Render.com](https://render.com)
2. מסד נתונים PostgreSQL ב-[Supabase](https://supabase.com) (או כל PostgreSQL אחר)

### שלבי הפריסה

**1. Fork את הריפו ל-GitHub שלך**

**2. ב-Render — צור Web Service חדש:**
- Connect to your GitHub repo
- Build Command: `cd frontend && npm install && npm run build && cd .. && pip install -r backend/requirements.txt`
- Start Command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
- Runtime: **Python 3**

**3. הגדר Environment Variable:**
```
DATABASE_URL = postgresql://USER:PASSWORD@HOST:PORT/DATABASE
```

> ⚠️ **חשוב:** אם הסיסמה מכילה תווים מיוחדים כמו `@` או `!`, יש לבצע URL encoding:
> - `@` → `%40`
> - `!` → `%21`
>
> דוגמה: `Zigo@Pass!` → `Zigo%40Pass%21`

**4. לחץ "Save, rebuild and deploy"** — Render יבנה ויפרוס אוטומטית.

### פריסה אוטומטית
כל `git push` ל-`master` יפעיל פריסה אוטומטית חדשה ב-Render.

---

## ☁️ פיתוח בענן — GitHub Codespaces

ניתן לפתח ולהריץ את הפרויקט **ישירות בדפדפן** ללא התקנות מקומיות, באמצעות GitHub Codespaces.

### הפעלה

1. גש לריפו ב-GitHub
2. לחץ **Code → Codespaces → Create codespace on master**
3. ממשק VS Code יפתח בדפדפן תוך כדקה

### הגדרת הסביבה ב-Codespace

**Backend:**
```bash
# צור קובץ env עם חיבור ל-Supabase
echo 'DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE' > backend/.env

# התקן תלויות
pip install -r backend/requirements.txt

# הפעל שרת
cd backend && uvicorn main:app --reload --port 8000
```

**Frontend (בטרמינל חדש):**
```bash
cd frontend
npm install
npm run dev
```

GitHub Codespaces יפנה את הפורטים אוטומטית (8000, 5173) ויציג כפתור "Open in Browser".

### יתרונות
- ✅ אפס התקנות על המחשב המקומי
- ✅ סביבה זהה לכולם (Python 3.11, Node.js 20)
- ✅ גישה מכל מחשב / טאבלט
- ✅ `git push` ישירות מהטרמינל בתוך Codespace

---

## 💻 הרצה מקומית

### דרישות
- Python 3.11+
- Node.js 18+

### התקנה והפעלה

```bash
# Clone
git clone https://github.com/YOUR_USERNAME/zigo-supplier-orders.git
cd zigo-supplier-orders

# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (בטרמינל נפרד)
cd frontend
npm install
npm run dev
```

האפליקציה תהיה זמינה על `http://localhost:5173`

> בסביבה מקומית, אם לא מוגדר `DATABASE_URL`, המערכת תשתמש ב-SQLite אוטומטית.

### Windows — הפעלה מהירה
```bat
start.bat
```

---

## 📡 API — נקודות קצה עיקריות

### ספקים
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/suppliers/` | רשימת כל הספקים |
| `POST` | `/api/suppliers/` | הוסף ספק חדש |
| `PUT` | `/api/suppliers/{id}` | עדכן פרטי ספק |
| `DELETE` | `/api/suppliers/{id}` | מחק ספק |
| `GET` | `/api/suppliers/{id}/budget` | קבל תקציב שבועי |
| `PUT` | `/api/suppliers/{id}/budget` | עדכן תקציב שבועי |
| `PUT` | `/api/suppliers/{id}/reminder-days` | הגדר ימי תזכורת |

### קטלוג ומוצרים
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/catalogs/?supplier_id=` | קטלוג לפי ספק |
| `POST` | `/api/catalogs/upload?supplier_id=` | העלה קטלוג (Excel/PDF) |
| `DELETE` | `/api/catalogs/{id}` | מחק קטלוג |
| `GET` | `/api/products/` | רשימת מוצרים (עם פילטרים) |
| `GET` | `/api/products/compare?name=` | השוואת מחיר בין ספקים (fuzzy) |
| `GET` | `/api/products/{id}/price-history` | היסטוריית מחירים |

### הזמנות
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/orders/` | כל ההזמנות |
| `POST` | `/api/orders/` | צור הזמנה חדשה |
| `GET` | `/api/orders/{id}` | הזמנה בודדת |
| `PATCH` | `/api/orders/{id}/confirm` | אשר הזמנה |
| `DELETE` | `/api/orders/{id}` | מחק הזמנה |
| `GET` | `/api/orders/export` | ייצוא לExcel |
| `GET` | `/api/orders/suggestions/{supplier_id}` | הצעות כמות מבוססות היסטוריה |

### מלאי
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/inventory/` | רשימת מלאי (פילטר: supplier_id, low_stock_only) |
| `PUT` | `/api/inventory/{product_id}` | עדכן / צור רשומת מלאי |
| `DELETE` | `/api/inventory/{product_id}` | הסר מעקב מלאי |

### תבניות
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/templates/?supplier_id=` | תבניות לפי ספק |
| `POST` | `/api/templates/` | שמור תבנית חדשה |
| `GET` | `/api/templates/{id}` | תבנית בודדת (עם מחירים עדכניים) |
| `DELETE` | `/api/templates/{id}` | מחק תבנית |

### אנליטיקות
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/analytics/dashboard/{supplier_id}` | נתוני לוח בקרה + תקציב |
| `GET` | `/api/analytics/summary` | סיכום כל הספקים |
| `GET` | `/api/analytics/price-changes/{supplier_id}` | שינויי מחיר אחרונים |
| `GET` | `/api/analytics/top-products/{supplier_id}` | מוצרים מובילים |

---

## 🗄️ מבנה מסד הנתונים

```
users              — משתמשי המערכת (username, role, password_hash)
suppliers          — ספקים (שם, טלפון, WhatsApp, דוא"ל, כתובת, הערות, ימי תזכורת)
  └── products     — מוצרים בקטלוג (שם, קטגוריה, יחידה, קוד)
        └── product_prices  — היסטוריית מחירים
        └── inventory       — מלאי (כמות נוכחית, מינימום)
  └── catalogs     — קטלוגים שהועלו (Excel/PDF)
  └── orders       — הזמנות (שבוע, סטטוס, הערות)
        └── order_items     — פריטי הזמנה (כמות, מחיר)
  └── supplier_budgets     — תקציב שבועי לספק
  └── order_templates      — תבניות הזמנה
        └── order_template_items — פריטי תבנית
```

---

## 📱 התקנה כ-PWA (אפליקציה)

### נייד (Android / iPhone)
1. פתח את האתר בדפדפן
2. Android: לחץ "הוסף למסך הבית" בתפריט ⋮
3. iPhone: לחץ שתף ← "הוסף למסך הבית"

### דסקטופ (Chrome)
1. לחץ על אייקון ההתקנה בשורת הכתובת
2. לחץ "התקן"

---

## 🔧 הגדרות סביבה

| משתנה | תיאור | ברירת מחדל |
|-------|-------|-----------|
| `DATABASE_URL` | PostgreSQL connection string | SQLite מקומי |
| `PORT` | פורט השרת | `8000` |
| `APP_PASSWORD` | סיסמה אחידה לכניסה (מצב legacy) | ללא אימות |
| `SECRET_KEY` | מפתח חתימת טוקנים | ערך ברירת מחדל מובנה |

---

## 📝 רישיון

פרויקט פנימי — ZIGO Cafe © 2026
