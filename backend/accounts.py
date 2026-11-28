"""Accounts (owner: Jonathan)

  /auth/*    sign up, sign in, sign out, who am I
  /me/*      the signed-in user's profile, kitchen, password, account
  /admin/*   admin only: list users, reset a password, delete an account

Sharing a saved recipe with family (title, notes, who's bringing what) is in shares.py.

Guests never touch these routes: the frontend keeps a guest's kitchen in
localStorage exactly like before.

Signed-in requests send   Authorization: Bearer <token>
(The "Authorize" button on http://localhost:8000/docs does this for you.)
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, ConfigDict, Field, field_validator
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from db import AuthToken, User, empty_kitchen, get_db, now
from security import hash_password, hash_token, new_token, verify_password

TOKEN_DAYS = 30
USERNAME_RE = re.compile(r"^[a-z0-9_.-]{3,30}$")

router = APIRouter(tags=["accounts"])
bearer = HTTPBearer(auto_error=False)


# --- Shapes -------------------------------------------------------------------
class KitchenItem(BaseModel):
    """Same as a Product from /products, plus anything the frontend adds later."""

    model_config = ConfigDict(extra="allow")
    name: str = Field(min_length=1, max_length=200)
    barcode: str | None = Field(default=None, max_length=64)
    brand: str | None = None
    image: str | None = None
    category: str | None = None


class SavedRecipe(BaseModel):
    model_config = ConfigDict(extra="allow")
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=200)
    thumbnail: str | None = None


class Kitchen(BaseModel):
    inventory: list[KitchenItem] = Field(default_factory=list, max_length=500)
    grocery_list: list[str] = Field(default_factory=list, max_length=500)
    saved_recipes: list[SavedRecipe] = Field(default_factory=list, max_length=500)


def _check_username(value: str) -> str:
    value = value.strip().lower()
    if not USERNAME_RE.match(value):
        raise ValueError("Username must be 3–30 letters, numbers, dots, dashes or underscores")
    return value


def _clean_name(value: str) -> str:
    value = " ".join(value.split())
    if not value:
        raise ValueError("Can't be blank")
    return value


class Credentials(BaseModel):
    username: str
    password: str = Field(min_length=1, max_length=128)

    @field_validator("username")
    @classmethod
    def _lower(cls, v: str) -> str:
        return v.strip().lower()


class SignupRequest(BaseModel):
    username: str
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(max_length=40)
    last_name: str = Field(max_length=40)
    # Optional: the guest's current kitchen, so nothing is lost when they sign up.
    kitchen: Kitchen | None = None

    @field_validator("username")
    @classmethod
    def _valid(cls, v: str) -> str:
        return _check_username(v)

    @field_validator("first_name", "last_name")
    @classmethod
    def _names(cls, v: str) -> str:
        return _clean_name(v)


class ProfileUpdate(BaseModel):
    first_name: str = Field(max_length=40)
    last_name: str = Field(max_length=40)

    @field_validator("first_name", "last_name")
    @classmethod
    def _names(cls, v: str) -> str:
        return _clean_name(v)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class PasswordReset(BaseModel):
    new_password: str = Field(min_length=8, max_length=128)


class PasswordConfirm(BaseModel):
    password: str = Field(min_length=1, max_length=128)


class UserOut(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    role: str
    created_at: datetime


class AuthResponse(BaseModel):
    token: str
    user: UserOut


class AdminUserRow(BaseModel):
    id: int
    username: str
    first_name: str
    last_name: str
    role: str
    created_at: datetime
    pantry_items: int
    saved_recipes: int
    shares: int


# --- Helpers ------------------------------------------------------------------
def _user_out(user: User) -> UserOut:
    return UserOut(
        id=user.id, username=user.username, first_name=user.first_name, last_name=user.last_name,
        role=user.role, created_at=user.created_at,
    )


def kitchen_of(user: User) -> dict:
    return {**empty_kitchen(), **(user.kitchen or {})}


def _issue_token(db: Session, user: User) -> str:
    token = new_token()
    db.add(AuthToken(token_hash=hash_token(token), user_id=user.id, expires_at=now() + timedelta(days=TOKEN_DAYS)))
    return token


def _aware(dt: datetime) -> datetime:
    # SQLite gives back naive datetimes; everything we store is UTC.
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


def create_user(
    db: Session, username: str, password: str, first_name: str, last_name: str,
    role: str = "user", kitchen: dict | None = None,
) -> User:
    user = User(
        username=username,
        first_name=first_name,
        last_name=last_name,
        password_hash=hash_password(password),
        role=role,
        kitchen=kitchen or empty_kitchen(),
    )
    db.add(user)
    db.flush()  # assigns user.id; raises IntegrityError if the username is taken
    return user


def ensure_admin(db: Session) -> None:
    """Create the admin from ADMIN_USERNAME / ADMIN_PASSWORD (backend/.env) if it doesn't exist.

    Runs at startup. Never overwrites an existing account's password.
    """
    username = (os.getenv("ADMIN_USERNAME") or "").strip().lower()
    password = os.getenv("ADMIN_PASSWORD") or ""
    if not username or not password:
        return
    user = db.scalar(select(User).where(User.username == username))
    if user is None:
        create_user(db, username, password, "Admin", "", role="admin")
    elif user.role != "admin":
        user.role = "admin"
    db.commit()


# --- Dependencies: who is calling? ------------------------------------------------
def current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> User:
    if creds is None or creds.scheme.lower() != "bearer":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Sign in to do that")
    row = db.get(AuthToken, hash_token(creds.credentials))
    if row is None or _aware(row.expires_at) < now():
        if row is not None:
            db.delete(row)
            db.commit()
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Your session has expired, please sign in again")
    return row.user


def admin_user(user: User = Depends(current_user)) -> User:
    if user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Admins only")
    return user


# --- /auth ----------------------------------------------------------------------
@router.post("/auth/signup", response_model=AuthResponse, status_code=201)
def signup(body: SignupRequest, db: Session = Depends(get_db)):
    kitchen = body.kitchen.model_dump() if body.kitchen else None
    try:
        user = create_user(db, body.username, body.password, body.first_name, body.last_name, kitchen=kitchen)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "That username is taken")
    token = _issue_token(db, user)
    db.commit()
    return AuthResponse(token=token, user=_user_out(user))


@router.post("/auth/login", response_model=AuthResponse)
def login(body: Credentials, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.username == body.username))
    # Same message either way, so the form doesn't reveal which usernames exist.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong username or password")
    token = _issue_token(db, user)
    db.commit()
    return AuthResponse(token=token, user=_user_out(user))


@router.post("/auth/logout", status_code=204)
def logout(creds: HTTPAuthorizationCredentials | None = Depends(bearer), db: Session = Depends(get_db)):
    if creds is not None:
        db.execute(delete(AuthToken).where(AuthToken.token_hash == hash_token(creds.credentials)))
        db.commit()
    return Response(status_code=204)


@router.get("/auth/me", response_model=UserOut)
def me(user: User = Depends(current_user)):
    return _user_out(user)


# --- /me: the signed-in user's own stuff ---------------------------------------------
@router.patch("/me", response_model=UserOut)
def update_profile(body: ProfileUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    user.first_name = body.first_name
    user.last_name = body.last_name
    db.commit()
    return _user_out(user)


@router.get("/me/kitchen", response_model=Kitchen)
def get_kitchen(user: User = Depends(current_user)):
    return kitchen_of(user)


@router.put("/me/kitchen", response_model=Kitchen)
def save_kitchen(body: Kitchen, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Replace the whole kitchen (pantry, grocery list, saved recipes) in one go."""
    user.kitchen = body.model_dump()
    db.commit()
    return user.kitchen


