import os

from dotenv import load_dotenv
from supabase import create_client


def main() -> None:
    load_dotenv()
    url = os.getenv("SUPABASE_URL", "").strip()
    key = os.getenv("SUPABASE_SERVICE_KEY", "").strip()

    if not url or not key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env before running db_setup.py"
        )

    supa = create_client(url, key)
    response = supa.table("departments").select("*").execute()
    print("Departments exist:", response.data)


if __name__ == "__main__":
    main()
