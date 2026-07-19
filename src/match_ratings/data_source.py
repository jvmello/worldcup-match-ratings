"""The one seam between "where the data lives" and everything else. Local
mode and hosted mode each provide a DataSource; the API and aggregate.py
never know which one they're talking to.
"""
from __future__ import annotations

from pathlib import Path
from typing import Protocol

from .models import ColorBand, CriteriaWeight, DEFAULT_COLOR_BANDS, Match


class DataSource(Protocol):
    def load(self) -> tuple[list[Match], list[CriteriaWeight], list[ColorBand]]: ...


class XlsxDataSource:
    """Reloads the workbook only when its file mtime changes, so editing the
    spreadsheet and refreshing the browser is enough to see updated ratings
    (no restart needed) without re-parsing the whole file — conditional
    formatting, drawings, shared strings and all — on every API call."""

    def __init__(self, path: str | Path):
        self.path = Path(path)
        self._cache: tuple[list[Match], list[CriteriaWeight], list[ColorBand]] | None = None
        self._cached_mtime: float | None = None

    def load(self) -> tuple[list[Match], list[CriteriaWeight], list[ColorBand]]:
        from .xlsx_loader import load_workbook_data

        mtime = self.path.stat().st_mtime
        if self._cache is None or mtime != self._cached_mtime:
            self._cache = load_workbook_data(self.path)
            self._cached_mtime = mtime
        return self._cache


class PostgresDataSource:
    """Reads from the `match_ratings` schema (matches + criteria_config)
    populated by scripts/import_xlsx_to_db.py. Only imports psycopg when
    actually used, so local mode never needs it installed."""

    def __init__(self, dsn: str):
        self.dsn = dsn

    def load(self) -> tuple[list[Match], list[CriteriaWeight], list[ColorBand]]:
        from .db.loader import load_from_postgres

        matches, weights = load_from_postgres(self.dsn)
        return matches, weights, list(DEFAULT_COLOR_BANDS)
