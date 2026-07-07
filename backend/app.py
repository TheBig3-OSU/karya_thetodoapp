"""Karya API — FastAPI application.

Run locally from the backend/ directory:

    uvicorn app:app --reload --port 8000

Requires DATABASE_URL in backend/.env (see .env.example).
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

app = FastAPI(title="Karya API")

# Extra allowed origins beyond the defaults, comma-separated
# (e.g. a custom staging/production domain).
_extra_origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", *_extra_origins],
    # Vercel gives every deployment (production, staging branch, PR
    # previews) a generated *.vercel.app domain.
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TaskOut(BaseModel):
    """Shape of a task as returned to the frontend."""

    task_id: int
    title: str
    description: Optional[str]
    is_completed: bool
    xp: int

    model_config = {"from_attributes": True}


@app.get("/health")
async def health() -> dict:
    return {"ok": True}


@app.get("/api/tasks", response_model=list[TaskOut])
async def list_tasks(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Task).order_by(Task.created_at.desc()))
    return list(result.scalars().all())
