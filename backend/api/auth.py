"""
Authentication module — supports three modes:
  open      : no APP_PASSWORD set, no users in DB → anyone can access
  legacy    : APP_PASSWORD set, no users in DB     → single shared password
  multi     : users exist in DB                    → per-user username/password
"""
import os
import time
import json
import hmac
import hashlib
import base64
import secrets

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User

router = APIRouter(prefix="/auth", tags=["auth"])

_SECRET = os.environ.get("SECRET_KEY", "zigo-cafe-secret-key-2026")


# ─── Password helpers ──────────────────────────────────────────────────────────

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    h = hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000)
    return f"{salt}:{h.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt, h = stored.split(":", 1)
        return h == hashlib.pbkdf2_hmac("sha256", password.encode(), salt.encode(), 100_000).hex()
    except Exception:
        return False


# ─── Token helpers ─────────────────────────────────────────────────────────────

def make_token(payload: dict, ttl_days: int = 30) -> str:
    payload = {**payload, "exp": int(time.time()) + ttl_days * 86_400}
    b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    sig = hmac.new(_SECRET.encode(), b64.encode(), hashlib.sha256).hexdigest()
    return f"{b64}.{sig}"


def decode_token(token: str) -> dict | None:
    try:
        b64, sig = token.rsplit(".", 1)
        expected = hmac.new(_SECRET.encode(), b64.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected):
            return None
        payload = json.loads(base64.urlsafe_b64decode(b64 + "==").decode())
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


# ─── Mode detection ────────────────────────────────────────────────────────────

def get_auth_mode(db: Session) -> str:
    user_count = db.query(User).count()
    if user_count > 0:
        return "multi"
    if os.environ.get("APP_PASSWORD"):
        return "legacy"
    return "open"


def _legacy_token() -> str:
    pwd = os.environ.get("APP_PASSWORD", "")
    raw = hashlib.sha256(f"legacy:{pwd}:{_SECRET}".encode()).hexdigest()
    return make_token({"mode": "legacy", "role": "admin", "uid": "legacy"})


def verify_token(token: str, db: Session) -> dict | None:
    """Returns decoded payload if valid, else None."""
    mode = get_auth_mode(db)

    if mode == "open":
        return {"uid": "open", "role": "admin"}

    payload = decode_token(token)
    if not payload:
        return None

    if mode == "legacy":
        # Legacy mode accepts any valid-signature token with mode=legacy
        if payload.get("mode") == "legacy":
            return payload
        # Also accept multi-user tokens if somehow users were created
        return payload

    if mode == "multi":
        uid = payload.get("uid")
        if not uid or uid == "legacy":
            return None
        user = db.query(User).filter(User.id == uid, User.active == True).first()
        if not user:
            return None
        return {**payload, "role": user.role, "full_name": user.full_name, "username": user.username}

    return None


# ─── Request models ────────────────────────────────────────────────────────────

class LoginIn(BaseModel):
    username: str = ""
    password: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/status")
def auth_status(db: Session = Depends(get_db)):
    """Tells the frontend which auth mode is active."""
    mode = get_auth_mode(db)
    return {"mode": mode}


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    mode = get_auth_mode(db)

    if mode == "open":
        return {"ok": True, "token": make_token({"uid": "open", "role": "admin"}),
                "user": {"id": "open", "username": "admin", "full_name": "אורח", "role": "admin"}}

    if mode == "legacy":
        pwd = os.environ.get("APP_PASSWORD", "")
        if body.password != pwd:
            return {"ok": False, "token": None, "user": None}
        token = make_token({"uid": "legacy", "role": "admin", "mode": "legacy"})
        return {"ok": True, "token": token,
                "user": {"id": "legacy", "username": "admin", "full_name": "מנהל", "role": "admin"}}

    # multi mode
    user = db.query(User).filter(
        User.username == body.username.strip(),
        User.active == True
    ).first()
    if not user or not verify_password(body.password, user.password_hash):
        return {"ok": False, "token": None, "user": None}

    token = make_token({"uid": user.id, "role": user.role})
    return {
        "ok": True,
        "token": token,
        "user": {"id": user.id, "username": user.username, "full_name": user.full_name, "role": user.role},
    }


@router.get("/me")
def me(token: str = "", db: Session = Depends(get_db)):
    payload = verify_token(token, db)
    if not payload:
        raise HTTPException(401, "Invalid token")
    return payload
