#!/usr/bin/env python3
"""
Folder-based data updater for Supabase.

Why this exists:
- Drop files into table-specific folders instead of running one file at a time.
- Accept json/csv/txt/xlsx/xls.
- Clean payloads to known database columns before upsert.
- Reduce frequent conflict/key mistakes by using table defaults.

Required env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import os
from pathlib import Path
from typing import Any, Dict, Iterable, List, Tuple

from supabase import Client, create_client

SUPPORTED_EXTS = {".json", ".csv", ".txt", ".xlsx", ".xls"}


TABLE_CONFIG: Dict[str, Dict[str, Any]] = {
    "departments": {
        "columns": {"name", "code", "hod_id"},
        "conflict": "code",
        "aliases": {
            "department_name": "name",
            "department": "name",
            "department_id": "code",
        },
        "defaults": {},
        "int_cols": set(),
        "bool_cols": set(),
    },
    "users": {
        "columns": {
            "clerk_id",
            "name",
            "roll_no",
            "email",
            "role",
            "secondary_role",
            "department_id",
            "year",
            "branch",
            "section",
            "fcm_token",
        },
        "conflict": "email",
        "aliases": {
            "student_name": "name",
            "registration_no": "roll_no",
            "enrollment_no": "roll_no",
            "department_code": "department_id",
            "department": "department_id",
            "year_of_study": "year",
            "year_of_admission": "year",
            "program_name": "branch",
            "program_id": "branch",
        },
        "defaults": {"role": "student"},
        "int_cols": set(),
        "bool_cols": set(),
    },
    "clubs": {
        "columns": {"name", "description", "logo_url", "department_id"},
        "conflict": "name",
        "aliases": {},
        "defaults": {},
        "int_cols": set(),
        "bool_cols": set(),
    },
    "venues": {
        "columns": {"name", "capacity", "department_id", "is_shared"},
        "conflict": "name",
        "aliases": {},
        "defaults": {"is_shared": True},
        "int_cols": {"capacity"},
        "bool_cols": {"is_shared"},
    },
    "events": {
        "columns": {
            "title",
            "description",
            "date",
            "start_time",
            "end_time",
            "venue_id",
            "club_id",
            "department_id",
            "payment_type",
            "fee",
            "upi_id",
            "status",
            "form_open",
            "form_close",
            "max_responses",
            "created_by",
        },
        "conflict": "title",
        "aliases": {
            "event_name": "title",
            "start_date": "date",
        },
        "defaults": {"payment_type": "free", "fee": 0, "status": "draft"},
        "int_cols": {"fee", "max_responses"},
        "bool_cols": set(),
    },
    "registrations": {
        "columns": {
            "student_id",
            "event_id",
            "department_id",
            "status",
            "payment_method",
            "payment_status",
            "registered_at",
        },
        "conflict": "student_id,event_id",
        "aliases": {
            "user_id": "student_id",
            "created_at": "registered_at",
        },
        "defaults": {
            "status": "confirmed",
            "payment_method": "not_required",
            "payment_status": "not_required",
        },
        "int_cols": set(),
        "bool_cols": set(),
    },
    "money_collection": {
        "columns": {
            "event_id",
            "department_id",
            "year",
            "branch",
            "section",
            "amount_collected",
            "collected_by",
            "approved_by",
        },
        "conflict": "event_id,year,branch,section",
        "aliases": {},
        "defaults": {"amount_collected": 0},
        "int_cols": {"amount_collected"},
        "bool_cols": set(),
    },
}


def parse_args() -> argparse.Namespace:
    default_root = Path(__file__).resolve().parent / "data_updates"
    parser = argparse.ArgumentParser(description="Folder-based updater for Supabase tables")
    parser.add_argument("--root", type=str, default=str(default_root), help="Root folder containing table folders")
    parser.add_argument("--table", type=str, default="", help="Process only one table folder")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch size for upsert")
    parser.add_argument("--dry-run", action="store_true", help="Preview cleaned rows only")
    return parser.parse_args()


def load_environment() -> None:
    try:
        dotenv_module = importlib.import_module("dotenv")
        load_dotenv = getattr(dotenv_module, "load_dotenv")
    except Exception:
        return

    script_dir = Path(__file__).resolve().parent
    candidates = [
        script_dir.parent / "flask_api" / ".env",
        script_dir.parent / ".env",
        script_dir.parents[1] / ".env",
    ]
    for env_path in candidates:
        if env_path.exists():
            load_dotenv(env_path)


def get_client() -> Client:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_KEY")
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set")
    return create_client(url, key)


def normalize_value(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, str):
        v = value.strip()
        if v == "" or v.lower() in {"null", "none", "nan", "n/a", "na"}:
            return None
        return v
    return value


def normalize_key(key: str) -> str:
    return key.strip().lower().replace(" ", "_")


def read_json(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]
    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            return [x for x in payload["data"] if isinstance(x, dict)]
        for value in payload.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                return [x for x in value if isinstance(x, dict)]
    return []


def read_csv(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        return [dict(row) for row in csv.DictReader(f)]


def read_txt(path: Path) -> List[Dict[str, Any]]:
    lines = [line.strip() for line in path.read_text(encoding="utf-8", errors="ignore").splitlines() if line.strip()]
    if not lines:
        return []

    # Mode 1: JSON Lines
    if lines[0].startswith("{"):
        out: List[Dict[str, Any]] = []
        for line in lines:
            try:
                obj = json.loads(line)
            except Exception:
                continue
            if isinstance(obj, dict):
                out.append(obj)
        if out:
            return out

    # Mode 2: CSV-like text (header in first line)
    if "," in lines[0]:
        reader = csv.DictReader(lines)
        rows = [dict(row) for row in reader]
        if rows:
            return rows

    # Mode 3: fallback list of values
    return [{"value": value} for value in lines]


def read_excel(path: Path) -> List[Dict[str, Any]]:
    try:
        pd = importlib.import_module("pandas")
    except Exception as exc:
        raise RuntimeError("pandas is required for xlsx/xls files (pip install pandas openpyxl)") from exc

    frame = pd.read_excel(path)
    frame = frame.where(pd.notnull(frame), None)
    return frame.to_dict(orient="records")


def read_records(path: Path) -> List[Dict[str, Any]]:
    ext = path.suffix.lower()
    if ext == ".json":
        return read_json(path)
    if ext == ".csv":
        return read_csv(path)
    if ext == ".txt":
        return read_txt(path)
    if ext in {".xlsx", ".xls"}:
        return read_excel(path)
    return []


def to_int(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        s = value.strip()
        if s == "":
            return None
        try:
            return int(float(s))
        except Exception:
            return None
    return None


def to_bool(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    if isinstance(value, str):
        s = value.strip().lower()
        if s in {"true", "1", "yes", "y"}:
            return True
        if s in {"false", "0", "no", "n"}:
            return False
    return None


def clean_row(table: str, row: Dict[str, Any]) -> Dict[str, Any]:
    cfg = TABLE_CONFIG[table]
    aliases = cfg["aliases"]
    allowed = cfg["columns"]

    normalized: Dict[str, Any] = {}
    for raw_k, raw_v in row.items():
        if raw_k is None:
            continue
        k = normalize_key(str(raw_k))
        k = aliases.get(k, k)
        if k not in allowed:
            continue
        normalized[k] = normalize_value(raw_v)

    for key, default_val in cfg["defaults"].items():
        if normalized.get(key) is None:
            normalized[key] = default_val

    for key in cfg["int_cols"]:
        if key in normalized:
            normalized[key] = to_int(normalized.get(key))

    for key in cfg["bool_cols"]:
        if key in normalized:
            b = to_bool(normalized.get(key))
            if b is not None:
                normalized[key] = b

    # users-specific cleanup to reduce onboarding friction
    if table == "users":
        email = normalized.get("email")
        if email and not normalized.get("clerk_id"):
            digest = hashlib.md5(str(email).encode("utf-8")).hexdigest()[:12]
            normalized["clerk_id"] = f"temp_{digest}"

    return {k: v for k, v in normalized.items() if v is not None}


def key_tuple(row: Dict[str, Any], conflict: str) -> Tuple[Any, ...]:
    cols = [c.strip() for c in conflict.split(",") if c.strip()]
    return tuple(row.get(col) for col in cols)


def discover_files(folder: Path) -> List[Path]:
    if not folder.exists() or not folder.is_dir():
        return []
    files: List[Path] = []
    for p in folder.rglob("*"):
        if p.is_file() and p.suffix.lower() in SUPPORTED_EXTS:
            files.append(p)
    return sorted(files)


def chunked(rows: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for i in range(0, len(rows), size):
        yield rows[i : i + size]


def process_table(client: Client, table: str, folder: Path, batch_size: int, dry_run: bool) -> None:
    cfg = TABLE_CONFIG[table]
    conflict = cfg["conflict"]

    files = discover_files(folder)
    if not files:
        print(f"[skip] {table}: no files in {folder}")
        return

    staged: List[Dict[str, Any]] = []
    for f in files:
        rows = read_records(f)
        print(f"[read] {table}: {f.name} -> {len(rows)} rows")
        for row in rows:
            cleaned = clean_row(table, row)
            if not cleaned:
                continue
            if any(v is None or v == "" for v in key_tuple(cleaned, conflict)):
                continue
            staged.append(cleaned)

    if not staged:
        print(f"[skip] {table}: no valid rows after cleaning")
        return

    # De-duplicate by conflict key; keep latest file/row value.
    dedup: Dict[Tuple[Any, ...], Dict[str, Any]] = {}
    for row in staged:
        dedup[key_tuple(row, conflict)] = row
    rows = list(dedup.values())

    if dry_run:
        print(f"[dry-run] {table}: {len(rows)} cleaned rows (from {len(staged)} staged rows)")
        print(json.dumps(rows[:2], indent=2, default=str))
        return

    wrote = 0
    for batch in chunked(rows, batch_size):
        client.table(table).upsert(batch, on_conflict=conflict).execute()
        wrote += len(batch)

    print(f"[ok] {table}: upserted {wrote} rows using conflict '{conflict}'")


def main() -> int:
    args = parse_args()
    load_environment()

    root = Path(args.root).resolve()
    if not root.exists():
        print(f"Root folder not found: {root}")
        return 1

    try:
        client = get_client()
    except Exception as exc:
        print(f"Supabase client init failed: {exc}")
        return 1

    tables = [args.table.strip()] if args.table.strip() else list(TABLE_CONFIG.keys())
    for table in tables:
        if table not in TABLE_CONFIG:
            print(f"Unsupported table folder: {table}")
            print(f"Supported: {', '.join(TABLE_CONFIG.keys())}")
            return 1

        process_table(
            client=client,
            table=table,
            folder=root / table,
            batch_size=args.batch_size,
            dry_run=args.dry_run,
        )

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
