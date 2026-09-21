# I/F Manager — Devin Development Instructions

**Companion to:** `SPEC.md`
**Audience:** Devin (autonomous coding agent)
**Repository:** `if-manager` — brand-new independent repo, built entirely from scratch.

---

## 0. Ground Rules

1. **Read `SPEC.md` first.** Everything below assumes you have read it end-to-end. If any instruction here conflicts with SPEC.md, stop and ask.
2. **Sequential phases.** Do not begin Phase N+1 until Phase N's exit criterion is met and I have signed off. Merging Phase 2 work into a Phase 1 PR will be rejected.
3. **Small PRs.** One coherent slice per PR. Every PR must have: description of what changed, how it was tested, a screenshot or terminal recording of it working, and an updated CHANGELOG entry.
4. **No hidden magic.** Configuration (Excel column mappings, system type enums, chart colors) lives in config files or constants modules — not scattered across logic code. I need to be able to read and edit them without digging through source.
5. **Ask before you invent.** If a requirement is ambiguous, open a question in the PR description or in a `QUESTIONS.md` file at the repo root. Do not silently choose.

---

## Part A — Knowledge

### A1. Tech Stack

> **Trigger:** when deciding which library or framework to use.
>
> - **Frontend:** React 18 + TypeScript + Tailwind CSS + Vite
> - **Charts:** Recharts (Bar, Pie, Donut) + D3.js (force-directed topology graph only)
> - **Backend:** FastAPI (Python 3.11+), async
> - **ORM:** SQLAlchemy 2.0 (async mode)
> - **Migrations:** Alembic
> - **DB:** Multi-backend via SQLAlchemy dialect:
>   - SQLite (default for dev — zero setup)
>   - PostgreSQL 15 (recommended for production)
>   - MS SQL Server (for enterprise/manufacturing IT environments)
>   - Controlled by `DB_TYPE` env var. See SPEC.md §3.0 for connection strings.
> - **Excel:** openpyxl (read/write)
> - **Auth:** JWT via python-jose + passlib[bcrypt]
> - **Deployment:** Standalone (`uvicorn` + `npm run dev`) is the primary mode. Docker Compose is optional — provide the config but do not assume it is the only way to run the app.
> - **Code quality:** ESLint + Prettier (frontend), Black + isort (backend), pytest (backend)
>
> The owner is a data scientist, not a full-stack engineer. Prefer boring, well-documented choices over cutting-edge ones.

### A2. Repository Structure

> **Trigger:** when scaffolding the repo or creating new files.
>
> ```
> if-manager/
> ├── README.md
> ├── SPEC.md
> ├── DEVIN.md
> ├── CHANGELOG.md
> ├── QUESTIONS.md
> ├── docker-compose.yml        # Optional — for containerized deployment
> ├── .env.example
> ├── data/                      # SQLite DB file lives here (gitignored)
> ├── frontend/
> │   ├── package.json
> │   ├── tsconfig.json
> │   ├── vite.config.ts
> │   ├── tailwind.config.js
> │   └── src/
> │       ├── main.tsx
> │       ├── App.tsx
> │       ├── api/               # Axios instance, API call functions
> │       ├── components/
> │       │   ├── layout/        # GNB, Sidebar, PageLayout
> │       │   ├── common/        # DataTable, Modal, SearchFilter, FileUpload
> │       │   ├── dashboard/     # ChartCard, TopologyGraph, StatCard
> │       │   └── forms/         # SystemForm, InterfaceForm
> │       ├── pages/
> │       │   ├── DashboardPage.tsx
> │       │   ├── InterfaceListPage.tsx
> │       │   ├── SystemManagePage.tsx
> │       │   ├── ChangeLogPage.tsx
> │       │   ├── UserManagePage.tsx
> │       │   └── LoginPage.tsx
> │       ├── hooks/             # useAuth, usePagination, useFilter
> │       ├── types/             # TypeScript interfaces
> │       └── utils/             # date format, Excel download helpers
> └── backend/
>     ├── requirements.txt
>     ├── Dockerfile
>     ├── alembic.ini
>     ├── alembic/
>     └── app/
>         ├── main.py
>         ├── config.py          # env vars (DB URL, JWT secret, etc.)
>         ├── database.py        # SQLAlchemy engine + session
>         ├── models/
>         │   ├── system.py
>         │   ├── interface.py
>         │   ├── upload_history.py
>         │   ├── change_log.py
>         │   └── user.py
>         ├── schemas/           # Pydantic request/response schemas
>         ├── routers/
>         │   ├── systems.py
>         │   ├── interfaces.py
>         │   ├── dashboard.py
>         │   ├── upload.py
>         │   ├── changelog.py
>         │   └── auth.py
>         ├── services/
>         │   ├── excel_parser.py
>         │   └── changelog_service.py
>         ├── middleware/
>         │   └── audit.py       # SQLAlchemy event listeners for change_log
>         └── tests/
>             ├── conftest.py
>             ├── test_systems.py
>             ├── test_interfaces.py
>             ├── test_upload.py
>             ├── test_dashboard.py
>             ├── test_changelog.py
>             └── test_auth.py
> ```