@router.post("/me/password", status_code=204)
def change_password(body: PasswordChange, creds=Depends(bearer), user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Current password is wrong")
    user.password_hash = hash_password(body.new_password)
    # Sign out every other device, keep this one signed in.
    db.execute(
        delete(AuthToken).where(AuthToken.user_id == user.id, AuthToken.token_hash != hash_token(creds.credentials))
    )
    db.commit()
    return Response(status_code=204)


@router.delete("/me", status_code=204)
def delete_my_account(body: PasswordConfirm, user: User = Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password is wrong")
    db.delete(user)
    db.commit()
    return Response(status_code=204)


# --- /admin ---------------------------------------------------------------------------
def _target(db: Session, user_id: int) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found")
    return user


@router.get("/admin/users", response_model=list[AdminUserRow])
def list_users(_: User = Depends(admin_user), db: Session = Depends(get_db)):
    rows = []
    for u in db.scalars(select(User).order_by(func.lower(User.username))):
        k = kitchen_of(u)
        rows.append(
            AdminUserRow(
                id=u.id, username=u.username, first_name=u.first_name, last_name=u.last_name,
                role=u.role, created_at=u.created_at,
                pantry_items=len(k["inventory"]), saved_recipes=len(k["saved_recipes"]), shares=len(u.shares),
            )
        )
    return rows


@router.post("/admin/users/{user_id}/password", status_code=204)
def admin_reset_password(user_id: int, body: PasswordReset, _: User = Depends(admin_user), db: Session = Depends(get_db)):
    """Set a new password for any user and sign them out everywhere."""
    user = _target(db, user_id)
    user.password_hash = hash_password(body.new_password)
    db.execute(delete(AuthToken).where(AuthToken.user_id == user.id))
    db.commit()
    return Response(status_code=204)


@router.delete("/admin/users/{user_id}", status_code=204)
def admin_delete_user(user_id: int, admin: User = Depends(admin_user), db: Session = Depends(get_db)):
    if user_id == admin.id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "You can't delete your own admin account here")
    db.delete(_target(db, user_id))
    db.commit()
    return Response(status_code=204)
