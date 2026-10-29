"""

Open Food Facts is never called for real: a fake OFF (httpx.MockTransport)
answers instead, so the tests are fast and work offline.

Purely for Testing Healthy Endpoints
"""

import httpx
import pytest
from fastapi.testclient import TestClient

import products
from main import app
from openfoodfacts import OpenFoodFacts, normalize_product

PEANUT_KIT = {
    "code": "0737628064502",
    "product_name": "Thai Peanut Noodle Kit",
    "brands": "Simply Asia, Thai Kitchen",
    "image_front_small_url": "https://images.openfoodfacts.org/kit.200.jpg",
    "categories_tags": ["en:plant-based-foods", "en:pastas", "en:noodles", "fr:nouilles-thai"],
}

MILK_HITS = [
    {"code": "0011110", "product_name": "Whole Milk", "brands": ["Organic Valley"],
     "categories_tags": ["en:dairies", "en:milks"]},
    {"code": "0033330", "product_name": {"en": "Oat Milk"}, "brands": "Oatly",
     "categories": "Beverages, Plant milks"},
    {"code": "0044440", "product_name": "Whole Milk", "brands": ["Organic Valley"]},  # duplicate
    {"code": "0055550", "product_name": ""},  # no name -> dropped
]


class FakeOFF:
    """Records requests and answers like Open Food Facts would."""

    def __init__(self):
        self.calls: list[httpx.Request] = []
        self.down = False
        self.search_service_down = False

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.calls.append(request)
        if self.down:
            return httpx.Response(503, text="<html>Page temporarily unavailable</html>")
        path = request.url.path
        if path.startswith("/api/v2/product/"):
            code = path.rsplit("/", 1)[-1].removesuffix(".json")
            if code == PEANUT_KIT["code"]:
                return httpx.Response(200, json={"status": 1, "product": PEANUT_KIT})
            if code == "3017620422003":
                return httpx.Response(200, json={"status": 1, "product": {"code": code}})  # nameless
            return httpx.Response(404, json={"status": 0, "status_verbose": "product not found"})
        if request.url.host == "search.openfoodfacts.org" and path == "/search":
            if self.search_service_down:
                return httpx.Response(502)
            return httpx.Response(200, json={"hits": MILK_HITS, "count": len(MILK_HITS)})
        if path == "/cgi/search.pl":
            return httpx.Response(200, json={"products": MILK_HITS[:1]})
        return httpx.Response(404)


@pytest.fixture
def fake():
    return FakeOFF()


@pytest.fixture
def client(fake):
    off = OpenFoodFacts(OpenFoodFacts.make_http_client(transport=httpx.MockTransport(fake)))
    app.dependency_overrides[products.get_off] = lambda: off
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---- /health ---------------------------------------------------------------


def test_health(client):
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_cors_allows_local_frontend(client):
    r = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert r.headers["access-control-allow-origin"] == "http://localhost:5173"


# ---- /products/barcode -------------------------------------------------------


def test_barcode_found(client):
    r = client.get("/products/barcode/0737628064502")
    assert r.status_code == 200
    assert r.json() == {
        "barcode": "0737628064502",
        "name": "Thai Peanut Noodle Kit",
        "brand": "Simply Asia",
        "image": "https://images.openfoodfacts.org/kit.200.jpg",
        "category": "Noodles",
    }


def test_barcode_upc_a_retries_as_ean13(client, fake):
    r = client.get("/products/barcode/737628064502")  # 12-digit UPC-A
    assert r.status_code == 200
    assert r.json()["barcode"] == "737628064502"
    assert len(fake.calls) == 2


def test_barcode_not_found(client):
    r = client.get("/products/barcode/00000000")
    assert r.status_code == 404
    assert r.json() == {"detail": "Product not found"}


def test_barcode_without_name_counts_as_not_found(client):
    assert client.get("/products/barcode/3017620422003").status_code == 404


@pytest.mark.parametrize("bad", ["abc123456", "1234", "123456789012345", "12345-678"])
def test_barcode_bad_input(client, fake, bad):
    r = client.get(f"/products/barcode/{bad}")
    assert r.status_code == 400
    assert isinstance(r.json()["detail"], str)
    assert fake.calls == []


def test_barcode_is_cached(client, fake):
    client.get("/products/barcode/0737628064502")
    client.get("/products/barcode/0737628064502")
    assert len(fake.calls) == 1


def test_barcode_upstream_down(client, fake):
    fake.down = True
    r = client.get("/products/barcode/0737628064502")
    assert r.status_code == 502
    assert isinstance(r.json()["detail"], str)


# ---- /products/search -------------------------------------------------------


def test_search_returns_products(client, fake):
    r = client.get("/products/search", params={"q": "milk"})
    assert r.status_code == 200
    assert r.json() == [
        {"barcode": "0011110", "name": "Whole Milk", "brand": "Organic Valley", "image": None, "category": "Milks"},
        {"barcode": "0033330", "name": "Oat Milk", "brand": "Oatly", "image": None, "category": "Plant milks"},
    ]
    sent = fake.calls[0].url
    assert sent.host == "search.openfoodfacts.org"
    assert sent.params["q"] == "milk"
    assert "FoodToFork" in fake.calls[0].headers["user-agent"]


def test_search_limit(client):
    r = client.get("/products/search", params={"q": "milk", "limit": 1})
    assert [p["name"] for p in r.json()] == ["Whole Milk"]


def test_search_is_cached_case_insensitively(client, fake):
    client.get("/products/search", params={"q": "Milk"})
    client.get("/products/search", params={"q": "  milk ", "limit": 2})
    assert len(fake.calls) == 1


def test_search_falls_back_to_legacy(client, fake):
    fake.search_service_down = True
    r = client.get("/products/search", params={"q": "milk"})
    assert r.status_code == 200
    assert [p["name"] for p in r.json()] == ["Whole Milk"]
    assert fake.calls[-1].url.path == "/cgi/search.pl"


@pytest.mark.parametrize(
    "params", [{}, {"q": "m"}, {"q": "  m  "}, {"q": "milk", "limit": 0}, {"q": "milk", "limit": 21}]
)
def test_search_bad_params(client, params):
    r = client.get("/products/search", params=params)
    assert r.status_code == 422
    assert isinstance(r.json()["detail"], str)


def test_search_upstream_down(client, fake):
    fake.down = True
    r = client.get("/products/search", params={"q": "milk"})
    assert r.status_code == 502


def test_search_rate_guard(fake):
    off = OpenFoodFacts(
        OpenFoodFacts.make_http_client(transport=httpx.MockTransport(fake)), search_rate=2
    )
    app.dependency_overrides[products.get_off] = lambda: off
    try:
        with TestClient(app) as c:
            codes = [c.get("/products/search", params={"q": f"item{i}"}).status_code for i in range(3)]
            cached = c.get("/products/search", params={"q": "item0"}).status_code
    finally:
        app.dependency_overrides.clear()
    assert codes == [200, 200, 502]
    assert cached == 200  # cached answers don't count against the limit


# ---- normalisation edge cases -------------------------------------------------


def test_normalize_prefers_english_name_and_tag():
    p = normalize_product({
        "code": "123",
        "product_name": {"fr": "Lait entier", "en": "Whole milk"},
        "categories_tags": ["en:milks", "fr:laits-entiers"],
    })
    assert p["name"] == "Whole milk"
    assert p["category"] == "Milks"


def test_normalize_falls_back_to_generic_name():
    p = normalize_product({"code": "123", "product_name": " ", "generic_name": "Eggs"})
    assert p["name"] == "Eggs"
    assert p["brand"] is None and p["image"] is None and p["category"] is None
