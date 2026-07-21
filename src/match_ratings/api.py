"""Shared FastAPI app. Local mode and hosted mode both call create_app with
a different DataSource; the routes and the static dashboard are identical
either way.
"""
from __future__ import annotations

from pathlib import Path
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from . import aggregate as agg
from .data_source import DataSource

WEBAPP_DIR = Path(__file__).resolve().parent.parent.parent / "webapp"


def create_app(data_source: DataSource, allowed_origins: Optional[list[str]] = None) -> FastAPI:
    app = FastAPI(title="World Cup Match Ratings API")

    if allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=allowed_origins,
            allow_methods=["GET"],
            allow_headers=["*"],
        )

    @app.get("/api/summary")
    def summary():
        matches, _weights, _bands = data_source.load()
        return agg.summary(matches)

    @app.get("/api/meta")
    def meta():
        matches, weights, bands = data_source.load()
        phases = list(dict.fromkeys(m.phase for m in matches))
        return {"phases": phases, "weights": weights, "color_bands": bands}

    @app.get("/api/criteria")
    def criteria():
        matches, weights, _bands = data_source.load()
        return agg.criteria_averages(matches, weights)

    @app.get("/api/teams")
    def teams():
        matches, _weights, _bands = data_source.load()
        return agg.team_stats(matches)

    @app.get("/api/teams/top")
    def teams_top(limit: int = 10, ascending: bool = False):
        matches, _weights, _bands = data_source.load()
        return agg.top_teams(matches, limit=limit, ascending=ascending)

    @app.get("/api/matches")
    def matches(
        phase: Optional[str] = None,
        team: Optional[str] = None,
        min_score: Optional[float] = Query(default=None, alias="min_score"),
        max_score: Optional[float] = Query(default=None, alias="max_score"),
        criterion: Optional[str] = None,
        criterion_min: Optional[float] = Query(default=None, alias="criterion_min"),
        criterion_max: Optional[float] = Query(default=None, alias="criterion_max"),
    ):
        all_matches, _weights, _bands = data_source.load()
        return agg.filter_matches(
            all_matches,
            phase=phase,
            team=team,
            min_score=min_score,
            max_score=max_score,
            criterion=criterion,
            criterion_min=criterion_min,
            criterion_max=criterion_max,
        )

    @app.get("/api/matches/top")
    def matches_top(limit: int = 10, ascending: bool = False):
        all_matches, _weights, _bands = data_source.load()
        return agg.top_matches(all_matches, limit=limit, ascending=ascending)

    @app.get("/api/matches/by-criterion")
    def matches_by_criterion(criterion: str, limit: int = 10, ascending: bool = False):
        all_matches, _weights, _bands = data_source.load()
        return agg.criterion_ranking(all_matches, criterion=criterion, limit=limit, ascending=ascending)

    if WEBAPP_DIR.exists():
        app.mount("/", StaticFiles(directory=WEBAPP_DIR, html=True), name="webapp")

    return app