### A3. Excel Template Structure

> **Trigger:** when implementing Excel upload/download or template generation.
>
> The `.xlsx` template has exactly two sheets:
>
> **Sheet 1: "인터페이스 리스트"**
> Headers (row 1): 인터페이스 ID | 인터페이스 이름 | 연동방식 | 인터페이스 Process | 소스시스템 | 타켓시스템 | 연동주기 | 인터페이스설명
>
> **Sheet 2: "시스템 연동정보"**
> Headers (row 1): 번호 | 구분 | Type | 시스템명 | 시스템코드 | IP | Port | 계정 | 패스워드 | 제품명 | 시스템 설명
>
> Column names must match exactly (Korean, including spacing). The parser maps these headers to DB fields. See SPEC.md §7 for sample data rows.
>
> Upload validation rules (SPEC.md §2.2):
> - Required columns present
> - interface_id uniqueness
> - source/target system_code exists in systems table
> - Empty required fields → skip row, collect error
> - Return: `{success_count, skipped_count, errors: [{row, field, reason}]}`

### A4. Password Handling

> **Trigger:** when implementing system CRUD or the systems form.
>
> **Decision pending** (see SPEC.md §3.1): system connection passwords are either AES-256 encrypted in the DB or stored outside the DB entirely (env vars / secrets manager). Until James decides:
> - Implement AES-256 encryption as the default path.
> - Encryption key from environment variable `SYSTEM_PASSWORD_KEY`.
> - UI: password field masked with `•••••`, click-to-toggle reveal.
> - API: password never returned in list responses. Only in detail response with explicit `?include_password=true` query param, and only to admin role.
> - Note in `QUESTIONS.md` that this decision is pending confirmation.

---

## Part B — Playbooks

### `!phase1-foundation`

> **Trigger:** Phase 1 kickoff — repo scaffolding, DB, CRUD, Excel upload/download, basic UI.

**Procedure:**

1. Read SPEC.md §1–4 and §6–7. Scaffold the repo layout from Knowledge A2.
2. Set up tooling: ESLint + Prettier for frontend, Black + isort + pytest for backend, `.pre-commit-config.yaml`.
3. `.env.example` with all required vars. `DB_TYPE` defaults to `sqlite`. Provide connection string examples for all three backends (SQLite, PostgreSQL, MSSQL).
4. Database abstraction: `config.py` reads `DB_TYPE` and builds the appropriate SQLAlchemy URL. `database.py` creates the engine accordingly (async for PostgreSQL/MSSQL, sync-wrapped for SQLite).
5. Alembic init. Create all 5 tables from SPEC.md §3.1 as the initial migration. Verify migration runs on SQLite (default) and PostgreSQL. MSSQL migration is a stretch goal — document any dialect-specific issues in `QUESTIONS.md`.
6. Backend: implement all endpoints from SPEC.md §4.1 (Systems), §4.2 (Interfaces), §4.3 (Upload/Export).
    - Systems CRUD with delete-protection (reject if referenced by any interface).
    - Interfaces CRUD with FK validation (source/target must exist).
    - Excel template download — use openpyxl to generate a `.xlsx` with the exact headers from Knowledge A3.
    - Excel upload — parse, validate per A3 rules, return result report.
    - Excel export — dump current data to `.xlsx`.
    - Upload history recording.
7. Frontend: Sidebar layout (Knowledge A2 page list). Implement:
    - `SystemManagePage` — data table, category tabs (전체/운영/개발), add/edit modal, delete confirmation, password masking.
    - `InterfaceListPage` — data table, search bar, filter dropdowns (integration_type, source, target, cycle), add/edit modal (source/target as system dropdowns), Excel upload button with result modal, template download button, export button, pagination.
8. Seed script: insert the 6 sample systems and 3 sample interfaces from SPEC.md §7 for demo purposes.
9. Write pytest tests for every backend endpoint — at minimum: create, read, update, delete, list with filters, upload with valid/invalid data.

**Do NOT build in Phase 1:** Dashboard, charts, topology graph, change_log recording, auth, user management.

**Exit criterion:** `uvicorn` + `npm run dev` with SQLite (default) → both pages functional with sample data loaded → Excel round-trip (download template → fill in → upload → see data in table → export → compare) works end-to-end. Screenshot each page and the upload result in the PR.

---

### `!phase2-dashboard`

> **Trigger:** Phase 1 signed off. Build dashboard and visualization.

**Procedure:**

1. Read SPEC.md §2.4 and §4.4.
2. Backend: implement all 5 dashboard endpoints.
    - `by-system`: aggregate interface count per system (as both source and target).
    - `by-type`: group by integration_type, return label + count.
    - `by-cycle`: group by cycle.
    - `topology`: return `{nodes: [{id, label, type, system_code}], edges: [{source, target, count, interfaces[]}]}`.
    - `summary`: total interfaces, total systems, real-time ratio, changes in last 7 days (from change_log — will be 0 until Phase 3 enables logging).
