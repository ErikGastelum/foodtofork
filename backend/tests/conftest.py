"""Shared test setup: tests never touch the real accounts database (backend/foodtofork.db).

Some tests start the whole app (main.py), which connects to DATABASE_URL at startup.
Point that at a throwaway in-memory database before anything is imported.
"""

import os

os.environ["DATABASE_URL"] = "sqlite://"
