"""Sharing a saved recipe (owner: Jonathan): title/notes, grocery list, claims by people without accounts."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import accounts
import db
import recipes
import security
import shares

SHAKSHUKA = {
    "id": "52789", "name": "Shakshuka", "thumbnail": "t.jpg", "category": "Vegetarian", "area": "Egyptian",
    "instructions": "cook",
    "ingredients": [
        {"name": "Eggs", "measure": "4"},
        {"name": "Tomatoes", "measure": "400g"},
        {"name": "Feta", "measure": "50g"},
        {"name": "Feta", "measure": "to serve"},  # TheMealDB sometimes repeats one
        {"name": "Cumin", "measure": "1 tsp"},
    ],
}


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(security, "ITERATIONS", 1_000)
    monkeypatch.setattr(recipes, "BY_ID", {"52789": SHAKSHUKA})
    db.configure("sqlite://")
    app = FastAPI()
    app.include_router(accounts.router)
    app.include_router(shares.router)
    return TestClient(app)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def owner(client):
    body = client.post("/auth/signup", json={
        "username": "jonathan", "password": "jonathan-pass", "first_name": "Jonathan", "last_name": "Torres",
        "kitchen": {"inventory": [{"name": "Large Eggs"}, {"name": "Roma Tomatoes"}], "grocery_list": [],
                    "saved_recipes": [{"id": "52789", "name": "Shakshuka"}]},
    }).json()
    return body["token"]


def make_share(client, token, **extra):
    res = client.post("/me/shares", json={"recipe_id": "52789", "title": "Saturday Dinner", "notes": "6pm at Mom's", **extra}, headers=auth(token))
    assert res.status_code == 201, res.text
    return res.json()


def item(share, name):
    return next(i for i in share["items"] if i["name"] == name)


def test_share_lists_what_owner_has_and_still_needs(client, owner):
    share = make_share(client, owner)
    assert share["title"] == "Saturday Dinner" and share["notes"] == "6pm at Mom's"
    assert share["owner_name"] == "Jonathan T."
    assert share["recipe"] == {"id": "52789", "name": "Shakshuka", "thumbnail": "t.jpg"}
    assert [i["name"] for i in share["items"]] == ["Eggs", "Tomatoes", "Feta", "Cumin"]  # Feta once
    assert [i["name"] for i in share["items"] if not i["have"]] == ["Feta", "Cumin"]


def test_anyone_can_view_without_account(client, owner):
    share = make_share(client, owner)
    res = client.get(f"/share/{share['id']}")
    assert res.status_code == 200 and res.json()["title"] == "Saturday Dinner"
    assert "password" not in res.text and "jonathan-pass" not in res.text


def test_guest_claims_missing_ingredient(client, owner):
    share = make_share(client, owner)
    feta = item(share, "Feta")
    res = client.post(f"/share/{share['id']}/items/{feta['id']}/claim", json={"name": "  Aunt   Maria "})
    assert res.status_code == 200
    assert item(res.json(), "Feta")["claimed_by"] == "Aunt Maria"
    # the owner sees it too
    mine = client.get("/me/shares", headers=auth(owner)).json()[0]
    assert item(mine, "Feta")["claimed_by"] == "Aunt Maria"


def test_first_claim_wins(client, owner):
    share = make_share(client, owner)
    cumin = item(share, "Cumin")
    url = f"/share/{share['id']}/items/{cumin['id']}/claim"
    assert client.post(url, json={"name": "Maria"}).status_code == 200
    assert client.post(url, json={"name": "maria"}).status_code == 200  # same person again: fine
    res = client.post(url, json={"name": "Tio Luis"})
    assert res.status_code == 409 and "Maria" in res.json()["detail"]


def test_cannot_claim_what_owner_has(client, owner):
    share = make_share(client, owner)
    eggs = item(share, "Eggs")
    assert client.post(f"/share/{share['id']}/items/{eggs['id']}/claim", json={"name": "Maria"}).status_code == 400


def test_only_claimer_can_undo(client, owner):
    share = make_share(client, owner)
    feta = item(share, "Feta")
    client.post(f"/share/{share['id']}/items/{feta['id']}/claim", json={"name": "Maria"})
    undo = f"/share/{share['id']}/items/{feta['id']}/unclaim"
    assert client.post(undo, json={"name": "Luis"}).status_code == 403
    res = client.post(undo, json={"name": "MARIA"})
    assert res.status_code == 200 and item(res.json(), "Feta")["claimed_by"] is None


def test_claim_name_required(client, owner):
    share = make_share(client, owner)
    feta = item(share, "Feta")
    assert client.post(f"/share/{share['id']}/items/{feta['id']}/claim", json={"name": "   "}).status_code == 422


def test_owner_edits_title_and_notes(client, owner):
    share = make_share(client, owner)
    res = client.patch(f"/me/shares/{share['id']}", json={"title": "Sunday Brunch"}, headers=auth(owner))
    assert res.json()["title"] == "Sunday Brunch" and res.json()["notes"] == "6pm at Mom's"
    assert client.patch(f"/me/shares/{share['id']}", json={"title": "  "}, headers=auth(owner)).status_code == 422


def test_owner_clears_a_claim(client, owner):
    share = make_share(client, owner)
    feta = item(share, "Feta")
    client.post(f"/share/{share['id']}/items/{feta['id']}/claim", json={"name": "Maria"})
    res = client.delete(f"/me/shares/{share['id']}/items/{feta['id']}/claim", headers=auth(owner))
    assert item(res.json(), "Feta")["claimed_by"] is None


def test_refresh_from_pantry_keeps_claims(client, owner):
    share = make_share(client, owner)
    feta = item(share, "Feta")
    client.post(f"/share/{share['id']}/items/{feta['id']}/claim", json={"name": "Maria"})
    kitchen = client.get("/me/kitchen", headers=auth(owner)).json()
    kitchen["inventory"].append({"name": "Ground Cumin"})
    client.put("/me/kitchen", json=kitchen, headers=auth(owner))
    res = client.post(f"/me/shares/{share['id']}/refresh", headers=auth(owner)).json()
    assert item(res, "Cumin")["have"] is True
    assert item(res, "Feta")["claimed_by"] == "Maria"


def test_one_share_per_recipe(client, owner):
    make_share(client, owner)
    res = client.post("/me/shares", json={"recipe_id": "52789", "title": "Again"}, headers=auth(owner))
    assert res.status_code == 409


def test_unknown_recipe_and_title_required(client, owner):
    assert client.post("/me/shares", json={"recipe_id": "999", "title": "X"}, headers=auth(owner)).status_code == 404
    assert client.post("/me/shares", json={"recipe_id": "52789", "title": " "}, headers=auth(owner)).status_code == 422


def test_stop_sharing_kills_link(client, owner):
    share = make_share(client, owner)
    assert client.delete(f"/me/shares/{share['id']}", headers=auth(owner)).status_code == 204
    assert client.get(f"/share/{share['id']}").status_code == 404


def test_cannot_touch_someone_elses_share(client, owner):
    share = make_share(client, owner)
    other = client.post("/auth/signup", json={"username": "other", "password": "other-pass", "first_name": "O", "last_name": "P"}).json()["token"]
    assert client.patch(f"/me/shares/{share['id']}", json={"title": "Mine now"}, headers=auth(other)).status_code == 404
    assert client.delete(f"/me/shares/{share['id']}", headers=auth(other)).status_code == 404
    assert client.get("/me/shares", headers=auth(other)).json() == []


def test_deleting_account_removes_its_shares(client, owner):
    share = make_share(client, owner)
    client.request("DELETE", "/me", json={"password": "jonathan-pass"}, headers=auth(owner))
    assert client.get(f"/share/{share['id']}").status_code == 404


def test_old_local_database_gives_clear_message(tmp_path):
    import sqlite3
    path = tmp_path / "old.db"
    con = sqlite3.connect(path)
    con.execute("CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, share_id TEXT)")
    con.close()
    with pytest.raises(RuntimeError, match="delete backend/foodtofork.db"):
        db.configure(f"sqlite:///{path}")
