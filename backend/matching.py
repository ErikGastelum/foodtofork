"""Recipe matching: how much of a recipe does the user already own?

Pure functions, no I/O, so they are easy to test.
"""


def _singular(word: str) -> str:
    # Crude plural handling: tomatoes -> tomato, berries -> berry, eggs -> egg.
    if len(word) > 3:
        if word.endswith("ies"):
            return word[:-3] + "y"
        if word.endswith("oes"):
            return word[:-2]
        if word.endswith("s") and not word.endswith("ss"):
            return word[:-1]
    return word


def _words(text: str) -> frozenset:
    return frozenset(_singular(w) for w in text.lower().replace("-", " ").split())


def _same_ingredient(a: frozenset, b: frozenset) -> bool:
    # "oil" matches "olive oil" (word subset), but "egg" does NOT match "eggplant".
    return bool(a) and bool(b) and (a <= b or b <= a)


def score(recipe_ingredients: list, inventory: list) -> tuple:
    """Return (match_percent, owned_names, missing_names) for one recipe."""
    have_words = [_words(item) for item in inventory if item.strip()]
    owned, missing = [], []
    for name in recipe_ingredients:
        words = _words(name)
        if any(_same_ingredient(words, have) for have in have_words):
            owned.append(name)
        else:
            missing.append(name)
    total = len(recipe_ingredients)
    if total == 0:
        return 0, [], []
    return round(100 * len(owned) / total), owned, missing