"""One-off: download every TheMealDB recipe into backend/data/recipes.json.

Run from backend/:  python scripts/fetch_recipes.py
Uses only the standard library and TheMealDB's free test key ("1").
"""

import json
import string
import time
import urllib.request
from pathlib import Path

BASE = "https://www.themealdb.com/api/json/v1/1"
OUT = Path(__file__).resolve().parent.parent / "data" / "recipes.json"


def fetch_letter(letter: str) -> list:
    with urllib.request.urlopen(f"{BASE}/search.php?f={letter}", timeout=15) as resp:
        return json.load(resp).get("meals") or []


def simplify(meal: dict) -> dict:
    ingredients = []
    for i in range(1, 21):
        name = (meal.get(f"strIngredient{i}") or "").strip()
        if name:
            ingredients.append({"name": name, "measure": (meal.get(f"strMeasure{i}") or "").strip()})
    return {
        "id": meal["idMeal"],
        "name": meal["strMeal"],
        "thumbnail": meal["strMealThumb"],
        "category": meal.get("strCategory"),
        "area": meal.get("strArea"),
        "instructions": meal.get("strInstructions"),
        "ingredients": ingredients,
    }


def main() -> None:
    recipes = {}
    for letter in string.ascii_lowercase:
        for meal in fetch_letter(letter):
            recipes[meal["idMeal"]] = simplify(meal)
        time.sleep(0.2)  # be polite to the free API
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(list(recipes.values()), indent=1), encoding="utf-8")
    print(f"Saved {len(recipes)} recipes to {OUT}")


if __name__ == "__main__":
    main()