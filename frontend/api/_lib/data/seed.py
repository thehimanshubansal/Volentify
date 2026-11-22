"""Prepare a database: create the schema (if missing), apply migrations and pull the live hazard feeds.

    cd frontend && npm run db:seed

No sample data is inserted — incidents come from GDACS, USGS and NASA EONET, everything else from real users.
The API does the same automatically the first time it reaches the database.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))

SCHEMA_SQL = Path(__file__).with_name("schema.sql")


def main() -> None:
    from api._lib.core import db
    from api._lib.core.config import get_settings
    from api._lib.data import migrations
    from api._lib.engines import live

    url = os.environ.get("DIRECT_URL") or get_settings().database_url
    if not url:
        sys.exit("DATABASE_URL is not set — paste the Neon connection string into frontend/.env first.")
    store = db.PostgresStore(url)
    with store._conn() as conn:
        conn.execute(SCHEMA_SQL.read_text())
        applied = migrations.apply(conn)
    print("Schema ready.", f"Migrations applied: {', '.join(applied)}." if applied else "No pending migrations.")
    report = live.ensure_fresh(force=True)
    print("Live feeds:", report)


if __name__ == "__main__":
    main()
