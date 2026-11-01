import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import recipes
from matching import score

SAMPLE = [
    {"id": "1", "name": "Shakshuka", "thumbnail": "t1", "category": "x", "area": "y",
     "instructions": "cook", "ingredients": [{"name": "Eggs", "measure": "2"},
                                            {"name": "Tomatoes", "measure": "3"},
                                            {"name": "Feta", "measure": "1"}]},
    {"id": "2", "name": "Eggplant Bake", "thumbnail": "t2", "category": "x", "area": "y",
     "instructions": "bake", "ingredients": [{"name": "Eggplant", "measure": "1"}]},
]


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(recipes, "RECIPES", SAMPLE)
    monkeypatch.setattr(recipes, "BY_ID", {r["id"]: r for r in SAMPLE})
    app = FastAPI()
    app.include_router(recipes.router)
    return TestClient(app)


def test_full_match():
    assert score(["Eggs", "Feta"], ["eggs", "feta"]) == (100, ["Eggs", "Feta"], [])


def test_partial_match_and_plurals():
    assert score(["Eggs", "Tomatoes", "Feta"], ["egg", "tomato"]) == (67, ["Eggs", "Tomatoes"], ["Feta"])


def test_egg_does_not_match_eggplant():
    assert score(["Eggplant"], ["egg"])[0] == 0


def test_match_endpoint_ranks_and_excludes_zero(client):
    body = client.post("/match", json={"inventory": ["eggs", "tomatoes"]}).json()
    assert [r["id"] for r in body] == ["1"]
    assert body[0]["match"] == 67 and body[0]["missing"] == ["Feta"]
    assert body[0]["owned"] == ["Eggs", "Tomatoes"] and body[0]["category"] == "x"


def test_match_limit_and_min_match(client):
    assert client.post("/match", json={"inventory": ["eggs"], "min_match": 90}).json() == []
    assert len(client.post("/match", json={"inventory": ["eggs", "eggplant"], "limit": 1}).json()) == 1


def test_empty_inventory_rejected(client):
    assert client.post("/match", json={"inventory": []}).status_code == 422


def test_recipe_detail_and_404(client):
    assert client.get("/recipes/1").json()["name"] == "Shakshuka"
    assert client.get("/recipes/999").status_code == 404