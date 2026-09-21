# I/F Manager — Product Specification

**Owner:** James (Jewoo Yeon), NeoSlon AX Team Lead
**Repository:** `if-manager` (independent new repo)
**Development Agent:** Devin
**Status:** Draft v0.1 (2026-09)

---

## 1. Product Summary

I/F Manager is a web application for managing system-to-system interfaces in a manufacturing MES/ERP environment. It replaces the current Excel-based tracking of interface definitions and system connection details with a structured database, a searchable UI, and a visual dashboard.

**Target user:** Integration engineers, IT operations staff, and system architects at NeoSlon who need to register, search, audit, and visualize the company's interface landscape.

**Value proposition:** "See every interface and every system connection in one place — who talks to whom, how, and how often."

---

## 2. Core Functional Requirements

### 2.1 Interface List Management

- Register, view, edit, and delete interface records.
- Each interface record contains:

| Field | Type | Example | Notes |
|---|---|---|---|
| interface_id | VARCHAR(50), UNIQUE | `001_SAP_CRM` | User-defined, naming convention enforced |
| interface_name | VARCHAR(200) | `고객정보연동` | Korean display name |
| integration_type | VARCHAR(50) | `SAP-DB`, `DB-SAP`, `JSON-SAP` | Free text, frequently filtered |
| process | TEXT | `SAP-EAI-CRM(DB)-SAP` | Full integration process chain |
| source_system | FK → systems | SAP | Dropdown from registered systems |
| target_system | FK → systems | CRM | Dropdown from registered systems |
| cycle | VARCHAR(20) | `Real Time`, `Batch` | Enum-like, filterable |
| description | TEXT | free text | Optional long description |
| status | VARCHAR(20) | `Active` / `Inactive` / `Deprecated` | Default: Active |

- Search by keyword (across name, description, process).
- Filter by integration_type, source_system, target_system, cycle, status.
- Pagination (default 20 per page), sortable columns.

### 2.2 Excel Upload / Download

- **Template download:** A pre-formatted `.xlsx` file with two sheets — "인터페이스 리스트" and "시스템 연동정보" — matching the exact column layout of the sample data. Headers in row 1, sample data in rows 2–4.
- **Upload (interfaces):** Parse the "인터페이스 리스트" sheet. Validation rules:
  - All required columns present.
  - `interface_id` not already in DB (skip duplicates with warning).
  - `source_system` and `target_system` codes exist in the `systems` table (reject row if not).
  - Empty required fields → skip row with error.
  - Return a result report: success count, skipped count, error details per row.
- **Upload (systems):** Same pattern for the "시스템 연동정보" sheet.
- **Export:** Download the current full dataset as `.xlsx`, same template format.
- **Upload history:** Log every upload (file name, timestamp, record counts, user, status).

### 2.3 System Connection Information

- Register, view, edit, and delete system records.
- Each system record contains:

| Field | Type | Example | Notes |
|---|---|---|---|
| category | VARCHAR(20) | `운영`, `개발`, `스테이징` | Environment label |
| type | VARCHAR(20) | `ERP`, `DB`, `REST`, `FTP`, `MQ` | System/connection type |
| system_name | VARCHAR(100) | `ERP 시스템` | Display name |
| system_code | VARCHAR(50), UNIQUE | `SAP` | Short code used in I/F references |
| ip | VARCHAR(50) | `10.1.1.1` | |
| port | INTEGER, nullable | `5422` | |
| account | VARCHAR(100) | `crmuser01` | Connection account |
| password | TEXT, encrypted | | AES-256 or env-var separation (TBD) |
| product_name | VARCHAR(100) | `PostgreSQL`, `SAP`, `jeus` | Vendor / product |
| description | TEXT | | |

- Tab-filtered view by category (전체 / 운영 / 개발).
- Password column masked in UI; toggle to reveal.
- Delete blocked if any interface references this system as source or target.

### 2.4 Dashboard

Four summary cards at top:
- Total interface count
- Total registered systems
- Real-time interface ratio (%)
- Recent changes (last 7 days)

Four chart panels in a 2×2 grid:

| Chart | Type | Data |
|---|---|---|
| Interfaces by system | Horizontal bar | Count per system (source + target combined) |
| By integration type | Donut / Pie | Distribution of integration_type values |
| By cycle | Pie or simple bar | Real Time vs Batch |
| System topology | Force-directed graph | Nodes = systems (color by type), edges = interfaces (width by count, arrow for direction), hover shows I/F list, click navigates to filtered I/F list |

### 2.5 Change History and Audit

- Every CREATE, UPDATE, DELETE on `interfaces` and `systems` tables is automatically logged to `change_log`.
- Each log entry records: table_name, record_id, action, field_name, old_value, new_value, timestamp, user.
- Audit log page with filters: date range (datepicker), table, action type, user.
- Newest-first sort, pagination.
- Excel export of filtered log.

