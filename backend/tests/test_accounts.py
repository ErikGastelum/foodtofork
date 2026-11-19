"""Account tests (owner: Jonathan). Uses an in-memory database: nothing touches foodtofork.db."""

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import accounts
import db
import security


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(security, "ITERATIONS", 1_000)  # fast hashing for tests
    monkeypatch.setenv("ADMIN_USERNAME", "Admin")
    monkeypatch.setenv("ADMIN_PASSWORD", "admin-pass-123")
    db.configure("sqlite://")
    with db.SessionLocal() as session:
        accounts.ensure_admin(session)
    app = FastAPI()
    app.include_router(accounts.router)
    return TestClient(app)


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def signup(client, username="maika", password="pantry-pass-1", **extra):
    body = {"username": username, "password": password, "first_name": "Test", "last_name": "User", **extra}
    res = client.post("/auth/signup", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def login(client, username, password):
    return client.post("/auth/login", json={"username": username, "password": password})


# --- Sign up / sign in ----------------------------------------------------------
def test_signup_returns_token_and_user(client):
    body = signup(client, "Maika", first_name="  Maika ", last_name="Pangilinan")
    assert body["user"]["username"] == "maika"  # usernames are case-insensitive
    assert (body["user"]["first_name"], body["user"]["last_name"]) == ("Maika", "Pangilinan")
    assert body["user"]["role"] == "user"
    assert client.get("/auth/me", headers=auth(body["token"])).json()["username"] == "maika"


def test_duplicate_username_rejected(client):
    signup(client, "erik")
    res = client.post("/auth/signup", json={"username": "ERIK", "password": "another-pass", "first_name": "E", "last_name": "G"})
    assert res.status_code == 409


@pytest.mark.parametrize(
    "fields",
    [
        {"username": "ab"},
        {"username": "has space"},
        {"password": "short"},
        {"first_name": "   "},
        {"last_name": ""},
        {"first_name": None},
    ],
)
def test_signup_validation(client, fields):
    body = {"username": "jacob", "password": "long-enough", "first_name": "Jacob", "last_name": "Micu", **fields}
    body = {k: v for k, v in body.items() if v is not None}
    assert client.post("/auth/signup", json=body).status_code == 422


def test_update_names(client):
    token = signup(client, "nina")["token"]
    res = client.patch("/me", json={"first_name": "Nina", "last_name": "Lopez"}, headers=auth(token))
    assert res.status_code == 200 and res.json()["first_name"] == "Nina"
    assert client.get("/auth/me", headers=auth(token)).json()["last_name"] == "Lopez"
    assert client.patch("/me", json={"first_name": "", "last_name": "x"}, headers=auth(token)).status_code == 422


def test_login_and_wrong_password(client):
    signup(client, "jacob", "recipes-rule-1")
    assert login(client, "JACOB", "recipes-rule-1").status_code == 200
    bad = login(client, "jacob", "nope")
    missing = login(client, "nobody", "nope")
    assert bad.status_code == missing.status_code == 401
    assert bad.json() == missing.json()  # doesn't reveal which usernames exist


def test_password_is_not_stored_in_plain_text(client):
    signup(client, "jonathan", "plain-text-pass")
    with db.SessionLocal() as s:
        stored = s.query(db.User).filter_by(username="jonathan").one().password_hash
    assert "plain-text-pass" not in stored and stored.startswith("pbkdf2_sha256$")


def test_logout_kills_token(client):
    token = signup(client)["token"]
    assert client.post("/auth/logout", headers=auth(token)).status_code == 204
    assert client.get("/auth/me", headers=auth(token)).status_code == 401


def test_no_token_is_401(client):
    assert client.get("/me/kitchen").status_code == 401
    assert client.get("/auth/me", headers=auth("made-up")).status_code == 401


# --- Per-account kitchen ----------------------------------------------------------
KITCHEN = {
    "inventory": [{"barcode": "737628064502", "name": "Thai Peanut Noodle Kit", "brand": "Simply Asia", "image": None, "category": "Noodles"}],
    "grocery_list": ["Feta"],
    "saved_recipes": [{"id": "52789", "name": "Shakshuka", "thumbnail": None}],
}


def test_kitchen_saves_per_account(client):
    a = signup(client, "alice")["token"]
    b = signup(client, "bob")["token"]
    assert client.put("/me/kitchen", json=KITCHEN, headers=auth(a)).status_code == 200
    assert client.get("/me/kitchen", headers=auth(a)).json() == KITCHEN
    assert client.get("/me/kitchen", headers=auth(b)).json() == {"inventory": [], "grocery_list": [], "saved_recipes": []}


def test_kitchen_survives_sign_out_and_back_in(client):
    token = signup(client, "carol", "carol-pass-1")["token"]
    client.put("/me/kitchen", json=KITCHEN, headers=auth(token))
    client.post("/auth/logout", headers=auth(token))
    token2 = login(client, "carol", "carol-pass-1").json()["token"]
    assert client.get("/me/kitchen", headers=auth(token2)).json() == KITCHEN


def test_guest_kitchen_carried_into_new_account(client):
    token = signup(client, "dave", kitchen=KITCHEN)["token"]
    assert client.get("/me/kitchen", headers=auth(token)).json() == KITCHEN


def test_kitchen_item_needs_a_name(client):
    token = signup(client)["token"]
    res = client.put("/me/kitchen", json={"inventory": [{"barcode": "1"}]}, headers=auth(token))
    assert res.status_code == 422


# --- Own password / account -----------------------------------------------------------
def test_change_own_password_signs_out_other_devices(client):
    phone = signup(client, "gina", "first-pass-1")["token"]
    laptop = login(client, "gina", "first-pass-1").json()["token"]
    res = client.post("/me/password", json={"current_password": "first-pass-1", "new_password": "second-pass-2"}, headers=auth(laptop))
    assert res.status_code == 204
    assert client.get("/auth/me", headers=auth(laptop)).status_code == 200
    assert client.get("/auth/me", headers=auth(phone)).status_code == 401
    assert login(client, "gina", "second-pass-2").status_code == 200


def test_delete_own_account_needs_password(client):
    token = signup(client, "hank", "hank-pass-1")["token"]
    assert client.request("DELETE", "/me", json={"password": "wrong"}, headers=auth(token)).status_code == 400
    assert client.request("DELETE", "/me", json={"password": "hank-pass-1"}, headers=auth(token)).status_code == 204
    assert login(client, "hank", "hank-pass-1").status_code == 401


# --- Admin ----------------------------------------------------------------------------
def admin_token(client):
    res = login(client, "admin", "admin-pass-123")
    assert res.status_code == 200 and res.json()["user"]["role"] == "admin"
    return res.json()["token"]


def test_admin_created_from_env_once(client):
    with db.SessionLocal() as s:
        accounts.ensure_admin(s)  # second startup: no duplicate, no error
        assert s.query(db.User).filter_by(role="admin").count() == 1


def test_regular_user_cannot_use_admin_routes(client):
    token = signup(client)["token"]
    assert client.get("/admin/users", headers=auth(token)).status_code == 403
    assert client.delete("/admin/users/1", headers=auth(token)).status_code == 403


def test_admin_lists_users(client):
    t = signup(client, "ivy")["token"]
    client.put("/me/kitchen", json=KITCHEN, headers=auth(t))
    rows = client.get("/admin/users", headers=auth(admin_token(client))).json()
    ivy = next(r for r in rows if r["username"] == "ivy")
    assert ivy["pantry_items"] == 1 and ivy["saved_recipes"] == 1
    assert ivy["first_name"] == "Test" and ivy["shares"] == 0
    assert "password_hash" not in str(rows)


def test_admin_resets_password_and_signs_user_out(client):
    body = signup(client, "jack", "old-pass-123")
    res = client.post(f"/admin/users/{body['user']['id']}/password", json={"new_password": "new-pass-456"}, headers=auth(admin_token(client)))
    assert res.status_code == 204
    assert client.get("/auth/me", headers=auth(body["token"])).status_code == 401
    assert login(client, "jack", "old-pass-123").status_code == 401
    assert login(client, "jack", "new-pass-456").status_code == 200


def test_admin_deletes_user(client):
    body = signup(client, "kim", "kim-pass-123")
    admin = admin_token(client)
    assert client.delete(f"/admin/users/{body['user']['id']}", headers=auth(admin)).status_code == 204
    assert login(client, "kim", "kim-pass-123").status_code == 401
    assert client.delete(f"/admin/users/{body['user']['id']}", headers=auth(admin)).status_code == 404


def test_admin_cannot_delete_self(client):
    admin = admin_token(client)
    my_id = client.get("/auth/me", headers=auth(admin)).json()["id"]
    assert client.delete(f"/admin/users/{my_id}", headers=auth(admin)).status_code == 400


# --- Database URL handling --------------------------------------------------------------
@pytest.mark.parametrize(
    "given,expected",
    [
        ("postgres://u:p@host/db", "postgresql+psycopg://u:p@host/db"),
        ("postgresql://u:p@host/db?sslmode=require", "postgresql+psycopg://u:p@host/db?sslmode=require"),
        ("sqlite:///x.db", "sqlite:///x.db"),
    ],
)
def test_normalize_url(given, expected):
    assert db.normalize_url(given) == expected
