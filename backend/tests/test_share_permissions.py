"""Who can do what with recipe shares (owner: Jacob). In-memory database only."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import accounts
import db
import recipes
import security
import shares

RECIPE = {
    "id": "52789", "name": "Shakshuka", "thumbnail": "t.jpg", "category": "Vegetarian", "area": "Egyptian",
    "instructions": "cook",
    "ingredients": [
        {"name": "Eggs", "measure": "4"},
        {"name": "Feta", "measure": "50g"},
        {"name": "Cumin", "measure": "1 tsp"},
    ],
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(security, "ITERATIONS", 1_000)
    monkeypatch.setattr(recipes, "BY_ID", {"52789": RECIPE})
    monkeypatch.setenv("ADMIN_USERNAME", "Admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "admin-pass-123")
    db.configure("sqlite://")
    with db.SessionLocal() as session:
        accounts.ensure_admin(session)
    app = FastAPI()
    app.include_router(accounts.router)
    app.include_router(shares.router)
    return TestClient(app)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def signup(client, username):
    """Sign up with Large Eggs in the pantry, so Eggs is 'have' and Feta/Cumin are still needed."""
    body = {
        "username": username, "password": "user-pass-123", "first_name": "Test", "last_name": "Person",
        "kitchen": {
            "inventory": [{"name": "Large Eggs"}],
            "grocery_list": [],
            "saved_recipes": [{"id": "52789", "name": "Shakshuka"}],
        },
    }
    res = client.post("/auth/signup", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def make_share(client, token):
    res = client.post("/me/shares", json={"recipe_id": "52789", "title": "Saturday Dinner"}, headers=auth(token))
    assert res.status_code == 201, res.text
    return res.json()


def item(share, name):
    return next(i for i in share["items"] if i["name"] == name)


# --- Signed-in routes need a signed-in user -------------------------------------------
@pytest.mark.parametrize(
    "method,path,body",
    [
        ("GET", "/me/shares", None),
        ("POST", "/me/shares", {"recipe_id": "52789", "title": "X"}),
        ("PATCH", "/me/shares/abc", {"title": "X"}),
        ("POST", "/me/shares/abc/refresh", None),
        ("DELETE", "/me/shares/abc", None),
        ("DELETE", "/me/shares/abc/items/1/claim", None),
    ],
)
def test_owner_routes_need_sign_in(client, method, path, body):
    assert client.request(method, path, json=body).status_code == 401


# --- Owner-only actions ------------------------------------------------------------------
def test_other_user_cannot_refresh_or_clear_claims(client):
    owner = signup(client, "owner_one")
    other = signup(client, "other_one")
    share = make_share(client, owner["token"])
    feta = item(share, "Feta")
    client.post(f"/share/{share['id']}/items/{feta['id']}/claim", json={"name": "Maria"})

    headers = auth(other["token"])
    assert client.post(f"/me/shares/{share['id']}/refresh", headers=headers).status_code == 404
    assert client.delete(f"/me/shares/{share['id']}/items/{feta['id']}/claim", headers=headers).status_code == 404

    # The claim is still there.
    public = client.get(f"/share/{share['id']}").json()
    assert item(public, "Feta")["claimed_by"] == "Maria"


# --- An item id only works on its own share ----------------------------------------------
def test_item_id_from_another_share_is_rejected(client):
    a_owner = signup(client, "a_owner")
    b_owner = signup(client, "b_owner")
    share_a = make_share(client, a_owner["token"])
    share_b = make_share(client, b_owner["token"])
    b_feta = item(share_b, "Feta")

    url = f"/share/{share_a['id']}/items/{b_feta['id']}"
    assert client.post(f"{url}/claim", json={"name": "Maria"}).status_code == 404
    assert client.post(f"{url}/unclaim", json={"name": "Maria"}).status_code == 404
    owner_url = f"/me/shares/{share_a['id']}/items/{b_feta['id']}/claim"
    assert client.delete(owner_url, headers=auth(a_owner["token"])).status_code == 404

    assert item(client.get(f"/share/{share_b['id']}").json(), "Feta")["claimed_by"] is None


def test_unknown_share_and_item_ids_are_404(client):
    share = make_share(client, signup(client, "owner_two")["token"])
    assert client.get("/share/does-not-exist").status_code == 404
    assert client.post(f"/share/{share['id']}/items/99999/claim", json={"name": "Maria"}).status_code == 404


# --- What a link reveals --------------------------------------------------------------------
def test_public_share_exposes_only_safe_fields(client):
    owner = signup(client, "chef_zoe_99")
    share = make_share(client, owner["token"])
    res = client.get(f"/share/{share['id']}")
    data = res.json()
    assert set(data) == {"id", "title", "notes", "owner_name", "recipe", "items", "updated_at"}
    assert set(data["items"][0]) == {"id", "name", "measure", "have", "claimed_by"}
    assert "chef_zoe_99" not in res.text  # the username never leaves the server


# --- Deleting an owner ----------------------------------------------------------------------
def test_admin_deleting_owner_removes_their_shares(client):
    owner = signup(client, "owner_three")
    share = make_share(client, owner["token"])
    admin = client.post("/auth/login", json={"username": "admin", "password": "admin-pass-123"}).json()["token"]
    assert client.delete(f"/admin/users/{owner['user']['id']}", headers=auth(admin)).status_code == 204
    assert client.get(f"/share/{share['id']}").status_code == 404
