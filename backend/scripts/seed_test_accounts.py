"""Dev-only seed: creates dummy accounts for testing sign-in and permissions (owner: Jacob).

Run from the backend folder:

    python scripts/seed_test_accounts.py

Safe to run again: accounts that already exist are skipped, never changed.
Every account shares one well-known password, so this refuses to run against a real
database (DATABASE_URL set, e.g. Neon) unless you pass --force.
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(BACKEND))  # so "import db" and "import accounts" work from scripts/

try:  # pick up backend/.env if python-dotenv is installed
    from dotenv import load_dotenv

    load_dotenv(BACKEND / ".env")
except ImportError:
    pass

from sqlalchemy import select

import accounts
import db

TEST_PASSWORD = "test-pass-123"

SAMPLE_KITCHEN = {
    "inventory": [
        {
            "barcode": "737628064502",
            "name": "Thai Peanut Noodle Kit",
            "brand": "Simply Asia",
            "image": None,
            "category": "Noodles",
        }
    ],
    "grocery_list": ["Feta"],
    "saved_recipes": [{"id": "53158", "name": "Air fryer patatas bravas", "thumbnail": None}],
}

# One account per situation we want to test by hand.
TEST_ACCOUNTS = [
    {"username": "test_user", "first_name": "Test", "last_name": "User", "role": "user", "kitchen": None},
    {"username": "test_cook", "first_name": "Casey", "last_name": "Cook", "role": "user", "kitchen": SAMPLE_KITCHEN},
    {"username": "test_admin", "first_name": "Test", "last_name": "Admin", "role": "admin", "kitchen": None},
]


def main() -> None:
    parser = argparse.ArgumentParser(description="Create dummy accounts for local testing.")
    parser.add_argument("--force", action="store_true", help="run even though DATABASE_URL is set")
    args = parser.parse_args()

    if os.getenv("DATABASE_URL") and not args.force:
        sys.exit(
            "DATABASE_URL is set, so this looks like a real database. Refusing to create accounts "
            "with a public test password. Use --force only if you are sure."
        )

    db.configure()
    created, skipped = [], []
    with db.SessionLocal() as session:
        for spec in TEST_ACCOUNTS:
            if session.scalar(select(db.User).where(db.User.username == spec["username"])):
                skipped.append(spec["username"])
                continue
            accounts.create_user(
                session,
                spec["username"],
                TEST_PASSWORD,
                spec["first_name"],
                spec["last_name"],
                role=spec["role"],
                kitchen=spec["kitchen"],
            )
            created.append(spec["username"])
        session.commit()

    print(f"Created: {', '.join(created) or 'nothing'}")
    print(f"Already existed: {', '.join(skipped) or 'nothing'}")
    print(f"Password for all test accounts: {TEST_PASSWORD}")


if __name__ == "__main__":
    main()