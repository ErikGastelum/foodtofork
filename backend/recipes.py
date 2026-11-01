"""Recipe routes: POST /match and GET /recipes/{id}.

Data comes from data/recipes.json (built by scripts/fetch_recipes.py from TheMealDB).
"""

import json
from pathlib import Path
from typing import Literal, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from matching import score

DATA_FILE = Path(__file__).parent / "data" / "recipes.json"

RECIPES: list = json.loads(DATA_FILE.read_text(encoding="utf-8")) if DATA_FILE.exists() else []
BY_ID: dict = {r["id"]: r for r in RECIPES}

router = APIRouter(tags=["recipes"])


class MatchRequest(BaseModel):
    inventory: list[str] = Field(min_length=1)       # any number of ingredients
    limit: Optional[int] = Field(default=None, ge=1)  # max recipes returned (None = all)
    min_match: int = Field(default=1, ge=0, le=100)   # filter: minimum match percent
    sort: Literal["match", "name"] = "match"          # sort order


@router.post("/match")
async def match(req: MatchRequest):
    results = []
    for r in RECIPES:
        pct, owned, missing = score([i["name"] for i in r["ingredients"]], req.inventory)
        if pct >= req.min_match:
            results.append(
                {
                    "id": r["id"],
                    "name": r["name"],
                    "thumbnail": r["thumbnail"],
                    "category": r["category"],
                    "match": pct,
                    "owned": owned,
                    "missing": missing,
                }
            )
    if req.sort == "name":
        results.sort(key=lambda x: x["name"])
    else:
        results.sort(key=lambda x: (-x["match"], x["name"]))
    return results[: req.limit]


@router.get("/recipes/{recipe_id}")
async def get_recipe(recipe_id: str):
    recipe = BY_ID.get(recipe_id)
    if recipe is None:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe