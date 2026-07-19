"""Idempotent xlsx -> Postgres import. Safe to run repeatedly (e.g. from
cron): matches are upserted by (phase, match_number), and a new
criteria_config version is only inserted when a weight actually changed.
"""
from __future__ import annotations

from datetime import date
from pathlib import Path

from ..models import CRITERIA, Match
from ..xlsx_loader import load_workbook_data

_SCHEMA_SQL = (Path(__file__).parent / "schema.sql").read_text()

_UPSERT_MATCH_SQL = """
INSERT INTO match_ratings.matches (
    phase, match_number, match_date, match_time, home_team, away_team, score,
    first_half, second_half, back_and_forth, emotion, historic_component, final_score
) VALUES (
    %(phase)s, %(match_number)s, %(match_date)s, %(match_time)s, %(home_team)s, %(away_team)s, %(score)s,
    %(first_half)s, %(second_half)s, %(back_and_forth)s, %(emotion)s, %(historic_component)s, %(final_score)s
)
ON CONFLICT (phase, match_number) DO UPDATE SET
    match_date = EXCLUDED.match_date,
    match_time = EXCLUDED.match_time,
    home_team = EXCLUDED.home_team,
    away_team = EXCLUDED.away_team,
    score = EXCLUDED.score,
    first_half = EXCLUDED.first_half,
    second_half = EXCLUDED.second_half,
    back_and_forth = EXCLUDED.back_and_forth,
    emotion = EXCLUDED.emotion,
    historic_component = EXCLUDED.historic_component,
    final_score = EXCLUDED.final_score,
    imported_at = now()
"""


def _match_params(m: Match) -> dict:
    return {
        "phase": m.phase,
        "match_number": m.match_number,
        "match_date": m.match_date,
        "match_time": m.match_time,
        "home_team": m.home_team,
        "away_team": m.away_team,
        "score": m.score,
        "final_score": m.final_score,
        **{criterion: m.scores.get(criterion) for criterion in CRITERIA},
    }


def _latest_weights(cur) -> dict[str, float]:
    cur.execute(
        """
        SELECT DISTINCT ON (criterion) criterion, weight
        FROM match_ratings.criteria_config
        ORDER BY criterion, effective_from DESC
        """
    )
    return {criterion: float(weight) for criterion, weight in cur.fetchall()}


def import_workbook(xlsx_path: str | Path, dsn: str, dry_run: bool = False) -> dict:
    """Returns a small summary dict; commits unless dry_run is True."""
    import psycopg

    matches, weights, _bands = load_workbook_data(xlsx_path)

    with psycopg.connect(dsn) as conn:
        with conn.cursor() as cur:
            cur.execute(_SCHEMA_SQL)

            current_weights = _latest_weights(cur)
            changed_weights = [
                w for w in weights if current_weights.get(w.criterion) != w.weight
            ]
            if changed_weights:
                today = date.today()
                cur.executemany(
                    """
                    INSERT INTO match_ratings.criteria_config (criterion, weight, effective_from)
                    VALUES (%(criterion)s, %(weight)s, %(effective_from)s)
                    ON CONFLICT (criterion, effective_from) DO UPDATE SET weight = EXCLUDED.weight
                    """,
                    [
                        {"criterion": w.criterion, "weight": w.weight, "effective_from": today}
                        for w in changed_weights
                    ],
                )

            cur.executemany(_UPSERT_MATCH_SQL, [_match_params(m) for m in matches])

        if dry_run:
            conn.rollback()
        else:
            conn.commit()

    return {
        "matches_upserted": len(matches),
        "weights_changed": [w.criterion for w in changed_weights],
        "dry_run": dry_run,
    }
