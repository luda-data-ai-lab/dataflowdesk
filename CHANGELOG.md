# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added — Phase 3 (Audit log, authentication, user management)
- Automatic `change_log` writes for systems and interfaces via SQLAlchemy `after_flush`
  listeners: CREATE / DELETE store a JSON snapshot of the row, UPDATE stores one row per changed
  field (`old_value` / `new_value`), each tagged with the acting user; `password_encrypted` is
  masked as `***`. Written inside the same transaction as the change.
- `GET /api/changelog` (filters: `table`, `action`, `user_id`, `record_id`, `date_from`,
  `date_to`; newest first, paginated) and `GET /api/changelog/export` (xlsx of the filtered log).
- JWT auth: `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`; all other API
  routes now require a bearer token except `/api/health` and `GET /api/settings/branding`.
- Admin-only user management: `GET/POST /api/users`, `PUT /api/users/{id}` (display name, role,
  password reset), `PATCH /api/users/{id}/deactivate` and `/activate`. Self-demotion and
  self-deactivation are rejected. `seed.py` creates the initial admin (`ADMIN_USERNAME` /
  `ADMIN_PASSWORD`, default `admin` / `admin1234`).
- Frontend: 로그인 page, token storage + Axios interceptor (silent refresh, redirect to `/login`
  on 401), route guard, sidebar user info + 로그아웃, `변경 이력` page (filters, snapshot
  expander, Excel 다운로드) and admin-only `사용자 관리` page (create / edit / role / password /
  activate-deactivate). Dashboard "최근 7일 변경" card now shows real audit counts and links to
  변경 이력.

### Added — Excel list downloads
- `GET /api/interfaces/export` and `GET /api/systems/export`: single-sheet xlsx of the current
  list (same filters/sort as the list endpoints, all pages). System export never includes
  passwords.
- `Excel 다운로드` buttons on 인터페이스 목록 (current search/filter) and 시스템 관리 (current
  구분/search). The previous full two-sheet export remains as `전체 백업(양식)`.

### Added — Phase 2 (Dashboard)
- `GET /api/dashboard/summary` (total interfaces/systems, active count, Real Time ratio,
  change_log rows in the last 7 days), `/by-system` (source/target counts per system, busiest
  first, isolated systems included with 0), `/by-type` (연동방식) and `/by-cycle` (연동주기).
- Frontend `대시보드` page (Recharts): four stat cards, stacked horizontal bar per system,
  연동방식 donut, 연동주기 pie, and the layered IFSYS 구성도 embedded read-only. Cards, bars and
  slices drill into the pre-filtered interface list; `새로고침` re-fetches everything.
- `/` now lands on `/dashboard`; `/interfaces` also accepts `integration_type`, `cycle` and
  `status` query params.

### Added — IFSYS topology, branding settings
- Product renamed to **DataFlowDesk** (UI title, API title, README, export file names).
- `interfaces.via_system_id` — optional intermediate (EAI) system; Excel column `경유시스템`
  (optional on upload, always present in template/export). `EAI` added to system types; seed
  registers `IFSYS` and routes the three sample interfaces through it.
- `GET /api/topology` — IFSYS-centric nodes/edges (routed interfaces split into
  `source→hub` and `hub→target` hops, direct interfaces as one edge) with category/status filters.
- Frontend `구성도` page: layered SVG diagram at system granularity — source systems on the
  left, the EAI box with one node per 연동방식 (integration method) in the centre, target
  systems on the right; lines coloured by method, direct links dashed. Clicking a system lists
  its connected systems; double-click opens the filtered interface list.
- Interface form/list show the 경유시스템; `/interfaces?system=CODE` pre-filters the list.
- Customer branding: `branding` table + `/api/settings/branding` (company name, tagline, logo
  upload validated by file signature, ≤1 MB, served from `/api/settings/branding/logo`).
  Frontend `설정` page and sidebar header showing the logo/company name.
- Alembic revision `f7c39801a0f6` (via_system_id + branding).

### Added — Phase 1 (Foundation)
- Repository scaffold: FastAPI backend (`backend/`), React + Vite frontend (`frontend/`), tooling (Black, isort, pytest, ESLint, Prettier, pre-commit).
- Multi-backend DB configuration via `DB_TYPE` (sqlite / postgresql / mssql) with async SQLAlchemy 2.0.
- Alembic initial migration creating `systems`, `interfaces`, `upload_history`, `change_log`, `users`.
- Systems CRUD API with delete protection when referenced by interfaces.
- Interfaces CRUD API with source/target FK validation, keyword search, filters, pagination and sorting.
- Excel template download, interfaces/systems upload with per-row validation report, full export, upload history.
- System password encryption (`SYSTEM_PASSWORD_KEY`), masked in list responses, admin-only reveal via `include_password`.
- Seed script (`backend/seed.py`) inserting the 6 sample systems and 3 sample interfaces from SPEC §7.
- Frontend: sidebar layout, `SystemManagePage` (category tabs, add/edit modal, delete confirm, password mask/reveal) and `InterfaceListPage` (search, filters, add/edit modal, Excel upload/template/export, pagination).
- pytest suite covering every Phase 1 endpoint.
