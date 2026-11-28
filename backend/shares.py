"""Share a saved recipe with family (owner: Jonathan). See docs/ACCOUNTS.md.

The owner picks one of their saved recipes and gives it a title ("Saturday Dinner")
and notes. The share link shows the recipe and its grocery list: what the owner
already has, and what's still missing. Anyone with the link (no account needed)
can put their name on a missing ingredient: "Maria is getting Feta".

  /me/shares/*   the owner: create, edit, refresh from pantry, stop sharing, clear a claim
  /share/{id}    everyone: view, claim an ingredient, undo your claim
"""

from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator
from sqlalchemy import select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

import recipes
from accounts import current_user, kitchen_of
from db import RecipeShare, ShareItem, User, get_db, now
from matching import score
from security import new_share_id

router = APIRouter(tags=["sharing"])


# --- Shapes -------------------------------------------------------------------
def _one_line(v: str) -> str:
    return " ".join(v.split())


class ShareCreate(BaseModel):
    recipe_id: str = Field(min_length=1, max_length=40)
    title: str = Field(max_length=80)
    notes: str = Field(default="", max_length=1000)

    @field_validator("title")
    @classmethod
    def _title(cls, v: str) -> str:
        v = _one_line(v)
        if not v:
            raise ValueError("Give it a title, like Saturday Dinner")
        return v


class ShareUpdate(BaseModel):
    title: str | None = Field(default=None, max_length=80)
    notes: str | None = Field(default=None, max_length=1000)

    @field_validator("title")
    @classmethod
    def _title(cls, v: str | None) -> str | None:
        if v is None:
            return v
        v = _one_line(v)
        if not v:
            raise ValueError("Title can't be blank")
        return v


class ClaimRequest(BaseModel):
    name: str = Field(max_length=40)

    @field_validator("name")
    @classmethod
    def _name(cls, v: str) -> str:
        v = _one_line(v)
        if not v:
            raise ValueError("Type your name")
        return v


class ItemOut(BaseModel):
    id: int
    name: str
    measure: str
    have: bool  # the owner already has it
    claimed_by: str | None  # who said they'll get it


class RecipeRef(BaseModel):
    id: str
    name: str
    thumbnail: str | None


class ShareOut(BaseModel):
    id: str  # goes in the link: /share/<id>
    title: str
    notes: str
    owner_name: str  # "Jonathan T."
    recipe: RecipeRef
    items: list[ItemOut]
    updated_at: datetime


# --- Helpers ------------------------------------------------------------------
def _display_name(user: User) -> str:
    last = f" {user.last_name[0]}." if user.last_name else ""
    return f"{user.first_name}{last}".strip() or user.username


def _out(share: RecipeShare) -> ShareOut:
    return ShareOut(
        id=share.id,
        title=share.title,
        notes=share.notes,
        owner_name=_display_name(share.owner),
        recipe=RecipeRef(id=share.recipe_id, name=share.recipe_name, thumbnail=share.thumbnail),
        items=[ItemOut(id=i.id, name=i.name, measure=i.measure, have=i.have, claimed_by=i.claimed_by) for i in share.items],
        updated_at=share.updated_at,
    )


def _ingredients(recipe: dict) -> list[dict]:
    """The recipe's ingredients, each name once (some TheMealDB recipes list one twice)."""
    seen, out = set(), []
    for ing in recipe.get("ingredients", []):
        name = (ing.get("name") or "").strip()
        if name and name.lower() not in seen:
            seen.add(name.lower())
            out.append({"name": name, "measure": (ing.get("measure") or "").strip()})
    return out


def _owned_names(user: User, names: list[str]) -> set[str]:
    pantry = [i["name"] for i in kitchen_of(user)["inventory"]]
    _, owned, _ = score(names, pantry)
    return {n.lower() for n in owned}


def _my_share(db: Session, user: User, share_id: str) -> RecipeShare:
    share = db.get(RecipeShare, share_id)
    if share is None or share.owner_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Share not found")
    return share


def _public_share(db: Session, share_id: str) -> RecipeShare:
    share = db.get(RecipeShare, share_id)
    if share is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "This link doesn't work anymore")
    return share


def _item(share: RecipeShare, item_id: int) -> ShareItem:
    item = next((i for i in share.items if i.id == item_id), None)
    if item is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ingredient not found")
    return item


def _touch(share: RecipeShare) -> None:
    share.updated_at = now()


