# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
