import os
import hashlib
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["auth"])

SECRET_SALT = "zigo-cafe-2026"


def _hash(password: str) -> str:
    return hashlib.sha256(f"{SECRET_SALT}:{password}".encode()).hexdigest()


def get_app_password() -> str | None:
    return os.environ.get("APP_PASSWORD") or None


def verify_token(token: str) -> bool:
    pwd = get_app_password()
    if not pwd:
        return True   # auth disabled
    return token == _hash(pwd)


class LoginIn(BaseModel):
    password: str


@router.post("/login")
def login(body: LoginIn):
    pwd = get_app_password()
    if not pwd:
        return {"ok": True, "token": "no-auth", "auth_required": False}
    if body.password == pwd:
        return {"ok": True, "token": _hash(pwd), "auth_required": True}
    return {"ok": False, "token": None, "auth_required": True}


@router.get("/check")
def check():
    """Returns whether auth is required."""
    return {"auth_required": get_app_password() is not None}
