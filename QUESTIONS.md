# Open Questions

Blocking or ambiguous items surfaced during development. Each entry states what
was implemented as the interim default so nothing is silently decided.

## Phase 1

### Q1. System password storage (SPEC §3.1, DEVIN A4) — **pending confirmation**
Encrypt in DB vs. keep outside DB (env vars / secrets manager).
**Interim:** encrypted in DB using `cryptography.fernet` (AES-128-CBC + HMAC-SHA256, the standard
symmetric primitive in the `cryptography` package). Key comes from `SYSTEM_PASSWORD_KEY`.
If a strict AES-256 cipher is required, swap `app/services/crypto.py` for an AES-256-GCM
implementation — the interface (`encrypt`/`decrypt`) is isolated for that reason.
When `SYSTEM_PASSWORD_KEY` is empty, the app derives a key from `JWT_SECRET` so dev works with
zero setup; production must set an explicit key.

### Q2. `include_password=true` is "admin only" but auth is Phase 3
**Interim:** the query param is honoured for everyone in Phase 1. A `TODO(phase3)` marks where
the admin role check goes once JWT auth exists.

### Q3. Systems upload sheet — `번호` column and blank `시스템코드`
Sample row 5 (파일관리 시스템) has an empty `시스템코드`, yet `system_code` is `UNIQUE NOT NULL`.
**Interim:** rows with empty `시스템코드` are skipped with an error (field=`시스템코드`). The `번호`
column is ignored on import (DB assigns ids) and written as a running number on export.
The seed script assigns `FILE` as the code for that sample row so all 6 systems load.

### Q4. Interface upload — duplicate `interface_id`
SPEC §2.2 says "skip duplicates with warning". **Interim:** duplicates count toward
`skipped_count` and appear in `errors` with reason `duplicate interface_id` (no separate
`warnings` array). Say if you want warnings split out.

### Q5. Interface upload — `status` column
The template has no status column. **Interim:** uploaded interfaces get `status=Active`.

### Q6. MSSQL migration verification
No SQL Server instance is available in the dev environment. Migration was verified on SQLite
and PostgreSQL 15 (upgrade → seed → downgrade). One autogenerate artefact was fixed by hand:
`is_active` default rendered as `sa.text("1")` (SQLite style) which PostgreSQL rejects for
`BOOLEAN`; the migration now uses `sa.true()`. MSSQL notes: `TEXT` maps to `VARCHAR(MAX)` and `BOOLEAN` to `BIT` via SQLAlchemy's
dialect automatically; `server_default=func.now()` renders as `GETDATE()`. Needs a real run.

### Q7. Upload history `user_id`
Auth is Phase 3, so `user_id` is `NULL` for Phase 1 uploads.
