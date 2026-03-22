import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse

from database import engine, Base
import models

from api import suppliers, catalogs, products, orders, analytics, templates, backup, auth
from api.auth import verify_token, get_app_password

Base.metadata.create_all(bind=engine)

app = FastAPI(title="מערכת הזמנות ספקים - ZIGO", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Auth Middleware ───────────────────────────────────────────────────────────
SKIP_AUTH_PATHS = {"/api/auth/login", "/api/auth/check", "/api/health"}

@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    if not get_app_password():
        return await call_next(request)  # auth disabled globally

    path = request.url.path
    # allow non-API paths (static files, SPA)
    if not path.startswith("/api/"):
        return await call_next(request)
    # allow public API paths
    if path in SKIP_AUTH_PATHS:
        return await call_next(request)

    token = request.headers.get("Authorization", "").replace("Bearer ", "").strip()
    if not verify_token(token):
        return JSONResponse({"detail": "Unauthorized"}, status_code=401)

    return await call_next(request)


# ─── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api")
app.include_router(suppliers.router, prefix="/api")
app.include_router(catalogs.router, prefix="/api")
app.include_router(products.router, prefix="/api")
app.include_router(orders.router, prefix="/api")
app.include_router(analytics.router, prefix="/api")
app.include_router(templates.router, prefix="/api")
app.include_router(backup.router, prefix="/api")


@app.get("/api/health")
def health():
    return {"status": "ok", "message": "ZIGO Supplier Orders API"}


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
