"""Data structures shared by every data source (xlsx or Postgres) and every
mode (local or hosted). Aggregation logic in aggregate.py only depends on
these, never on where the data came from.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Optional

# Fixed set of criteria, in the order they appear in the "Quesitos" sheet and
# in each phase sheet's columns (F..J). The spreadsheet is the source of
# truth for the *weights*; this order is structural, not configurable.
CRITERIA = (
    "first_half",
    "second_half",
    "back_and_forth",
    "emotion",
    "historic_component",
)

CRITERIA_LABELS_PT = {
    "first_half": "1º tempo",
    "second_half": "2º tempo",
    "back_and_forth": "Lá e cá",
    "emotion": "Emoção",
    "historic_component": "Componente histórico",
}


@dataclass(frozen=True)
class CriteriaWeight:
    criterion: str  # one of CRITERIA
    weight: float


@dataclass(frozen=True)
class Match:
    phase: str
    match_number: int
    match_date: Optional[date]
    match_time: Optional[str]
    home_team: str
    away_team: str
    score: Optional[str]
    scores: dict[str, Optional[float]]  # criterion -> 0..10, may be missing
    final_score: Optional[float]  # taken from the sheet's own "Nota final" formula

    @property
    def label(self) -> str:
        return f"{self.home_team} x {self.away_team}"

    @property
    def is_rated(self) -> bool:
        return self.final_score is not None


@dataclass(frozen=True)
class ColorBand:
    lower: float
    upper: float
    upper_inclusive: bool
    fg: str
    bg: str

    def contains(self, score: float) -> bool:
        return self.lower <= score < self.upper if not self.upper_inclusive else self.lower <= score <= self.upper


# Mirrors the conditional formatting shipped in the original workbook. Used
# as a fallback when a workbook's own bands can't be read (see
# xlsx_loader.load_color_bands) and as the fixed legend for hosted mode,
# which doesn't persist band configuration in Postgres.
DEFAULT_COLOR_BANDS = (
    ColorBand(0.0, 2.0, False, "#4C1D95", "#EDE9FE"),
    ColorBand(2.0, 5.0, False, "#991B1B", "#FEE2E2"),
    ColorBand(5.0, 7.0, False, "#92400E", "#FEF3C7"),
    ColorBand(7.0, 9.0, False, "#1E40AF", "#DBEAFE"),
    ColorBand(9.0, 10.0, True, "#166534", "#DCFCE7"),
)


def color_for_score(score: Optional[float], bands: tuple[ColorBand, ...] = DEFAULT_COLOR_BANDS) -> Optional[tuple[str, str]]:
    """Returns (text_color, bg_color) for a score. None if unrated or out of range."""
    if score is None:
        return None
    for band in bands:
        if band.contains(score):
            return band.fg, band.bg
    return None
