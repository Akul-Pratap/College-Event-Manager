#!/usr/bin/env python3
"""
Bulk create/sync Clerk users and mirror them to Supabase `users` table.

CSV columns (minimum):
- name,email,role,department

Optional columns:
- secondary_role,roll_no,year,branch,section,password

Environment variables required:
- CLERK_SECRET_KEY
- SUPABASE_URL
- SUPABASE_SERVICE_KEY

Usage examples:
  python scripts/bulk_clerk_sync.py --csv scripts/templates/clerk_users_template.csv --dry-run
  python scripts/bulk_clerk_sync.py --csv data/users.csv --default-password "LTSU@12345"
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import importlib
import json
import os
import re
import secrets
import string
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from supabase import create_client

VALID_ROLES = {
    "super_admin",
    "hod",
    "faculty_coordinator",
    "class_incharge",
    "organizer",
    "volunteer",
    "cr",
    "student",
}


def slugify(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower().strip()).strip("-")


def random_password(length: int = 12) -> str:
    alphabet = string.ascii_letters + string.digits + "@#%!"
    return "".join(secrets.choice(alphabet) for _ in range(length))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bulk create/sync Clerk + Supabase users")
    parser.add_argument("--csv", required=True, help="Path to CSV file")
    parser.add_argument("--default-password", default="", help="Default password for rows without password")
    parser.add_argument("--dry-run", action="store_true", help="Validate and print what would happen")
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


def get_env(name: str) -> str:
    val = os.getenv(name, "").strip()
    if not val:
        raise RuntimeError(f"Missing environment variable: {name}")
    return val


def load_rows(path: str) -> List[Dict[str, str]]:
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        return [dict(row) for row in reader]


def clerk_headers(secret: str) -> Dict[str, str]:
    return {
        "Authorization": f"Bearer {secret}",
        "Content-Type": "application/json",
    }


def http_json(method: str, url: str, headers: Dict[str, str], payload: Optional[Dict[str, Any]] = None) -> Any:
    body = None
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = Request(url=url, data=body, headers=headers, method=method)
    with urlopen(req, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}


def clerk_find_user_by_email(secret: str, email: str) -> Optional[Dict[str, Any]]:
    query = urlencode({"email_address[]": email})
    url = f"https://api.clerk.com/v1/users?{query}"
    rows = http_json("GET", url, clerk_headers(secret))
    if isinstance(rows, list) and rows:
        return rows[0]
    return None


def clerk_create_user(secret: str, name: str, email: str, password: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
    first, *rest = name.split(" ")
    last = " ".join(rest).strip() if rest else ""

    payload = {
        "email_address": [email],
        "password": password,
        "first_name": first or "User",
        "last_name": last,
        "skip_password_checks": True,
        "skip_password_requirement": False,
        "public_metadata": metadata,
    }

    return http_json("POST", "https://api.clerk.com/v1/users", clerk_headers(secret), payload)


def clerk_update_metadata(secret: str, clerk_user_id: str, metadata: Dict[str, Any]) -> None:
    http_json(
        "PATCH",
        f"https://api.clerk.com/v1/users/{clerk_user_id}/metadata",
        clerk_headers(secret),
        {"public_metadata": metadata},
    )


def resolve_department_id(supabase, department_value: str) -> Optional[str]:
    value = (department_value or "").strip()
    if not value:
        return None

    depts = supabase.table("departments").select("id,name,code").execute().data or []
    target = slugify(value)
    for d in depts:
        if slugify(str(d.get("code", ""))) == target or slugify(str(d.get("name", ""))) == target:
            return d.get("id")
    return None


def main() -> int:
    args = parse_args()
    load_environment()

    clerk_secret = os.getenv("CLERK_SECRET_KEY", "").strip()
    supabase_url = get_env("SUPABASE_URL")
    supabase_service_key = get_env("SUPABASE_SERVICE_KEY")

    if not clerk_secret and not args.dry_run:
        raise RuntimeError("Missing environment variable: CLERK_SECRET_KEY")

    supabase = create_client(supabase_url, supabase_service_key)
    rows = load_rows(args.csv)

    if not rows:
        print("No rows found in CSV")
        return 1

    report: List[Dict[str, str]] = []

    for idx, row in enumerate(rows, start=2):
        name = (row.get("name") or "").strip()
        email = (row.get("email") or "").strip().lower()
        role = (row.get("role") or "student").strip()
        secondary_role = (row.get("secondary_role") or "").strip() or None
        dept = (row.get("department") or "").strip()

        if not name or not email:
            print(f"[skip] row {idx}: name/email required")
            continue

        if role not in VALID_ROLES:
            print(f"[skip] row {idx}: invalid role '{role}'")
            continue

        if secondary_role and secondary_role not in VALID_ROLES:
            print(f"[skip] row {idx}: invalid secondary_role '{secondary_role}'")
            continue

        if secondary_role and secondary_role == role:
            print(f"[skip] row {idx}: role and secondary_role cannot match")
            continue

        dept_id = resolve_department_id(supabase, dept)
        if not dept_id and role != "super_admin":
            print(f"[skip] row {idx}: department '{dept}' not found")
            continue

        metadata = {
            "role": role,
            "department": slugify(dept) if dept else None,
        }

        clerk_user = None
        if clerk_secret:
            clerk_user = clerk_find_user_by_email(clerk_secret, email)
        created = False

        if not clerk_user:
            pwd = (row.get("password") or "").strip() or args.default_password or random_password()
            if args.dry_run:
                print(f"[dry-run] create clerk user {email} role={role} dept={dept}")
                clerk_user_id = f"dry_{hashlib.md5(email.encode('utf-8')).hexdigest()[:12]}"
            else:
                created_user = clerk_create_user(clerk_secret, name, email, pwd, metadata)
                clerk_user_id = created_user["id"]
                created = True
        else:
            clerk_user_id = clerk_user["id"]
            if args.dry_run:
                print(f"[dry-run] update metadata for existing clerk user {email}")
            else:
                clerk_update_metadata(clerk_secret, clerk_user_id, metadata)

        supabase_row = {
            "clerk_id": clerk_user_id,
            "name": name,
            "email": email,
            "role": role,
            "secondary_role": secondary_role,
            "department_id": dept_id,
            "roll_no": (row.get("roll_no") or "").strip() or None,
            "year": (row.get("year") or "").strip() or None,
            "branch": (row.get("branch") or "").strip() or None,
            "section": (row.get("section") or "").strip() or None,
        }

        if args.dry_run:
            print(f"[dry-run] upsert supabase user {email}")
        else:
            supabase.table("users").upsert(supabase_row, on_conflict="email").execute()

        report.append(
            {
                "email": email,
                "clerk_id": clerk_user_id,
                "status": "created" if created else "updated",
            }
        )

    print("\nDone.")
    print(f"Processed: {len(report)} rows")
    for item in report[:20]:
        print(f" - {item['email']} -> {item['clerk_id']} ({item['status']})")

    if len(report) > 20:
        print(f"... and {len(report) - 20} more")

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"Error: {exc}")
        raise