3. Frontend `DashboardPage`:
    - Top row: 4 stat cards (Recharts or plain styled cards).
    - Grid row 1: "Interfaces by System" (Recharts horizontal `BarChart`) + "By Integration Type" (Recharts `PieChart` donut variant).
    - Grid row 2: "By Cycle" (Recharts `PieChart` or simple bar) + "System Topology" (D3.js force-directed graph).
4. D3 topology specifics:
    - Nodes colored by system type (ERP=blue, DB=green, REST=orange, FTP=gray, MQ=purple).
    - Edges: arrow for direction, width proportional to interface count.
    - Hover on node: tooltip with system name + connected interface list.
    - Click on node: navigate to InterfaceListPage filtered by that system.
    - Responsive: re-render on container resize.
5. Dashboard is the landing page after login (or after app load in Phase 2, since auth is Phase 3).

**Do NOT build in Phase 2:** Auth, change_log recording, user management.

**Exit criterion:** Dashboard renders all 4 charts with the seed data. Topology graph is interactive (hover tooltips, click-to-navigate). All chart data matches what the CRUD pages show. Screenshots in PR.

---

### `!phase3-audit-auth`

> **Trigger:** Phase 2 signed off. Add audit logging, authentication, and documentation. Deployment config is optional.

**Procedure:**

1. Read SPEC.md §2.5, §2.6, §4.5, §4.6, §4.7.
2. Change log auto-recording:
    - SQLAlchemy event listeners (`after_insert`, `after_update`, `after_delete`) on `System` and `Interface` models.
    - On update: detect changed fields via `inspect(instance).attrs[attr].history`, log each changed field as a separate `change_log` row.
    - On insert: log action `CREATE` with new values.
    - On delete: log action `DELETE` with old values.
3. Backend: changelog endpoints (§4.5) — list with filters + Excel export.
4. Frontend `ChangeLogPage`: data table (columns: timestamp, table, action, field, old_value, new_value, user), date range picker, dropdown filters, Excel export button, pagination.
5. Auth:
    - `POST /api/auth/login` → access token (short-lived) + refresh token.
    - `POST /api/auth/refresh` → new access token.
    - `GET /api/auth/me` → current user.
    - Frontend: `LoginPage`, token in localStorage, Axios interceptor for `Authorization: Bearer` header, auto-redirect to login on 401.
    - Seed admin account created by the same seed script from Phase 1 (update the script).
6. User management (admin only):
    - Backend: CRUD endpoints §4.7.
    - Frontend `UserManagePage`: user table, add/edit modal (role dropdown), deactivate toggle.
    - Non-admin users see the page grayed out or hidden from sidebar.
7. Protect all existing endpoints with auth middleware. Dashboard is accessible after login only.
8. Update Dashboard summary "recent changes" card — it now returns real data from `change_log`.
9. `README.md`:
    - Project description.
    - Tech stack + supported databases (SQLite / PostgreSQL / MSSQL).
    - Standalone setup: `cp .env.example .env`, `pip install -r requirements.txt`, `cd frontend && npm install`, `uvicorn app.main:app` + `npm run dev`.
    - How to switch DB: edit `DB_TYPE` in `.env`.
    - Initial admin credentials.
    - API docs: `http://localhost:8000/docs` (FastAPI auto-generated).
10. **(Optional) Docker Compose:**
    - If time permits, provide `docker-compose.yml` with postgres + backend + frontend services.
    - `backend/Dockerfile` and `frontend/Dockerfile`.
    - This is a convenience, not a requirement. The app must work without Docker.

**Do NOT block Phase 3 sign-off on Docker.** Docker is a nice-to-have.

**Exit criterion:** Full auth flow works (login → use app → logout). Every CRUD action on systems/interfaces produces change_log entries visible on the ChangeLogPage. Standalone run (`uvicorn` + `npm run dev`) from a clean checkout with SQLite starts the full stack. README is sufficient for a new developer to get running. Screenshots of all pages + sample audit log in PR.

---

## Part C — Code Quality Rules

1. **Comments:** Docstrings on every Python function/class. Korean is acceptable.
2. **Types:** Python — type hints on all function signatures. TypeScript — `any` is prohibited.
3. **Error handling:** FastAPI endpoints return proper HTTP status codes (400 for validation, 404 for not found, 409 for conflict on delete-protected system) with `{"detail": "..."}` error bodies.
4. **Secrets:** No hardcoded values. All secrets via `.env` → `config.py`. `.env` is gitignored; `.env.example` is committed.
5. **Commits:** Meaningful units per commit, English commit messages.
6. **Tests:** At least one pytest test per API endpoint per Phase.
7. **Formatters:** Pre-commit hooks for Black + isort (BE) and ESLint + Prettier (FE) must be configured in Phase 1 and enforced from the first PR.

---

## Part D — Communication Protocol with James

- **PR titles:** `[Phase N] short description` (e.g. `[Phase 1] Systems CRUD + Excel upload`)
- **Blocking questions:** Append to `QUESTIONS.md` at repo root and mention in PR description.
- **Screenshots:** Every PR includes screenshots of every affected page.
- **Language:** Code, comments, and commit messages in English. UI copy in Korean.
