# Karya — The Todo App

Team-based todo app with XP and leveling.

**Stack:** React 18 + TypeScript + Vite (`frontend/`) · FastAPI + SQLAlchemy (`backend/`) · Supabase Postgres.

## Local development

### Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # paste your Supabase Session pooler DATABASE_URL
uvicorn app:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- DB connectivity check: `python -m db.check_db`
- Tests / lint: `pytest tests/ -v` · `flake8 . --max-line-length=120`

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local   # points VITE_API_URL at localhost:8000
npm run dev
```

- App: http://localhost:5173
- Tests / lint / types: `npm test` · `npm run lint` · `npm run type-check`

## Branches & deployment

| Branch    | Purpose     | Deploys to                                  |
| --------- | ----------- | ------------------------------------------- |
| `main`    | production  | Vercel production URL                        |
| `staging` | integration | Vercel branch preview (stable staging link)  |
| PRs       | review      | Vercel per-PR preview URL                    |

Flow: feature branch → PR into `staging` → merge `staging` into `main` to ship.
CI (lint + tests + build for both halves) runs on every PR and non-main push.

- **Frontend** deploys on Vercel. Project settings: Root Directory = `frontend`,
  framework = Vite, production branch = `main`. Set `VITE_API_URL` per
  environment (Production and Preview) in the Vercel dashboard.
- **Backend** deploys on Railway/Render (root directory `backend`, start
  command `uvicorn app:app --host 0.0.0.0 --port $PORT`). Set `DATABASE_URL`
  (Supabase Session pooler string) in the platform's env settings. CORS
  already allows `localhost:5173` and `*.vercel.app`; add custom domains via
  `ALLOWED_ORIGINS`.
- **Database** is Supabase-hosted Postgres; the schema source of truth is
  [backend/db/schema.sql](backend/db/schema.sql).
