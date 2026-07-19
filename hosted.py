#!/usr/bin/env python3
"""Hosted mode entrypoint: serves the same dashboard/API as run.py, but
backed by Postgres (populated by scripts/import_xlsx_to_db.py) instead of
reading an xlsx file directly. Used by the container in DEPLOY.md.

Env vars:
    DATABASE_URL     Postgres DSN (required)
    ALLOWED_ORIGINS  comma-separated CORS origins (optional; omit to allow none)
    PORT             defaults to 8000
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent / "src"))

import uvicorn

from match_ratings.api import create_app
from match_ratings.data_source import PostgresDataSource


def main() -> None:
    dsn = os.environ["DATABASE_URL"]
    origins = os.environ.get("ALLOWED_ORIGINS")
    allowed_origins = [o.strip() for o in origins.split(",")] if origins else None

    app = create_app(PostgresDataSource(dsn), allowed_origins=allowed_origins)
    port = int(os.environ.get("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
