"""
bulk_clerk_sync.py
──────────────────
Bulk create users in Clerk and sync them to Supabase.

Usage:
  python bulk_clerk_sync.py dry templates/clerk_users_template.csv
  python bulk_clerk_sync.py run templates/clerk_users_template.csv LTSU@12345
"""

import sys
import csv
import os
import json
import requests
from dotenv import load_dotenv

def _load_environment():
    """Load .env from script dir, then try nearby project locations as fallbacks."""
    here = os.path.dirname(os.path.abspath(__file__))
    candidates = [
        os.path.join(here, ".env"),
        os.path.join(here, "college_event_system", "nextjs_website", ".env.local"),
        os.path.join(here, "college_event_system", "flask_api", ".env"),
        os.path.join(os.path.dirname(here), "nextjs_website", ".env.local"),
        os.path.join(os.path.dirname(here), "flask_api", ".env"),
    ]
    for path in candidates:
        if os.path.exists(path):
            load_dotenv(path, override=False)
    # Next.js prefixed var fallback
    if not os.getenv("SUPABASE_URL") and os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
        os.environ["SUPABASE_URL"] = os.environ["NEXT_PUBLIC_SUPABASE_URL"]

_load_environment()

# ── Config ────────────────────────────────────────────────────────────────────
CLERK_SECRET_KEY    = os.getenv("CLERK_SECRET_KEY")
SUPABASE_URL        = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

CLERK_API_BASE  = "https://api.clerk.com/v1"
CLERK_HEADERS   = {
    "Authorization": f"Bearer {CLERK_SECRET_KEY}",
    "Content-Type":  "application/json",
}

SUPABASE_HEADERS = {
    "apikey":        SUPABASE_SERVICE_KEY,
    "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
    "Content-Type":  "application/json",
    "Prefer":        "resolution=merge-duplicates",
}

# ── Helpers ───────────────────────────────────────────────────────────────────

def validate_env():
    missing = []
    if not CLERK_SECRET_KEY:    missing.append("CLERK_SECRET_KEY")
    if not SUPABASE_URL:        missing.append("SUPABASE_URL")
    if not SUPABASE_SERVICE_KEY: missing.append("SUPABASE_SERVICE_KEY")
    if missing:
        print(f"❌ Missing env vars: {', '.join(missing)}")
        print("   Add them to your .env file and try again.")
        sys.exit(1)


def load_csv(filepath):
    if not os.path.exists(filepath):
        print(f"❌ CSV file not found: {filepath}")
        sys.exit(1)

    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        users = list(reader)

    required_cols = {"name", "email", "role", "department"}
    actual_cols   = set(reader.fieldnames or [])
    missing_cols  = required_cols - actual_cols
    if missing_cols:
        print(f"❌ CSV is missing columns: {', '.join(missing_cols)}")
        sys.exit(1)

    return users


def get_department_id(department_code):
    """Fetch department_id from Supabase by code (e.g. CS, EC, ME, CE, MBA)."""
    url  = f"{SUPABASE_URL}/rest/v1/departments?code=eq.{department_code}&select=id"
    res  = requests.get(url, headers=SUPABASE_HEADERS)
    data = res.json()
    if data and len(data) > 0:
        return data[0]["id"]
    return None


def create_clerk_user(name, email, password, role, department, secondary_role=None):
    """Create a user in Clerk with metadata."""
    first_name, *rest = name.strip().split(" ", 1)
    last_name = rest[0] if rest else ""

    public_metadata = {"role": role, "department": department}
    if secondary_role:
        public_metadata["secondary_role"] = secondary_role

    payload = {
        "first_name":       first_name,
        "last_name":        last_name,
        "email_address":    [email],
        "password":         password,
        "public_metadata":  public_metadata,
        "skip_password_checks": False,
    }

    res  = requests.post(f"{CLERK_API_BASE}/users", headers=CLERK_HEADERS, json=payload)
    data = res.json()

    if res.status_code in (200, 201):
        return {"success": True, "clerk_id": data["id"]}
    else:
        errors = data.get("errors", [])
        msg    = errors[0].get("long_message", str(data)) if errors else str(data)
        return {"success": False, "error": msg}


def upsert_supabase_user(clerk_id, name, email, role, department_id,
                         secondary_role=None, roll_no=None, year=None,
                         branch=None, section=None):
    """Upsert user row into Supabase users table."""
    payload = {
        "clerk_id":      clerk_id,
        "name":          name,
        "email":         email,
        "role":          role,
        "department_id": department_id,
    }
    for key, val in [("secondary_role", secondary_role), ("roll_no", roll_no),
                     ("year", year), ("branch", branch), ("section", section)]:
        if val:
            payload[key] = val

    url = f"{SUPABASE_URL}/rest/v1/users"
    res = requests.post(url, headers=SUPABASE_HEADERS, json=payload)

    if res.status_code in (200, 201):
        return {"success": True}
    else:
        return {"success": False, "error": res.text}


