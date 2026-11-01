"""Open Food Facts client.

This is the only place the backend talks to Open Food Facts (OFF). It turns
OFF's large, inconsistent product records into the small Product shape from
docs/API_CONTRACT.md:

    {"barcode": str, "name": str, "brand": str | None,
     "image": str | None, "category": str | None}

OFF limits (per IP): about 15 product reads/min and 10 searches/min, and asks
apps not to call search on every keystroke. So every lookup is cached in
memory, and a small rate guard stops us before OFF starts rejecting us.
"""

from __future__ import annotations

import os
import re
import time
from collections import OrderedDict, deque
from typing import Any

import httpx

OFF_BASE_URL = os.getenv("OFF_BASE_URL", "https://world.openfoodfacts.org").rstrip("/")
OFF_SEARCH_URL = os.getenv("OFF_SEARCH_URL", "https://search.openfoodfacts.org").rstrip("/")
# OFF asks every app to identify itself: "AppName/Version (contact)".
USER_AGENT = os.getenv(
    "OFF_USER_AGENT",
    "FoodToFork/0.1 (https://github.com/ErikGastelum/foodtofork)",
)

# Only ask OFF for the fields we use; full product records are huge.
FIELDS = ",".join(
    [
        "code",
        "product_name",
        "product_name_en",
        "generic_name",
        "brands",
        "image_front_small_url",
        "image_front_url",
        "image_url",
        "categories",
        "categories_tags",
    ]
)

PRODUCT_TTL = 24 * 60 * 60  # products rarely change
NOT_FOUND_TTL = 60 * 60  # retry unknown barcodes after an hour
SEARCH_TTL = 60 * 60
SEARCH_PAGE_SIZE = 20  # fetch the max once, then slice per `limit`

BARCODE_RE = re.compile(r"^\d{8,14}$")


class UpstreamError(Exception):
    """Open Food Facts failed, timed out, or we are over its rate limit."""


# Small helpers: cache and rate guard
class TTLCache:
    """Tiny in-memory cache with per-entry expiry and a size cap."""

    def __init__(self, maxsize: int = 2000):
        self.maxsize = maxsize
        self._data: OrderedDict[str, tuple[float, Any]] = OrderedDict()

    def get(self, key: str) -> tuple[bool, Any]:
        item = self._data.get(key)
        if item is None:
            return False, None
        expires, value = item
        if expires < time.monotonic():
            del self._data[key]
            return False, None
        self._data.move_to_end(key)
        return True, value

    def set(self, key: str, value: Any, ttl: float) -> None:
        self._data[key] = (time.monotonic() + ttl, value)
        self._data.move_to_end(key)
        while len(self._data) > self.maxsize:
            self._data.popitem(last=False)


class RateGuard:
    """Sliding-window counter: at most `limit` calls per `window` seconds."""

    def __init__(self, limit: int, window: float = 60.0):
        self.limit = limit
        self.window = window
        self._calls: deque[float] = deque()

    def try_acquire(self) -> bool:
        now = time.monotonic()
        while self._calls and now - self._calls[0] > self.window:
            self._calls.popleft()
        if len(self._calls) >= self.limit:
            return False
        self._calls.append(now)
        return True


# Normalising OFF records into our Product shape


def is_valid_barcode(code: str) -> bool:
    return bool(BARCODE_RE.match(code))


def _text(value: Any) -> str | None:
    """OFF fields can be a string, a list, or a {lang: text} dict."""
    if isinstance(value, dict):
        for key in ("en", "main"):
            if value.get(key):
                return _text(value[key])
        return next((_text(v) for v in value.values() if _text(v)), None)
    if isinstance(value, list):
        return next((_text(v) for v in value if _text(v)), None)
    if isinstance(value, str):
        cleaned = " ".join(value.split())
        return cleaned or None
    return None


def _brand(value: Any) -> str | None:
    if isinstance(value, str):
        value = value.split(",")
    return _text(value)


def _tag_to_label(tag: str) -> str | None:
    label = re.sub(r"^[a-z]{2,3}:", "", tag.strip()).replace("-", " ").strip()
    return label[:1].upper() + label[1:] if label else None


def _category(raw: dict) -> str | None:
    """Most specific category, preferring the English taxonomy tags."""
    tags = raw.get("categories_tags")
    if isinstance(tags, list) and tags:
        english = [t for t in tags if isinstance(t, str) and t.startswith("en:")]
        pick = (english or [t for t in tags if isinstance(t, str)] or [None])[-1]
        if pick:
            return _tag_to_label(pick)
    cats = raw.get("categories")
    if isinstance(cats, str):
        parts = [p for p in cats.split(",") if p.strip()]
        if parts:
            return _tag_to_label(parts[-1])
    return None


def _image(raw: dict) -> str | None:
    for key in ("image_front_small_url", "image_front_url", "image_url"):
        url = raw.get(key)
        if isinstance(url, str) and url.startswith("http"):
            return url
    return None


