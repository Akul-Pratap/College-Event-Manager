#!/usr/bin/env python3
"""
Bulk importer for LTSU_Complete data into Supabase.

Features:
- Reads JSON/CSV/TXT/XLSX files.
- Auto-maps known files to core tables (departments, users).
- Missing values are normalized to None (NULL in Postgres).
- Supports generic import mode for ad-hoc files (excel/json/text updates).
- Safe by default: skips unknown files unless --table is provided.

Required env vars:
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

Optional:
- --source path to file/folder (default: ../../LTSU_Complete_20260205_090720)
- --table <table_name> for generic import from one file
- --dry-run to preview records
"""

from __future__ import annotations

import argparse
import csv
import importlib
import json
import os
import re
import sys
import uuid
from pathlib import Path
from typing import Any, Dict, Iterable, List

from supabase import Client, create_client

SUPPORTED_EXTS = {".json", ".csv", ".txt", ".xlsx", ".xls"}

KNOWN_FILE_MAP = {
    "hr_departments": "departments",
    "students": "users",
    "students_enriched": "users",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import LTSU data into Supabase")
    default_source = Path(__file__).resolve().parents[2] / "LTSU_Complete_20260205_090720"

    parser.add_argument("--source", type=str, default=str(default_source), help="Path to file or folder")
    parser.add_argument("--table", type=str, default="", help="Target table (generic mode)")
    parser.add_argument("--on-conflict", type=str, default="", help="Upsert conflict column(s), e.g. email")
    parser.add_argument("--batch-size", type=int, default=500, help="Batch size for inserts/upserts")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, do not write")
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


def get_supabase_client() -> Client:
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


def normalize_record(record: Dict[str, Any]) -> Dict[str, Any]:
    return {k: normalize_value(v) for k, v in record.items()}


def read_json(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8") as f:
        payload = json.load(f)

    if isinstance(payload, list):
        return [x for x in payload if isinstance(x, dict)]

    if isinstance(payload, dict):
        if isinstance(payload.get("data"), list):
            return [x for x in payload["data"] if isinstance(x, dict)]
        if isinstance(payload.get("program"), list):
            return [x for x in payload["program"] if isinstance(x, dict)]

        for value in payload.values():
            if isinstance(value, list) and value and isinstance(value[0], dict):
                return [x for x in value if isinstance(x, dict)]

    return []


def read_csv(path: Path) -> List[Dict[str, Any]]:
    with path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def read_txt(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8", errors="ignore") as f:
        for i, line in enumerate(f, start=1):
            value = line.strip()
            if not value:
                continue
            rows.append({"line_number": i, "value": value})
    return rows


def read_excel(path: Path) -> List[Dict[str, Any]]:
    try:
        pd = importlib.import_module("pandas")
    except Exception as exc:
        raise RuntimeError("pandas is required for xlsx/xls import. Install pandas openpyxl") from exc

    if pd is None:
        raise RuntimeError("pandas is required for xlsx/xls import. Install pandas openpyxl")

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


def slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")


def ensure_department_map(client: Client, department_rows: List[Dict[str, Any]]) -> Dict[str, str]:
    payload: List[Dict[str, Any]] = []

    for row in department_rows:
        name = normalize_value(row.get("name")) or normalize_value(row.get("department_name"))
        code = normalize_value(row.get("department_id")) or normalize_value(row.get("code"))
        if not code and name:
            code = slug(str(name))[:50]
        if not name and code:
            name = str(code)
        if not code:
            continue

        payload.append({"name": name, "code": str(code)[:50]})

    if payload:
        client.table("departments").upsert(payload, on_conflict="code").execute()

    rows = client.table("departments").select("id, code").execute().data or []
    return {str(r["code"]): str(r["id"]) for r in rows if r.get("code") and r.get("id")}


def map_user_rows(rows: List[Dict[str, Any]], dept_code_to_id: Dict[str, str]) -> List[Dict[str, Any]]:
    mapped: List[Dict[str, Any]] = []

    for raw in rows:
        r = normalize_record(raw)

        source_user_id = r.get("user_id") or r.get("id") or str(uuid.uuid4())
        clerk_id = r.get("clerk_id") or f"temp_{source_user_id}"
        email = r.get("email") or f"{clerk_id}@import.local"
        name = r.get("name") or r.get("student_name") or "Unknown"

        dept_code = r.get("department_id") or r.get("department_code") or r.get("department")
        dept_uuid = dept_code_to_id.get(str(dept_code)) if dept_code is not None else None

        mapped.append(
            {
                "clerk_id": str(clerk_id),
                "name": str(name),
                "roll_no": r.get("roll_no") or r.get("registration_no") or r.get("enrollment_no") or r.get("user_id"),
                "email": str(email),
                "role": r.get("role") or "student",
                "department_id": dept_uuid,
                "year": r.get("year") or r.get("year_of_study") or r.get("year_of_admission"),
                "branch": r.get("branch") or r.get("program_name") or r.get("program_id"),
                "section": r.get("section"),
                "fcm_token": r.get("fcm_token"),
            }
        )

    return mapped


def chunked(data: List[Dict[str, Any]], size: int) -> Iterable[List[Dict[str, Any]]]:
    for i in range(0, len(data), size):
        yield data[i : i + size]


def write_records(
    client: Client,
    table: str,
    rows: List[Dict[str, Any]],
    batch_size: int,
    on_conflict: str = "",
    dry_run: bool = False,
) -> None:
    if not rows:
        print(f"[skip] {table}: no rows")
        return

    if dry_run:
        print(f"[dry-run] {table}: {len(rows)} rows")
        print(json.dumps(rows[:2], indent=2, default=str))
        return

    total = 0
    for part in chunked(rows, batch_size):
        if on_conflict:
            client.table(table).upsert(part, on_conflict=on_conflict).execute()
        else:
            client.table(table).insert(part).execute()
        total += len(part)

    print(f"[ok] {table}: wrote {total} rows")


def discover_files(source: Path) -> List[Path]:
    if source.is_file():
        return [source]

    files: List[Path] = []
    for path in source.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS:
            files.append(path)
    return sorted(files)


def import_auto(client: Client, source: Path, batch_size: int, dry_run: bool) -> None:
    files = discover_files(source)
    if not files:
        print("No importable files found.")
        return

    print(f"Found {len(files)} files under: {source}")

    # 1) Build/update departments from known department sources + student dept codes.
    dept_records: List[Dict[str, Any]] = []
    user_source_rows: List[Dict[str, Any]] = []

    for f in files:
        stem = f.stem.lower()
        records = read_records(f)

        if stem == "hr_departments":
            dept_records.extend(records)
        elif stem in {"students", "students_enriched"}:
            user_source_rows.extend(records)

    # Create departments from explicit department file and backfill from users' department code values.
    for r in user_source_rows:
        dept_code = r.get("department_id") or r.get("department_code") or r.get("department")
        if dept_code:
            dept_records.append({"department_id": dept_code, "name": str(dept_code)})

    dept_map = ensure_department_map(client, dept_records)
    print(f"Department code map size: {len(dept_map)}")

    # 2) Import users
    mapped_users = map_user_rows(user_source_rows, dept_map)
    write_records(client, "users", mapped_users, batch_size=batch_size, on_conflict="email", dry_run=dry_run)

    # 3) Report skipped files (for manual mapping)
    for f in files:
        stem = f.stem.lower()
        if stem not in KNOWN_FILE_MAP:
            print(f"[skip] {f.name}: no safe auto-map (use --table for generic import)")


def import_generic(
    client: Client,
    source: Path,
    table: str,
    batch_size: int,
    on_conflict: str,
    dry_run: bool,
) -> None:
    rows = [normalize_record(r) for r in read_records(source)]
    write_records(client, table, rows, batch_size=batch_size, on_conflict=on_conflict, dry_run=dry_run)


def main() -> int:
    args = parse_args()
    load_environment()

    source = Path(args.source).resolve()
    if not source.exists():
        print(f"Source not found: {source}")
        return 1

    try:
        client = get_supabase_client()
    except Exception as exc:
        print(f"Supabase client init failed: {exc}")
        return 1

    try:
        if args.table:
            if source.is_dir():
                print("Generic table mode requires --source to be a file")
                return 1
            import_generic(
                client,
                source,
                table=args.table,
                batch_size=args.batch_size,
                on_conflict=args.on_conflict,
                dry_run=args.dry_run,
            )
        else:
            import_auto(client, source, batch_size=args.batch_size, dry_run=args.dry_run)
    except Exception as exc:
        print(f"Import failed: {exc}")
        return 1

    print("Done.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
