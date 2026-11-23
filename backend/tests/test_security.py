"""Unit tests for password hashing and random tokens (owner: Jacob)."""

import re

import pytest

import security


@pytest.fixture(autouse=True)
def fast_hashing(monkeypatch):
    monkeypatch.setattr(security, "ITERATIONS", 1_000)


def test_hash_round_trip():
    stored = security.hash_password("correct horse")
    assert stored.startswith("pbkdf2_sha256$1000$")
    assert security.verify_password("correct horse", stored)
    assert not security.verify_password("wrong horse", stored)
    assert "correct horse" not in stored


def test_same_password_gets_different_hashes():
    # Random salt per hash: two users with the same password don't share a stored value.
    assert security.hash_password("same-pass-1") != security.hash_password("same-pass-1")


def test_verify_uses_the_iterations_stored_in_the_hash(monkeypatch):
    stored = security.hash_password("keep-me-1234")
    monkeypatch.setattr(security, "ITERATIONS", 2_000)  # raising the setting later must not lock people out
    assert security.verify_password("keep-me-1234", stored)


@pytest.mark.parametrize(
    "stored",
    ["", "garbage", "pbkdf2_sha256$1$a", "md5$1000$c2FsdA==$aGFzaA==", "a$b$c$d$e"],
)
def test_verify_rejects_malformed_or_other_algorithms(stored):
    assert security.verify_password("anything", stored) is False


def test_session_tokens_are_long_and_unique():
    tokens = {security.new_token() for _ in range(200)}
    assert len(tokens) == 200
    assert all(len(t) == 43 and re.fullmatch(r"[A-Za-z0-9_-]+", t) for t in tokens)


def test_hash_token_is_stable_and_is_not_the_token():
    token = security.new_token()
    assert security.hash_token(token) == security.hash_token(token)
    assert security.hash_token(token) != token
    assert re.fullmatch(r"[0-9a-f]{64}", security.hash_token(token))


def test_share_ids_are_unique_and_url_safe():
    ids = {security.new_share_id() for _ in range(500)}
    assert len(ids) == 500
    assert all(re.fullmatch(r"[A-Za-z0-9_-]{16}", i) for i in ids)