# --- Owner --------------------------------------------------------------------
@router.get("/me/shares", response_model=list[ShareOut])
def my_shares(user: User = Depends(current_user)):
    return [_out(s) for s in sorted(user.shares, key=lambda s: s.created_at)]


@router.post("/me/shares", response_model=ShareOut, status_code=201)
def create_share(body: ShareCreate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    recipe = recipes.BY_ID.get(body.recipe_id)
    if recipe is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Recipe not found")
    ingredients = _ingredients(recipe)
    owned = _owned_names(user, [i["name"] for i in ingredients])
    share = RecipeShare(
        id=new_share_id(),
        owner_id=user.id,
        recipe_id=body.recipe_id,
        recipe_name=recipe["name"],
        thumbnail=recipe.get("thumbnail"),
        title=body.title,
        notes=body.notes.strip(),
        items=[
            ShareItem(position=n, name=i["name"], measure=i["measure"], have=i["name"].lower() in owned)
            for n, i in enumerate(ingredients)
        ],
    )
    db.add(share)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "You already share this recipe. Edit that share instead.")
    return _out(share)


@router.patch("/me/shares/{share_id}", response_model=ShareOut)
def edit_share(share_id: str, body: ShareUpdate, user: User = Depends(current_user), db: Session = Depends(get_db)):
    share = _my_share(db, user, share_id)
    if body.title is not None:
        share.title = body.title
    if body.notes is not None:
        share.notes = body.notes.strip()
    _touch(share)
    db.commit()
    return _out(share)


@router.post("/me/shares/{share_id}/refresh", response_model=ShareOut)
def refresh_share(share_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    """Re-check what the owner has, after they've added or used up pantry items. Claims stay."""
    share = _my_share(db, user, share_id)
    owned = _owned_names(user, [i.name for i in share.items])
    for item in share.items:
        item.have = item.name.lower() in owned
    _touch(share)
    db.commit()
    return _out(share)


@router.delete("/me/shares/{share_id}", status_code=204)
def stop_sharing(share_id: str, user: User = Depends(current_user), db: Session = Depends(get_db)):
    db.delete(_my_share(db, user, share_id))
    db.commit()
    return Response(status_code=204)


@router.delete("/me/shares/{share_id}/items/{item_id}/claim", response_model=ShareOut)
def owner_clear_claim(share_id: str, item_id: int, user: User = Depends(current_user), db: Session = Depends(get_db)):
    share = _my_share(db, user, share_id)
    item = _item(share, item_id)
    item.claimed_by = None
    item.claimed_at = None
    _touch(share)
    db.commit()
    return _out(share)


# --- Everyone (no account) ---------------------------------------------------------
@router.get("/share/{share_id}", response_model=ShareOut)
def view_share(share_id: str, db: Session = Depends(get_db)):
    return _out(_public_share(db, share_id))


@router.post("/share/{share_id}/items/{item_id}/claim", response_model=ShareOut)
def claim_item(share_id: str, item_id: int, body: ClaimRequest, db: Session = Depends(get_db)):
    """'I'll get it.' First person to claim an ingredient keeps it."""
    share = _public_share(db, share_id)
    item = _item(share, item_id)
    if item.have:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"{share.owner.first_name or 'They'} already has {item.name}")
    if item.claimed_by and item.claimed_by.lower() == body.name.lower():
        return _out(share)  # already yours
    # One UPDATE that only succeeds if nobody claimed it first, so two people can't both win.
    won = db.execute(
        update(ShareItem)
        .where(ShareItem.id == item.id, ShareItem.claimed_by.is_(None))
        .values(claimed_by=body.name, claimed_at=now())
    ).rowcount
    if not won:
        db.rollback()
        db.refresh(item)
        raise HTTPException(status.HTTP_409_CONFLICT, f"{item.claimed_by} is already getting {item.name}")
    _touch(share)
    db.commit()
    db.expire_all()  # reload what the UPDATE above changed
    return _out(share)


@router.post("/share/{share_id}/items/{item_id}/unclaim", response_model=ShareOut)
def unclaim_item(share_id: str, item_id: int, body: ClaimRequest, db: Session = Depends(get_db)):
    """Undo your own claim. You must give the same name you claimed with."""
    share = _public_share(db, share_id)
    item = _item(share, item_id)
    if item.claimed_by is None:
        return _out(share)
    if item.claimed_by.lower() != body.name.lower():
        raise HTTPException(status.HTTP_403_FORBIDDEN, f"Only {item.claimed_by} can undo that")
    item.claimed_by = None
    item.claimed_at = None
    _touch(share)
    db.commit()
    return _out(share)
