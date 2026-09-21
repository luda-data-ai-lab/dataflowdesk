"""Editable configuration constants: Excel layout, enums and defaults (DEVIN.md rule 4)."""

from __future__ import annotations

# --- Excel template -----------------------------------------------------------------
INTERFACE_SHEET = "인터페이스 리스트"
SYSTEM_SHEET = "시스템 연동정보"

# header (row 1) -> DB field; order matters (column order in the sheet)
INTERFACE_COLUMNS: dict[str, str] = {
    "인터페이스 ID": "interface_id",
    "인터페이스 이름": "interface_name",
    "연동방식": "integration_type",
    "인터페이스 Process": "process",
    "소스시스템": "source_system_code",
    "타켓시스템": "target_system_code",
    "경유시스템": "via_system_code",
    "연동주기": "cycle",
    "인터페이스설명": "description",
}
INTERFACE_REQUIRED: tuple[str, ...] = (
    "인터페이스 ID",
    "인터페이스 이름",
    "연동방식",
    "소스시스템",
    "타켓시스템",
    "연동주기",
)

# headers that may be absent from an uploaded sheet (treated as empty)
OPTIONAL_COLUMNS: frozenset[str] = frozenset({"경유시스템"})

SYSTEM_COLUMNS: dict[str, str] = {
    "번호": "row_no",
    "구분": "category",
    "Type": "type",
    "시스템명": "system_name",
    "시스템코드": "system_code",
    "IP": "ip",
    "Port": "port",
    "계정": "account",
    "패스워드": "password",
    "제품명": "product_name",
    "시스템 설명": "description",
}
SYSTEM_REQUIRED: tuple[str, ...] = ("구분", "Type", "시스템명", "시스템코드")

# --- Enum-like values ---------------------------------------------------------------
SYSTEM_CATEGORIES: tuple[str, ...] = ("운영", "개발", "스테이징")
SYSTEM_TYPES: tuple[str, ...] = ("ERP", "DB", "REST", "FTP", "MQ", "EAI")
# system_code of the central integration hub shown in the topology diagram
HUB_SYSTEM_CODE = "IFSYS"
INTERFACE_CYCLES: tuple[str, ...] = ("Real Time", "Batch")
# cycle value counted as "real-time" for the dashboard ratio card
REALTIME_CYCLE = "Real Time"
INTERFACE_STATUSES: tuple[str, ...] = ("Active", "Inactive", "Deprecated")
DEFAULT_INTERFACE_STATUS = "Active"

# --- Pagination ---------------------------------------------------------------------
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 200

PASSWORD_MASK = "•••••"
