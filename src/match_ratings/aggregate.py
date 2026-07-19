"""Pure aggregation functions over Match/CriteriaWeight lists. No knowledge
of xlsx or Postgres here — this runs identically for local and hosted mode,
because both modes hydrate the same models before calling into it.
"""
from __future__ import annotations

from dataclasses import dataclass
from statistics import mean
from typing import Optional

from .models import CRITERIA, CRITERIA_LABELS_PT, CriteriaWeight, Match


def rated(matches: list[Match]) -> list[Match]:
    return [m for m in matches if m.is_rated]


@dataclass(frozen=True)
class PhaseSummary:
    phase: str
    total_matches: int
    rated_matches: int
    average_final_score: Optional[float]


@dataclass(frozen=True)
class Summary:
    total_matches: int
    rated_matches: int
    overall_average: Optional[float]
    highest_score: Optional[float]
    lowest_score: Optional[float]
    by_phase: list[PhaseSummary]


@dataclass(frozen=True)
class TeamStat:
    team: str
    matches_played: int
    average_final_score: float
    best_match: Match
    worst_match: Match


@dataclass(frozen=True)
class CriterionAverage:
    criterion: str
    label: str
    weight: float
    average: Optional[float]


def summary(matches: list[Match]) -> Summary:
    """Mirrors the "Resumo" sheet: totals, overall average, extremes, and a
    per-phase breakdown, in the order phases first appear."""
    r = rated(matches)
    scores = [m.final_score for m in r]

    phases_in_order = list(dict.fromkeys(m.phase for m in matches))
    by_phase = []
    for phase in phases_in_order:
        phase_matches = [m for m in matches if m.phase == phase]
        phase_scores = [m.final_score for m in rated(phase_matches)]
        by_phase.append(
            PhaseSummary(
                phase=phase,
                total_matches=len(phase_matches),
                rated_matches=len(phase_scores),
                average_final_score=round(mean(phase_scores), 2) if phase_scores else None,
            )
        )

    return Summary(
        total_matches=len(matches),
        rated_matches=len(r),
        overall_average=round(mean(scores), 2) if scores else None,
        highest_score=max(scores) if scores else None,
        lowest_score=min(scores) if scores else None,
        by_phase=by_phase,
    )


def top_matches(matches: list[Match], limit: int = 10, ascending: bool = False) -> list[Match]:
    r = rated(matches)
    return sorted(r, key=lambda m: m.final_score, reverse=not ascending)[:limit]


def team_stats(matches: list[Match]) -> list[TeamStat]:
    """Average, best, and worst match per team, counting only matches the
    team actually played (and that have a final score)."""
    by_team: dict[str, list[Match]] = {}
    for m in rated(matches):
        by_team.setdefault(m.home_team, []).append(m)
        by_team.setdefault(m.away_team, []).append(m)

    stats = [
        TeamStat(
            team=team,
            matches_played=len(team_matches),
            average_final_score=round(mean(m.final_score for m in team_matches), 2),
            best_match=max(team_matches, key=lambda m: m.final_score),
            worst_match=min(team_matches, key=lambda m: m.final_score),
        )
        for team, team_matches in by_team.items()
    ]
    return sorted(stats, key=lambda t: t.average_final_score, reverse=True)


def criteria_averages(matches: list[Match], weights: list[CriteriaWeight]) -> list[CriterionAverage]:
    """Average of each of the 5 criteria across every rated match, alongside
    its current weight, in Quesitos sheet order."""
    weight_by_criterion = {w.criterion: w.weight for w in weights}
    result = []
    for criterion in CRITERIA:
        values = [m.scores.get(criterion) for m in matches if m.scores.get(criterion) is not None]
        result.append(
            CriterionAverage(
                criterion=criterion,
                label=CRITERIA_LABELS_PT[criterion],
                weight=weight_by_criterion.get(criterion, 0.0),
                average=round(mean(values), 2) if values else None,
            )
        )
    return result


def filter_matches(
    matches: list[Match],
    phase: Optional[str] = None,
    team: Optional[str] = None,
    min_score: Optional[float] = None,
    max_score: Optional[float] = None,
) -> list[Match]:
    result = matches
    if phase:
        result = [m for m in result if m.phase == phase]
    if team:
        needle = team.strip().lower()
        result = [m for m in result if needle in m.home_team.lower() or needle in m.away_team.lower()]
    if min_score is not None:
        result = [m for m in result if m.final_score is not None and m.final_score >= min_score]
    if max_score is not None:
        result = [m for m in result if m.final_score is not None and m.final_score <= max_score]
    return result
