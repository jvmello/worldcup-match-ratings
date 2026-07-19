#!/usr/bin/env python3
"""Hosted-mode import: upserts the workbook into Postgres. Idempotent, so
it's safe to call from cron on a schedule (see DEPLOY.md) — reruns just
refresh whatever changed in the spreadsheet since the last import.

Usage:
    python scripts/import_xlsx_to_db.py Notas_da_Copa_2026.xlsx --dsn "$DATABASE_URL"
    python scripts/import_xlsx_to_db.py Notas_da_Copa_2026.xlsx --dry-run
"""
from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "src"))

from match_ratings.db.importer import import_workbook


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("xlsx_path")
    parser.add_argument(
        "--dsn",
        default=os.environ.get("DATABASE_URL"),
        help="Postgres DSN (default: $DATABASE_URL)",
    )
    parser.add_argument("--dry-run", action="store_true", help="Roll back instead of committing")
    args = parser.parse_args()

    if not args.dsn:
        print("Faltou o DSN do Postgres: use --dsn ou defina $DATABASE_URL", file=sys.stderr)
        raise SystemExit(1)

    summary = import_workbook(args.xlsx_path, args.dsn, dry_run=args.dry_run)
    print(summary)


if __name__ == "__main__":
    main()
