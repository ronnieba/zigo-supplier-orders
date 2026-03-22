# 🍵 ZIGO Cafe — מערכת הזמנות ספקים

מערכת ווב מלאה לניהול הזמנות מספקים עבור בית קפה. בנויה עם FastAPI בצד שרת ו-React/TypeScript בצד לקוח, עם שמירה ב-Supabase PostgreSQL.

---

## ✨ תכונות המערכת

### 📦 ניהול הזמנות
- יצירת הזמנות חדשות לפי ספק, עם בחירה מהקטלוג
- **התראות סטייה** — אזהרה אוטומטית כשכמות מוזמנת סוטה >50% מהממוצע ההיסטורי
- **תבניות הזמנה** — שמירה וטעינה של הזמנות חוזרות (למשל "הזמנה שבועית רגילה")
- היסטוריית הזמנות עם סינון לפי ספק ותאריך

### 📲 ייצוא ושיתוף
- **שליחה ב-WhatsApp** — לחץ כפתור וההזמנה נשלחת לספק ישירות דרך WhatsApp Web
- **הדפסה / ייצוא PDF** — תצוגת הדפסה נקייה ללא ניווט ותפריטים

### 📊 אנליטיקות ולוח בקרה
- לוח בקרה עם סיכום הוצאות שבועי וחודשי לכל ספק
- **תקציב שבועי** — הגדרת תקציב לכל ספק עם פס התקדמות (ירוק → כתום → אדום)
- גרפים של הוצאות לאורך זמן
- **לוח שנה** — תצוגה חודשית של ימי הזמנות עם סיכום שבועי

### 🛒 קטלוג וספקים
- ניהול קטלוג מוצרים לכל ספק עם מחירים עדכניים
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

---

## 🗂️ מבנה הפרויקט

```
BookmarkDashboard/
├── backend/
│   ├── main.py              # FastAPI app + CORS + static files
│   ├── models.py            # SQLAlchemy models (DB schema)
│   ├── database.py          # חיבור DB (SQLite / PostgreSQL)
│   ├── requirements.txt
│   └── api/
│       ├── suppliers.py     # ספקים + תקציב שבועי
│       ├── catalogs.py      # קטלוג מוצרים
│       ├── products.py      # מוצרים + השוואת מחירים
│       ├── orders.py        # הזמנות
│       ├── templates.py     # תבניות הזמנה
│       └── analytics.py     # לוח בקרה + אנליטיקות
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
│           ├── Dashboard.tsx      # לוח בקרה + תקציב
│           ├── NewOrder.tsx       # הזמנה חדשה + תבניות + סטייה
│           ├── OrderHistory.tsx   # היסטוריה + WhatsApp + הדפסה
│           ├── OrderPrint.tsx     # דף הדפסה ייעודי
│           ├── Catalog.tsx        # קטלוג + השוואת מחירים
│           ├── Analytics.tsx      # גרפים ואנליטיקות
│           ├── CalendarPage.tsx   # לוח שנה
│           ├── HelpPage.tsx       # מרכז עזרה
│           └── Suppliers.tsx      # ניהול ספקים
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
| `GET` | `/api/suppliers/{id}/budget` | קבל תקציב שבועי |
| `PUT` | `/api/suppliers/{id}/budget` | עדכן תקציב שבועי |

### קטלוג ומוצרים
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/catalogs/?supplier_id=` | קטלוג לפי ספק |
| `POST` | `/api/catalogs/` | הוסף מוצר לקטלוג |
| `GET` | `/api/products/compare?name=` | השווה מחיר בין ספקים |

### הזמנות
| Method | Endpoint | תיאור |
|--------|----------|-------|
| `GET` | `/api/orders/` | כל ההזמנות |
| `POST` | `/api/orders/` | צור הזמנה חדשה |
| `GET` | `/api/orders/{id}` | הזמנה בודדת |
| `PATCH` | `/api/orders/{id}/status` | עדכן סטטוס |

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
| `GET` | `/api/analytics/dashboard?supplier_id=` | נתוני לוח בקרה + תקציב |
| `GET` | `/api/analytics/orders?supplier_id=` | נתוני הזמנות לגרפים |

---

## 🗄️ מבנה מסד הנתונים

```
suppliers          — ספקים (שם, איש קשר, טלפון)
  └── products     — מוצרים בקטלוג
        └── prices — היסטוריית מחירים
  └── orders       — הזמנות
        └── order_items    — פריטי הזמנה
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

---

## 📝 רישיון

פרויקט פנימי — ZIGO Cafe © 2026
