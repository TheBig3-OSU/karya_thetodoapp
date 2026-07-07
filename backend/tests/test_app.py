import os

# db.database refuses to import without DATABASE_URL; the engine is created
# lazily, so a placeholder is enough for tests that never touch the DB.
os.environ.setdefault(
    "DATABASE_URL", "postgresql://user:pass@localhost:5432/karya_test"
)

from fastapi.testclient import TestClient  # noqa: E402

from app import app  # noqa: E402
from db.database import get_db  # noqa: E402


class _FakeResult:
    def scalars(self):
        return self

    def all(self):
        return []


class _FakeSession:
    async def execute(self, *args, **kwargs):
        return _FakeResult()


async def _override_get_db():
    yield _FakeSession()


app.dependency_overrides[get_db] = _override_get_db

client = TestClient(app)


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"ok": True}


def test_list_tasks_returns_empty_list():
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == []


def test_cors_allows_vercel_origins():
    origin = "https://karya-git-staging-thebig3.vercel.app"
    response = client.get("/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin


def test_cors_allows_local_dev_origin():
    origin = "http://localhost:5173"
    response = client.get("/health", headers={"Origin": origin})
    assert response.headers["access-control-allow-origin"] == origin
