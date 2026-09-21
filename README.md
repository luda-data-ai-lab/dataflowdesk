# DataFlowDesk

Web application for managing system-to-system interfaces (MES/ERP integration landscape).
Replaces Excel-based tracking with a database, searchable UI, an IFSYS-centred topology
diagram, a dashboard, automatic change history and JWT-authenticated user accounts.
See [SPEC.md](SPEC.md) for the product specification and [DEVIN.md](DEVIN.md) for the
development plan.

## Tech stack

- Backend: FastAPI (Python 3.11+), SQLAlchemy 2.0 async, Alembic, openpyxl, python-jose (JWT), passlib/bcrypt
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
python seed.py                # initial admin account (+ sample systems / interfaces)
uvicorn app.main:app --reload --port 8000

# frontend (second terminal)
cd frontend
npm install
npm run dev                   # http://localhost:5173
```

API docs: http://localhost:8000/docs

Log in at http://localhost:5173/login with the seeded admin account — `admin` / `admin1234`
by default (`ADMIN_USERNAME` / `ADMIN_PASSWORD` in `.env`, applied only when the user does not
exist yet). Change the password after first login via 사용자 관리, and set a long random
`JWT_SECRET` before exposing the server.

## Switching database

Edit `DB_TYPE` in `.env` (`sqlite` | `postgresql` | `mssql`) and fill in the `DB_*` values,
or set `DATABASE_URL` directly. Then run `alembic upgrade head` again.

## IFSYS (EAI hub) and the topology view

Interfaces may optionally route through an intermediate system (`via_system_id`, Excel column
`경유시스템`). The seed registers `IFSYS` (type `EAI`) as that hub. `구성도` (`/topology`,
`GET /api/topology`) draws IFSYS in the centre; routed interfaces render as `source → IFSYS →
target`, direct interfaces (no via system) as `source → target`. Sites without an EAI simply
leave `경유시스템` empty.

## Dashboard

`/dashboard` (the landing page) shows stat cards and Recharts charts fed by
`GET /api/dashboard/{summary,by-system,by-type,by-cycle}`, plus the 구성도 embedded. Bars, slices
and cards link to the pre-filtered interface list (`/interfaces?system=…&integration_type=…&cycle=…`).

## Customer branding

`설정` (`/settings`) lets each customer upload a company logo (PNG/JPEG/GIF/WebP/SVG, ≤1 MB)
and set a company name / tagline. The logo is stored in the database (`branding` table) and
shown at the top of the sidebar; no rebuild or restart is needed. API:
`GET/PUT /api/settings/branding`, `POST/DELETE /api/settings/branding/logo`.

## Authentication and roles

Every `/api/*` endpoint except `/api/health`, `/api/auth/*` and `GET /api/settings/branding`
requires `Authorization: Bearer <access token>`. `POST /api/auth/login` returns an access token
(`JWT_ACCESS_TOKEN_MINUTES`, default 30) and a refresh token (`JWT_REFRESH_TOKEN_DAYS`, default 7);
the frontend stores both in `localStorage`, retries once through `POST /api/auth/refresh` on 401
and redirects to `/login` when that fails.

- `admin` — everything, plus 사용자 관리 (`/api/users`: list / create / edit / role change /
  deactivate / activate). An admin cannot demote or deactivate their own account.
- `user` — all interface / system / topology / dashboard / 변경 이력 features.

Passwords are stored as bcrypt hashes and never returned by the API.

## Change history (변경 이력)

Every CREATE / UPDATE / DELETE of a system or interface is written to `change_log` in the same
transaction (SQLAlchemy flush listeners in `backend/app/services/audit.py`): one row per changed
field on update, one JSON snapshot row on create / delete, tagged with the acting user. System
passwords are recorded as `***`. `GET /api/changelog` filters by table, action, user, record and
date range; `GET /api/changelog/export` downloads the filtered log as xlsx. The dashboard card
"최근 7일 변경" counts these rows.

## Development

```bash
pip install pre-commit && pre-commit install
cd backend && pytest
cd frontend && npm run lint && npm run typecheck
```
