"""Permission and session tests (owner: Jacob). In-memory database: nothing touches foodtofork.db."""

from datetime import timedelta

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


def make_user(client, username, password="user-pass-123"):
    body = {"username": username, "password": password, "first_name": "Test", "last_name": "User"}
    res = client.post("/auth/signup", json=body)
    assert res.status_code == 201, res.text
    return res.json()


def login(client, username, password):
    return client.post("/auth/login", json={"username": username, "password": password})


def admin_token(client):
    res = login(client, "admin", "admin-pass-123")
    assert res.status_code == 200
    return res.json()["token"]


# --- Who can reach admin routes ----------------------------------------------------
@pytest.mark.parametrize(
    "method,path,body",
    [
        ("GET", "/admin/users", None),
        ("POST", "/admin/users/1/password", {"new_password": "whatever-123"}),
        ("DELETE", "/admin/users/1", None),
    ],
)
def test_admin_routes_need_sign_in(client, method, path, body):
    assert client.request(method, path, json=body).status_code == 401


def test_signup_cannot_choose_a_role(client):
    res = client.post(
        "/auth/signup",
        json={"username": "sneaky", "password": "sneaky-pass-1", "first_name": "S", "last_name": "N", "role": "admin"},
    )
    assert res.status_code == 201
    assert res.json()["user"]["role"] == "user"
    assert client.get("/admin/users", headers=auth(res.json()["token"])).status_code == 403


def test_user_cannot_reset_or_delete_other_accounts(client):
    victim = make_user(client, "victim", "victim-pass-1")
    attacker = make_user(client, "attacker", "attacker-pass-1")
    headers = auth(attacker["token"])
    victim_id = victim["user"]["id"]

    reset = client.post(f"/admin/users/{victim_id}/password", json={"new_password": "hijacked-pass-1"}, headers=headers)
    assert reset.status_code == 403
    assert client.delete(f"/admin/users/{victim_id}", headers=headers).status_code == 403

    # Nothing changed for the victim.
    assert login(client, "victim", "victim-pass-1").status_code == 200
    assert login(client, "victim", "hijacked-pass-1").status_code == 401
    assert client.get("/auth/me", headers=auth(victim["token"])).status_code == 200


# --- Sessions ----------------------------------------------------------------------
def test_token_stops_working_when_admin_deletes_the_account(client):
    body = make_user(client, "gone")
    res = client.delete(f"/admin/users/{body['user']['id']}", headers=auth(admin_token(client)))
    assert res.status_code == 204
    assert client.get("/auth/me", headers=auth(body["token"])).status_code == 401


def test_token_stops_working_when_user_deletes_own_account(client):
    body = make_user(client, "leaver", "leaver-pass-1")
    res = client.request("DELETE", "/me", json={"password": "leaver-pass-1"}, headers=auth(body["token"]))
    assert res.status_code == 204
    assert client.get("/auth/me", headers=auth(body["token"])).status_code == 401


def test_expired_token_is_rejected_and_cleaned_up(client):
    token = make_user(client, "stale")["token"]
    with db.SessionLocal() as s:
        s.query(db.AuthToken).update({"expires_at": db.now() - timedelta(days=1)})
        s.commit()
    assert client.get("/auth/me", headers=auth(token)).status_code == 401
    with db.SessionLocal() as s:
        assert s.query(db.AuthToken).count() == 0


def test_wrong_current_password_does_not_change_password(client):
    token = make_user(client, "careful", "careful-pass-1")["token"]
    res = client.post(
        "/me/password",
        json={"current_password": "not-my-password", "new_password": "brand-new-pass-2"},
        headers=auth(token),
    )
    assert res.status_code == 400
    assert login(client, "careful", "careful-pass-1").status_code == 200
    assert login(client, "careful", "brand-new-pass-2").status_code == 401
