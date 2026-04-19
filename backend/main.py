import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from database import engine, Base
import models

from api import suppliers, catalogs, products, orders, analytics, templates, backup, auth, users, inventory
from api.auth import verify_token, get_auth_mode

Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Add new columns to existing tables (safe, idempotent)."""
    from sqlalchemy import text, inspect
    insp = inspect(engine)
    with engine.connect() as conn:
        # suppliers.reminder_days — added in v2.1
        cols = [c["name"] for c in insp.get_columns("suppliers")]
        if "reminder_days" not in cols:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN reminder_days TEXT"))
            conn.commit()
        if "whatsapp" not in cols:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN whatsapp TEXT"))
            conn.commit()
        if "email" not in cols:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN email TEXT"))
            conn.commit()
        if "address" not in cols:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN address TEXT"))
            conn.commit()
        if "notes" not in cols:
            conn.execute(text("ALTER TABLE suppliers ADD COLUMN notes TEXT"))
            conn.commit()

        # catalogs.archived — added in v2.2
        cat_cols = [c["name"] for c in insp.get_columns("catalogs")]
        if "archived" not in cat_cols:
            conn.execute(text("ALTER TABLE catalogs ADD COLUMN archived BOOLEAN DEFAULT FALSE"))
            conn.commit()


_run_migrations()

app = FastAPI(title="מערכת הזמנות ספקים - ZIGO", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth + Role Middleware ────────────────────────────────────────────────────

OPEN_PATHS = {
    "/api/auth/login",
    "/api/auth/status",
    "/api/health",
    "/api/users/setup",   # first-run setup requires no auth
}

VIEWER_BLOCKED_METHODS = {"POST", "PUT", "PATCH", "DELETE"}
# Viewers can still read everything; only write ops are blocked


def _get_db_quick():
    """Get a DB session outside of DI for use in middleware."""
    from database import SessionLocal
    return SessionLocal()


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    path = request.url.path

    # Non-API paths → pass through (static files, SPA)
    if not path.startswith("/api/"):
        return await call_next(request)

    # Always-open paths
    if path in OPEN_PATHS:
        return await call_next(request)

    db = _get_db_quick()
    try:
        mode = get_auth_mode(db)

        if mode == "open":
            request.state.user = {"uid": "open", "role": "admin"}
            return await call_next(request)

        token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
        user_payload = verify_token(token, db)

        if not user_payload:
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)

        request.state.user = user_payload

        # Viewer role: block write operations
        if user_payload.get("role") == "viewer" and request.method in VIEWER_BLOCKED_METHODS:
            return JSONResponse({"detail": "הרשאות צפייה בלבד — פעולה זו דורשת מנהל"}, status_code=403)

        return await call_next(request)
    finally:
        db.close()


# ─── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(catalogs.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(backup.router, prefix="/api")
app.include_router(inventory.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "ZIGO Supplier Orders API v2"}


# ─── Serve React SPA ───────────────────────────────────────────────────────────
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "frontend", "dist")

if os.path.exists(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        file_path = os.path.join(FRONTEND_DIST, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {"status": "ok", "message": "ZIGO API - Frontend not built yet"}