# ── Dry Run ───────────────────────────────────────────────────────────────────

def dry_run(users):
    print(f"\n{'─'*55}")
    print(f"  DRY RUN — {len(users)} user(s) found in CSV")
    print(f"{'─'*55}")
    print(f"  {'#':<4} {'Name':<20} {'Email':<30} {'Role':<20} {'Dept'}")
    print(f"{'─'*55}")
    for i, u in enumerate(users, 1):
        print(f"  {i:<4} {u['name']:<20} {u['email']:<30} {u['role']:<20} {u['department']}")
    print(f"{'─'*55}")
    print("  ✅ Dry run complete — no users were created.")
    print("  Run with 'run' instead of 'dry' to actually create them.\n")


# ── Real Run ──────────────────────────────────────────────────────────────────

def real_run(users, default_password):
    validate_env()

    total    = len(users)
    success  = 0
    failed   = []

    print(f"\n{'─'*55}")
    print(f"  BULK SYNC — creating {total} user(s)...")
    print(f"{'─'*55}\n")

    for i, u in enumerate(users, 1):
        name           = u["name"].strip()
        email          = u["email"].strip()
        role           = u["role"].strip()
        department     = u["department"].strip()
        secondary_role = u.get("secondary_role", "").strip() or None
        roll_no        = u.get("roll_no", "").strip() or None
        year           = u.get("year", "").strip() or None
        branch         = u.get("branch", "").strip() or None
        section        = u.get("section", "").strip() or None
        password       = u.get("password", "").strip() or default_password

        print(f"[{i}/{total}] {name} ({email})")

        # 1. Get department_id from Supabase
        dept_id = get_department_id(department)
        if not dept_id:
            msg = f"Department '{department}' not found in Supabase"
            print(f"  ⚠️  Skipped — {msg}\n")
            failed.append({"email": email, "reason": msg})
            continue

        # 2. Create user in Clerk
        clerk_result = create_clerk_user(name, email, password, role, department, secondary_role)
        if not clerk_result["success"]:
            print(f"  ❌ Clerk error — {clerk_result['error']}\n")
            failed.append({"email": email, "reason": clerk_result["error"]})
            continue

        clerk_id = clerk_result["clerk_id"]
        print(f"  ✅ Clerk user created — {clerk_id}")

        # 3. Upsert into Supabase
        sb_result = upsert_supabase_user(clerk_id, name, email, role, dept_id,
                         secondary_role, roll_no, year, branch, section)
        if not sb_result["success"]:
            print(f"  ⚠️  Supabase upsert failed — {sb_result['error']}\n")
            failed.append({"email": email, "reason": sb_result["error"]})
            continue

        print(f"  ✅ Supabase synced\n")
        success += 1

    # ── Summary ───────────────────────────────────────────────
    print(f"{'─'*55}")
    print(f"  ✅ Success : {success}/{total}")
    print(f"  ❌ Failed  : {len(failed)}/{total}")
    if failed:
        print(f"\n  Failed users:")
        for f in failed:
            print(f"    - {f['email']}: {f['reason']}")
    print(f"{'─'*55}\n")


# ── Entry Point ───────────────────────────────────────────────────────────────

def check_env():
    """Print env var status without exiting."""
    print("\n  Environment check:")
    keys = {
        "CLERK_SECRET_KEY":   os.getenv("CLERK_SECRET_KEY"),
        "SUPABASE_URL":       SUPABASE_URL,
        "SUPABASE_SERVICE_KEY": os.getenv("SUPABASE_SERVICE_KEY"),
    }
    all_ok = True
    for k, v in keys.items():
        if v:
            print(f"  ✅ {k} = {v[:12]}...")
        else:
            print(f"  ❌ {k} — NOT SET")
            all_ok = False
    print()
    if all_ok:
        print("  ✅ All env vars found — ready to run.")
    else:
        print("  Add missing vars to college_event_system/nextjs_website/.env.local")
        print("  or college_event_system/flask_api/.env")
    print()


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python bulk_clerk_sync.py check")
        print("  python bulk_clerk_sync.py dry  clerk_users_template.csv")
        print("  python bulk_clerk_sync.py run  clerk_users_template.csv [password]")
        sys.exit(1)

    mode = sys.argv[1].lower()

    if mode == "check":
        check_env()
        return

    if len(sys.argv) < 3:
        print(f"❌ '{mode}' requires a CSV file path.")
        sys.exit(1)

    csv_path = sys.argv[2]
    password = sys.argv[3] if len(sys.argv) > 3 else "LTSU@12345"

    users = load_csv(csv_path)

    if mode == "dry":
        dry_run(users)
    elif mode == "run":
        validate_env()
        real_run(users, password)
    else:
        print(f"❌ Unknown mode '{mode}'. Use 'check', 'dry', or 'run'.")
        sys.exit(1)


if __name__ == "__main__":
    main()
