from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from sqlalchemy.orm import Session

from database import get_db
from models import User
from api.auth import hash_password, verify_password, new_uuid

router = APIRouter(prefix="/users", tags=["users"])


def _serialize(u: User) -> dict:
    return {
        "id": u.id,
        "username": u.username,
        "full_name": u.full_name,
        "role": u.role,
        "active": u.active,
        "created_at": u.created_at.isoformat() if u.created_at else None,
    }


def _require_admin(request: Request):
    user = getattr(request.state, "user", None)
    if not user or user.get("role") != "admin":
        raise HTTPException(403, "נדרשות הרשאות מנהל")


# ─── List ──────────────────────────────────────────────────────────────────────

@router.get("/")
def list_users(request: Request, db: Session = Depends(get_db)):
    _require_admin(request)
    return [_serialize(u) for u in db.query(User).order_by(User.created_at).all()]


# ─── Create ────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    full_name: str
    role: str = "viewer"   # admin | viewer
    password: str


@router.post("/")
def create_user(body: UserCreate, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)

    username = body.username.strip().lower()
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(400, "שם משתמש כבר קיים")
    if body.role not in ("admin", "viewer"):
        raise HTTPException(400, "תפקיד לא חוקי")
    if len(body.password) < 4:
        raise HTTPException(400, "סיסמה חייבת להיות לפחות 4 תווים")

    user = User(
        username=username,
        full_name=body.full_name.strip(),
        role=body.role,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize(user)


# ─── Setup (first admin — no auth required) ────────────────────────────────────

@router.post("/setup")
def setup_first_admin(body: UserCreate, db: Session = Depends(get_db)):
    """Creates the first admin. Only works when no users exist."""
    if db.query(User).count() > 0:
        raise HTTPException(400, "כבר קיימים משתמשים")
    user = User(
        username=body.username.strip().lower(),
        full_name=body.full_name.strip(),
        role="admin",
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _serialize(user)


# ─── Update ────────────────────────────────────────────────────────────────────

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    role: Optional[str] = None
    active: Optional[bool] = None


@router.put("/{user_id}")
def update_user(user_id: str, body: UserUpdate, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "משתמש לא נמצא")

    # Can't demote yourself if you're the last admin
    me = getattr(request.state, "user", {})
    if me.get("uid") == user_id and body.role == "viewer":
        admin_count = db.query(User).filter(User.role == "admin", User.active == True).count()
        if admin_count <= 1:
            raise HTTPException(400, "לא ניתן להסיר הרשאות מהמנהל האחרון")

    if body.full_name is not None:
        user.full_name = body.full_name.strip()
    if body.role is not None:
        if body.role not in ("admin", "viewer"):
            raise HTTPException(400, "תפקיד לא חוקי")
        user.role = body.role
    if body.active is not None:
        if me.get("uid") == user_id and not body.active:
            raise HTTPException(400, "לא ניתן לנטרל את עצמך")
        user.active = body.active

    db.commit()
    return _serialize(user)


# ─── Reset password ────────────────────────────────────────────────────────────

class ResetPassword(BaseModel):
    new_password: str
    current_password: Optional[str] = None   # required when changing own password


@router.post("/{user_id}/reset-password")
def reset_password(user_id: str, body: ResetPassword, request: Request, db: Session = Depends(get_db)):
    me = getattr(request.state, "user", {})
    is_admin = me.get("role") == "admin"
    is_self = me.get("uid") == user_id

    if not is_admin and not is_self:
        raise HTTPException(403, "אין הרשאה לשנות סיסמה זו")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "משתמש לא נמצא")

    # When changing own password, must provide current password (unless admin)
    if is_self and not is_admin:
        if not body.current_password or not verify_password(body.current_password, user.password_hash):
            raise HTTPException(400, "הסיסמה הנוכחית שגויה")

    if len(body.new_password) < 4:
        raise HTTPException(400, "סיסמה חייבת להיות לפחות 4 תווים")

    user.password_hash = hash_password(body.new_password)
    db.commit()
    return {"ok": True}


# ─── Delete ────────────────────────────────────────────────────────────────────

@router.delete("/{user_id}")
def delete_user(user_id: str, request: Request, db: Session = Depends(get_db)):
    _require_admin(request)

    me = getattr(request.state, "user", {})
    if me.get("uid") == user_id:
        raise HTTPException(400, "לא ניתן למחוק את עצמך")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(404, "משתמש לא נמצא")

    # Don't allow deleting last admin
    if user.role == "admin":
        admin_count = db.query(User).filter(User.role == "admin", User.active == True).count()
        if admin_count <= 1:
            raise HTTPException(400, "לא ניתן למחוק את המנהל האחרון")

    db.delete(user)
    db.commit()
    return {"ok": True}
