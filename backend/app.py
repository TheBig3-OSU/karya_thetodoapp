"""Karya API — FastAPI app over the Supabase Postgres models in db/.

Run locally from the backend/ directory:

    uvicorn app:app --reload --port 8000

Requires DATABASE_URL in the repo-root .env (see .env.example).
Interactive API docs are served at http://localhost:8000/docs.
"""

import os
from typing import Optional

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import get_db
from db.models import Task
from routers import auth, tasks, teams, users

app = FastAPI(
    title="Karya API",
    description="RPG to-do app — quests (Sadhana), ganas (teams), XP & vouching.",
    version="0.1.0",
)

# Extra allowed origins beyond the defaults, comma-separated
# (e.g. a custom staging/production domain).
_extra_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", *_extra_origins],
    # Vercel gives every deployment (production, staging branch, PR
    # previews) a generated *.vercel.app domain.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(teams.router)
app.include_router(tasks.router)
app.include_router(users.router)


@app.get("/", tags=["health"])
async def root():
    return {"app": "Karya API", "status": "ok"}


@app.get("/health", tags=["health"])
async def health() -> dict:
    return {"ok": True}


# The current frontend (frontend/src/lib/api.ts) fetches /api/tasks with no
# auth; keep this read-only alias until it adopts /auth + GET /tasks.
class LegacyTaskOut(BaseModel):
    """Shape of a task as returned to the frontend."""

    task_id: int
    title: str
    description: Optional[str]
    is_completed: bool
    xp: int

    model_config = {"from_attributes": True}


@app.get("/api/tasks", response_model=list[LegacyTaskOut], tags=["legacy"])
async def legacy_list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    return list(result.scalars().all())
