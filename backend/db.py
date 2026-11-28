"""Database setup for accounts (owner: Jonathan).

ONE setting decides where accounts live: the DATABASE_URL environment variable.

  * Not set (local dev, tests): a SQLite file, backend/foodtofork.db. Zero setup.
  * Deployed: a Postgres URL, e.g. Neon from the Vercel Marketplace:
        DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/neondb?sslmode=require
    Vercel and Render's free tier wipe files on every deploy, so a SQLite file
    would lose every account there. Postgres keeps them.

The rest of the code only uses SQLAlchemy, so it never needs to know which one
it is talking to.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import JSON, DateTime, ForeignKey, String, Text, UniqueConstraint, create_engine, inspect
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker
from sqlalchemy.pool import StaticPool

DEFAULT_SQLITE = f"sqlite:///{Path(__file__).parent / 'foodtofork.db'}"


def now() -> datetime:
    return datetime.now(timezone.utc)


def empty_kitchen() -> dict:
    return {"inventory": [], "grocery_list": [], "saved_recipes": []}


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)  # stored lowercase
    first_name: Mapped[str] = mapped_column(String(40), default="")
    last_name: Mapped[str] = mapped_column(String(40), default="")
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(10), default="user")  # "user" | "admin"
    # The user's pantry, grocery list and saved recipes, as one JSON document.
    kitchen: Mapped[dict] = mapped_column(JSON, default=empty_kitchen)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)

    tokens: Mapped[list["AuthToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    shares: Mapped[list["RecipeShare"]] = relationship(back_populates="owner", cascade="all, delete-orphan")


class AuthToken(Base):
    """A signed-in session. We store a SHA-256 of the token, never the token itself."""

    __tablename__ = "auth_tokens"

    token_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))

    user: Mapped[User] = relationship(back_populates="tokens")


class RecipeShare(Base):
    """One saved recipe shared by link, e.g. "Saturday Dinner", with its grocery list.

    Anyone with the link can see it and claim missing ingredients ("Maria is bringing Feta").
    One share per saved recipe per user.
    """

    __tablename__ = "recipe_shares"
    __table_args__ = (UniqueConstraint("owner_id", "recipe_id"),)

    # Random id used in the link (/share/<id>). Not a counter, so links can't be guessed.
    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    recipe_id: Mapped[str] = mapped_column(String(40))
    recipe_name: Mapped[str] = mapped_column(String(200))
    thumbnail: Mapped[str | None] = mapped_column(String(500), nullable=True)
    title: Mapped[str] = mapped_column(String(80))
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now, onupdate=now)

    owner: Mapped[User] = relationship(back_populates="shares")
    items: Mapped[list["ShareItem"]] = relationship(
        back_populates="share", cascade="all, delete-orphan", order_by="ShareItem.position"
    )


class ShareItem(Base):
    """One ingredient on a shared recipe. `have` = the owner already has it."""

    __tablename__ = "share_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    share_id: Mapped[str] = mapped_column(ForeignKey("recipe_shares.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(default=0)
    name: Mapped[str] = mapped_column(String(200))
    measure: Mapped[str] = mapped_column(String(100), default="")
    have: Mapped[bool] = mapped_column(default=False)
    claimed_by: Mapped[str | None] = mapped_column(String(40), nullable=True)  # who said "I'll get it"
    claimed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    share: Mapped[RecipeShare] = relationship(back_populates="items")


# --- Engine -----------------------------------------------------------------
engine = None
SessionLocal: sessionmaker[Session] | None = None


def normalize_url(url: str) -> str:
    """Neon/Vercel hand out postgres:// or postgresql:// URLs; SQLAlchemy needs the driver name."""
    if url.startswith("postgres://"):
        url = "postgresql://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        url = "postgresql+psycopg://" + url[len("postgresql://"):]
    return url


def configure(url: str | None = None) -> None:
    """Create the engine. main.py calls this at startup; tests call it with sqlite://."""
    global engine, SessionLocal
    url = normalize_url(url or os.getenv("DATABASE_URL") or DEFAULT_SQLITE)
    if url.startswith("sqlite"):
        kwargs = {"connect_args": {"check_same_thread": False}}
        if url in ("sqlite://", "sqlite:///:memory:"):
            kwargs["poolclass"] = StaticPool  # one shared in-memory DB (tests)
    else:
        kwargs = {"pool_pre_ping": True}  # Neon sleeps when idle; reconnect cleanly
    engine = create_engine(url, **kwargs)
    SessionLocal = sessionmaker(bind=engine, expire_on_commit=False)
    _check_schema(url)
    Base.metadata.create_all(engine)


def _check_schema(url: str) -> None:
    """create_all() makes missing tables but never changes existing ones. If the users table
    is from an older version of this branch, say so clearly instead of failing later."""
    cols = {c["name"] for c in inspect(engine).get_columns("users")} if inspect(engine).has_table("users") else None
    if cols is not None and "first_name" not in cols:
        hint = (
            "delete backend/foodtofork.db (it only holds test accounts) and start again"
            if url.startswith("sqlite")
            else "the accounts tables are from an older version: drop them or add the missing columns"
        )
        raise RuntimeError(f"Accounts database is out of date: {hint}.")


def get_db():
    """FastAPI dependency: one database session per request."""
    if SessionLocal is None:
        configure()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