### 2.6 User Management

- JWT-based authentication (access + refresh tokens).
- Roles: `admin`, `user`.
- Admin can create/edit/deactivate users, change roles.
- Seed script creates initial admin account on first run.

---

## 3. Data Model

### 3.0 Database Options

The application supports multiple database backends, selectable via the `DB_TYPE` environment variable:

| DB_TYPE | Engine | Use Case | Notes |
|---|---|---|---|
| `sqlite` (default) | SQLite | Local development, single-user demo | Zero setup, file-based |
| `postgresql` | PostgreSQL 15 | Production, multi-user | Recommended for team use |
| `mssql` | MS SQL Server | Enterprise environments | Common in NeoSlon/manufacturing IT |

SQLAlchemy abstracts the DB layer. DDL differences (e.g. `SERIAL` vs `AUTOINCREMENT` vs `IDENTITY`) are handled by SQLAlchemy's dialect system — do not write raw SQL for schema creation. Alembic migrations must be tested against all three backends.

Connection string format per backend:
- SQLite: `sqlite:///./data/ifmanager.db`
- PostgreSQL: `postgresql+asyncpg://user:pass@host:5432/ifmanager`
- MSSQL: `mssql+aioodbc://user:pass@host:1433/ifmanager?driver=ODBC+Driver+18+for+SQL+Server`

### 3.1 Tables

```sql
-- Core tables (PostgreSQL syntax shown; SQLAlchemy models are the source of truth)
systems (
    id SERIAL PRIMARY KEY,
    category VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    system_name VARCHAR(100) NOT NULL,
    system_code VARCHAR(50) UNIQUE NOT NULL,
    ip VARCHAR(50),
    port INTEGER,
    account VARCHAR(100),
    password_encrypted TEXT,
    product_name VARCHAR(100),
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)

interfaces (
    id SERIAL PRIMARY KEY,
    interface_id VARCHAR(50) UNIQUE NOT NULL,
    interface_name VARCHAR(200) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    process TEXT,
    source_system_id INTEGER REFERENCES systems(id),
    target_system_id INTEGER REFERENCES systems(id),
    cycle VARCHAR(20) NOT NULL,
    description TEXT,
    status VARCHAR(20) DEFAULT 'Active',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
)

-- Supporting tables
upload_history (
    id SERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    uploaded_at TIMESTAMP DEFAULT NOW(),
    record_count INTEGER,
    user_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'Success'
)

change_log (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(50) NOT NULL,
    record_id INTEGER NOT NULL,
    field_name VARCHAR(100),
    old_value TEXT,
    new_value TEXT,
    action VARCHAR(20) NOT NULL,
    changed_at TIMESTAMP DEFAULT NOW(),
    user_id INTEGER REFERENCES users(id)
)

users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'user',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
)
```

### 3.2 Key Relationships

- `interfaces.source_system_id` → `systems.id` (N:1)
- `interfaces.target_system_id` → `systems.id` (N:1)
- `upload_history.user_id` → `users.id`
- `change_log.user_id` → `users.id`

---

## 4. API Endpoints

### 4.1 Systems

| Method | Path | Description |
|---|---|---|
| GET | `/api/systems` | List (query: category, type, keyword, page, size) |
| GET | `/api/systems/{id}` | Detail |
| POST | `/api/systems` | Create |
| PUT | `/api/systems/{id}` | Update |
| DELETE | `/api/systems/{id}` | Delete (reject if referenced by interfaces) |

### 4.2 Interfaces

| Method | Path | Description |
|---|---|---|
| GET | `/api/interfaces` | List (query: integration_type, source, target, cycle, status, keyword, page, size) |
| GET | `/api/interfaces/{id}` | Detail |
| POST | `/api/interfaces` | Create |
| PUT | `/api/interfaces/{id}` | Update |
| DELETE | `/api/interfaces/{id}` | Delete |

### 4.3 Upload / Export

| Method | Path | Description |
|---|---|---|
| GET | `/api/upload/template` | Download blank Excel template (2 sheets) |
| POST | `/api/upload/interfaces` | Upload I/F list sheet → validate → save |
| POST | `/api/upload/systems` | Upload systems sheet → validate → save |
| GET | `/api/upload/export` | Export current data as .xlsx |
| GET | `/api/upload/history` | Upload history list |

### 4.4 Dashboard

| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/summary` | Total counts + ratios |
| GET | `/api/dashboard/by-system` | I/F count per system |
| GET | `/api/dashboard/by-type` | Distribution by integration_type |
| GET | `/api/dashboard/by-cycle` | Real Time vs Batch |
| GET | `/api/dashboard/topology` | Node + edge data for force graph |

### 4.5 Change Log

| Method | Path | Description |
|---|---|---|
| GET | `/api/changelog` | List (query: date_from, date_to, table_name, action, user_id, page, size) |
| GET | `/api/changelog/export` | Export filtered log as .xlsx |

### 4.6 Auth

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | Login → JWT access + refresh tokens |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Current user info |

### 4.7 Users (admin only)

| Method | Path | Description |
|---|---|---|
| GET | `/api/users` | List users |
| POST | `/api/users` | Create user |
| PUT | `/api/users/{id}` | Update (role, display_name) |
| PATCH | `/api/users/{id}/deactivate` | Deactivate |

---

## 5. UI Pages

| Page | Key Components | Notes |
|---|---|---|
| Login | Username/password form | Redirect to Dashboard on success |
| Dashboard | 4 stat cards, 4 chart panels (Bar, Donut, Pie, D3 topology) | Landing page |
| Interface List | Data table, search bar, filter dropdowns, Excel upload/download buttons, add/edit modal | 20 per page, sortable |
| System Management | Data table, category tab filter, add/edit modal, delete confirmation | Password masked |
| Change Log | Audit log table, date/table/action/user filters, Excel export | Newest first |
| User Management | User table, add/edit modal, role dropdown, deactivate toggle | Admin only |

Navigation: left sidebar (collapsible), top bar with page title + user info.

---

## 6. Development Phases

| Phase | Scope | Estimated |
|---|---|---|
| **1 — Foundation** | Repo scaffold, DB schema + migrations, systems CRUD, interfaces CRUD, Excel upload/download, basic UI for systems + interfaces pages | 1 week |
| **2 — Dashboard** | Dashboard API, 4 summary cards, 3 Recharts panels (bar/pie/donut), D3 force topology, dashboard page layout | 1 week |
| **3 — Audit + Auth** | Change log auto-recording (SQLAlchemy event listeners), audit log page, JWT auth, user management, README | 1 week |
| **(Optional) Deploy** | Docker Compose configuration for containerized deployment. Not required — the app runs standalone with `uvicorn` + `npm run dev` | — |

---

## 7. Sample Data

### Interface List Sheet

| 인터페이스 ID | 인터페이스 이름 | 연동방식 | 인터페이스 Process | 소스시스템 | 타켓시스템 | 연동주기 | 인터페이스설명 |
|---|---|---|---|---|---|---|---|
| 001_SAP_CRM | 고객정보연동 | SAP-DB | SAP-EAI-CRM(DB)-SAP | SAP | CRM | Real Time | SAP에서 고객정보가 발생하면 CRM으로 전송한다 |
| 002_CRM_SAP | 고객클레임정보 | DB-SAP | CRM(DB)-EAI-SAP-CRM | CRM | SAP | Batch | CRM에서 클레임 정보가 발생하면 SAP로 변경 데이터를 전송한다. |
| 003_HR_SAP | 고객정보 조회 | JSON-SAP | WEB(JSON)-EAI-SAP-WEB | HR | SAP | Real Time | HR시스템에서 고객 정보 필요시 web service를 통해서 SAP를 조회 후 수신한다. |

### System Connection Sheet

| 번호 | 구분 | Type | 시스템명 | 시스템코드 | IP | Port | 계정 | 패스워드 | 제품명 | 시스템 설명 |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 운영 | ERP | ERP 시스템 | SAP | 10.1.1.1 | | erp01 | erp01 | SAP | SAP ERP 시스템 |
| 2 | 운영 | DB | 고객관리시스템 | CRM | 11.1.1.1 | 5422 | crmuser01 | 1234 | Postgrese | 고객관리시스템 |
| 3 | 운영 | DB | HR 시스템 | HR | 12.2.2.2 | 1521 | hruser01 | 1234 | MS SQL | HR 시스템 |
| 4 | 운영 | REST | 점포관리 | WEB | 13.1.1.1 | 10040 | webadmin01 | 1234 | jeus | 점포관리 |
| 5 | 운영 | FTP | 파일관리 시스템 | | 14.1.1.1 | 443 | filesuser01 | 1234 | AWS | 파일관리 시스템 |
| 6 | 개발 | ERP | ERP 개발 시스템 | SAP_DEV | 10.1.1.2 | | erp01 | erp01 | SAP | SAP 개발 ERP 시스템 |

---

## 8. Testing

- Unit tests for every API endpoint (pytest).
- Excel parser: round-trip test — upload sample → export → compare.
- Dashboard aggregation: fixture data → verify counts match.
- Change log: perform CRUD → verify log entries exist with correct old/new values.
- Auth: test login, token refresh, protected endpoint access, role-based access.

---

## 9. Explicit Non-Goals (v1)

- Real-time interface monitoring or health checking.
- Automated connectivity tests (DB ping, REST health check). Deferred to v2.
- Multi-tenant / multi-company support.
- Notification system (email/Slack alerts on changes).
- Interface scheduling or orchestration.
