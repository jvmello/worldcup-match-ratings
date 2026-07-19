"""Hydrates the same Match/CriteriaWeight models xlsx_loader produces, but
from Postgres. aggregate.py runs identically either way."""
from __future__ import annotations

from ..models import CriteriaWeight, Match

_MATCH_COLUMNS = (
    "phase",
    "match_number",
    "match_date",
    "match_time",
    "home_team",
    "away_team",
    "score",
    "first_half",
    "second_half",
    "back_and_forth",
    "emotion",
    "historic_component",
    "final_score",
)


def _to_float(value) -> float | None:
    return None if value is None else float(value)


def load_from_postgres(dsn: str) -> tuple[list[Match], list[CriteriaWeight]]:
    import psycopg

    with psycopg.connect(dsn) as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT {", ".join(_MATCH_COLUMNS)}
            FROM match_ratings.matches
            ORDER BY match_number
            """
        )
        match_rows = cur.fetchall()

        # Latest weight per criterion (highest effective_from).
        cur.execute(
            """
            SELECT DISTINCT ON (criterion) criterion, weight
            FROM match_ratings.criteria_config
            ORDER BY criterion, effective_from DESC
            """
        )
        weight_rows = cur.fetchall()

    matches = [
        Match(
            phase=row[0],
            match_number=row[1],
            match_date=row[2],
            match_time=row[3],
            home_team=row[4],
            away_team=row[5],
            score=row[6],
            scores={
                "first_half": _to_float(row[7]),
                "second_half": _to_float(row[8]),
                "back_and_forth": _to_float(row[9]),
                "emotion": _to_float(row[10]),
                "historic_component": _to_float(row[11]),
            },
            final_score=_to_float(row[12]),
        )
        for row in match_rows
    ]
    weights = [CriteriaWeight(criterion=criterion, weight=float(weight)) for criterion, weight in weight_rows]
    return matches, weights
