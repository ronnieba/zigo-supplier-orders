# מערכת הזמנות ספקים שבועיות

## הרצה מהירה
```
לחץ פעמיים על start.bat
```
או ידנית:

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

פתח http://localhost:5173

---

## שימוש ראשוני
1. **ספקים** → הוסף ספק חדש
2. **ספקים** → העלה קטלוג PDF
3. **קטלוג** → צפה במוצרים שחולצו
4. **הזמנה חדשה** → בחר מוצרים + כמויות
5. **היסטוריה** → צפה בהזמנות קודמות
6. **אנליטיקות** → מעקב שינויי מחיר

## מבנה
```
SupplierOrders/
├── backend/
│   ├── main.py          # FastAPI app
│   ├── models.py        # SQLAlchemy models
│   ├── database.py      # SQLite connection
│   ├── api/             # Routes
│   │   ├── suppliers.py
│   │   ├── catalogs.py
│   │   ├── products.py
│   │   ├── orders.py
│   │   └── analytics.py
│   ├── services/
│   │   ├── pdf_parser.py   # PDF → products
│   │   └── suggestions.py  # order suggestions
│   └── uploads/            # PDF files
└── frontend/
    └── src/
        ├── pages/       # Dashboard, Catalog, Orders...
        └── api.ts       # API client
```
