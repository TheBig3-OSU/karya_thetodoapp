"""CI-safe API tests: no database required.

A dummy DATABASE_URL lets the app import in CI; async sessions are lazy, so
requests that fail validation/auth before touching the DB work fine.
"""

import os

os.environ.setdefault(
    "DATABASE_URL", "postgresql+asyncpg://karya:karya@localhost:5432/karya_test"
)

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from security import create_token, decode_token, hash_password, verify_password  # noqa: E402
from services import generate_invite_code  # noqa: E402

client = TestClient(app)


def test_root_health():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_spec_routes_registered():
    paths = set(client.get("/openapi.json").json()["paths"])
    for expected in [
        "/auth/register",
        "/auth/login",
        "/auth/me",
        "/teams",
        "/teams/join",
        "/teams/{team_id}",
        "/teams/{team_id}/members",
        "/teams/{team_id}/members/{user_id}",
        "/teams/{team_id}/categories",
        "/teams/{team_id}/feed",
        "/teams/{team_id}/leaderboard",
        "/tasks",
        "/tasks/{task_id}",
        "/tasks/{task_id}/complete",
        "/tasks/{task_id}/vouch",
        "/tasks/{task_id}/thread",
        "/tasks/{task_id}/attachments",
        "/tasks/{task_id}/attachments/{attachment_id}",
        "/tasks/{task_id}/reactions",
        "/tasks/{task_id}/reactions/{emoji}",
        "/users/{user_id}",
        "/users/{user_id}/xp",
    ]:
        assert expected in paths, f"missing route: {expected}"


def test_register_rejects_short_password():
    response = client.post(
        "/auth/register", json={"username": "hero", "password": "short"}
    )
    assert response.status_code == 422


def test_register_rejects_bad_username():
    response = client.post(
        "/auth/register", json={"username": "no spaces!", "password": "longenough8"}
    )
    assert response.status_code == 422


def test_protected_route_requires_token():
    assert client.get("/auth/me").status_code == 401
    assert client.get("/tasks").status_code == 401


def test_invalid_token_rejected():
    response = client.get(
        "/auth/me", headers={"Authorization": "Bearer not-a-real-token"}
    )
    assert response.status_code == 401


def test_password_hash_roundtrip():
    stored = hash_password("s3cret-pass")
    assert stored.startswith("pbkdf2_sha256$")
    assert verify_password("s3cret-pass", stored)
    assert not verify_password("wrong-pass", stored)


def test_verify_password_handles_malformed_hash():
    assert not verify_password("anything", "$2b$12$Dev0nlyFakeHash")


def test_token_roundtrip():
    assert decode_token(create_token(42)) == 42
    assert decode_token("garbage") is None


def test_invite_code_format():
    code = generate_invite_code("Vajra")
    prefix, suffix = code.split("-")
    assert prefix == "VAJRA"
    assert len(suffix) == 3
