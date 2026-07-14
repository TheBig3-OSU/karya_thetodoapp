"""Karya API — FastAPI app over the Supabase Postgres models in db/.

Run from backend/:  uvicorn app:app --reload
Docs at /docs (Swagger) and /redoc.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import auth, tasks, teams, users

app = FastAPI(
    title="Karya API",
    description="RPG to-do app — quests (Sadhana), ganas (teams), XP & vouching.",
    version="0.1.0",
)

# The Vite dev server origin; tighten when a real domain exists.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
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