def normalize_product(raw: dict, barcode: str | None = None) -> dict | None:
    """OFF record -> Product dict, or None if it has no usable name."""
    name = (
        _text(raw.get("product_name"))
        or _text(raw.get("product_name_en"))
        or _text(raw.get("generic_name"))
    )
    code = _text(raw.get("code")) or barcode
    if not name or not code:
        return None
    return {
        "barcode": code,
        "name": name,
        "brand": _brand(raw.get("brands")),
        "image": _image(raw),
        "category": _category(raw),
    }



# The client



class OpenFoodFacts:
    def __init__(
        self,
        client: httpx.AsyncClient,
        product_rate: int = 15,
        search_rate: int = 10,
    ):
        self.client = client
        self.products = TTLCache()
        self.searches = TTLCache(maxsize=500)
        self.product_guard = RateGuard(product_rate)
        self.search_guard = RateGuard(search_rate)

    @staticmethod
    def make_http_client(**kwargs) -> httpx.AsyncClient:
        return httpx.AsyncClient(
            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
            timeout=httpx.Timeout(6.0, connect=4.0),
            follow_redirects=True,
            **kwargs,
        )

    async def _get_json(self, url: str, params: dict | None = None) -> tuple[int, Any]:
        try:
            resp = await self.client.get(url, params=params)
        except httpx.HTTPError as exc:
            raise UpstreamError(f"Open Food Facts request failed: {exc!r}") from exc
        if resp.status_code == 429 or resp.status_code >= 500:
            raise UpstreamError(f"Open Food Facts returned {resp.status_code}")
        try:
            return resp.status_code, resp.json()
        except ValueError as exc:
            # OFF sometimes serves an HTML "temporarily unavailable" page.
            raise UpstreamError("Open Food Facts returned a non-JSON page") from exc

    # ---- barcode lookup -------------------------------------------------

    async def get_product(self, barcode: str) -> dict | None:
        """Product for a barcode, or None if OFF doesn't know it."""
        hit, cached = self.products.get(barcode)
        if hit:
            return cached

        product = await self._fetch_product(barcode)
        # Scanners read UPC-A as 12 digits; OFF usually stores it as EAN-13.
        if product is None and len(barcode) == 12:
            product = await self._fetch_product("0" + barcode)
            if product:
                product = {**product, "barcode": barcode}

        self.products.set(barcode, product, PRODUCT_TTL if product else NOT_FOUND_TTL)
        return product

    async def _fetch_product(self, barcode: str) -> dict | None:
        if not self.product_guard.try_acquire():
            raise UpstreamError("Too many product lookups, slow down")
        status, data = await self._get_json(
            f"{OFF_BASE_URL}/api/v2/product/{barcode}.json", {"fields": FIELDS}
        )
        if status == 404 or not isinstance(data, dict) or data.get("status") != 1:
            return None
        return normalize_product(data.get("product") or {}, barcode)

    # ---- text search ------------------------------------------------------

    async def search(self, query: str, limit: int = 8) -> list[dict]:
        key = " ".join(query.lower().split())
        hit, cached = self.searches.get(key)
        if not hit:
            if not self.search_guard.try_acquire():
                raise UpstreamError("Too many searches, slow down")
            try:
                raw = await self._search_service(key)
            except UpstreamError:
                raw = await self._search_legacy(key)
            cached = _dedupe(p for p in (normalize_product(r) for r in raw) if p)
            self.searches.set(key, cached, SEARCH_TTL)
        return cached[:limit]

    async def _search_service(self, query: str) -> list[dict]:
        """search.openfoodfacts.org (Search-a-licious), OFF's search service."""
        _, data = await self._get_json(
            f"{OFF_SEARCH_URL}/search",
            {"q": query, "page_size": SEARCH_PAGE_SIZE, "fields": FIELDS, "langs": "en"},
        )
        hits = data.get("hits") if isinstance(data, dict) else None
        if not isinstance(hits, list):
            raise UpstreamError("Unexpected search response")
        return hits

    async def _search_legacy(self, query: str) -> list[dict]:
        """Fallback: the older /cgi/search.pl full-text search."""
        _, data = await self._get_json(
            f"{OFF_BASE_URL}/cgi/search.pl",
            {
                "search_terms": query,
                "search_simple": 1,
                "action": "process",
                "json": 1,
                "page_size": SEARCH_PAGE_SIZE,
                "fields": FIELDS,
            },
        )
        products = data.get("products") if isinstance(data, dict) else None
        if not isinstance(products, list):
            raise UpstreamError("Unexpected search response")
        return products


def _dedupe(products) -> list[dict]:
    seen: set[tuple[str, str]] = set()
    out = []
    for p in products:
        key = (p["name"].lower(), (p["brand"] or "").lower())
        if key not in seen:
            seen.add(key)
            out.append(p)
    return out
