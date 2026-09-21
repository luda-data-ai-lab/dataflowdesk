# Changelog

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
