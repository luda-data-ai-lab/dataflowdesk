# I/F Manager

Web application for managing system-to-system interfaces (MES/ERP integration landscape).
Replaces Excel-based tracking with a database, searchable UI and dashboard.
See [SPEC.md](SPEC.md) for the product specification and [DEVIN.md](DEVIN.md) for the
development plan.

## Tech stack

- Backend: FastAPI (Python 3.11+), SQLAlchemy 2.0 async, Alembic, openpyxl
- Frontend: React 18 + TypeScript + Vite + Tailwind CSS
- Databases: SQLite (default), PostgreSQL 15, MS SQL Server — selected with `DB_TYPE`

## Quick start (standalone)

```bash
cp .env.example .env

# backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head          # creates ./data/ifmanager.db
python seed.py                # optional: sample systems + interfaces
uvicorn app.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

API docs: http://localhost:8000/docs

## Switching database

Edit `DB_TYPE` in `.env` (`sqlite` | `postgresql` | `mssql`) and fill in the `DB_*` values,
or set `DATABASE_URL` directly. Then run `alembic upgrade head` again.

## Development

```bash
pip install pre-commit && pre-commit install
cd backend && pytest
cd frontend && npm run lint && npm run typecheck
```
