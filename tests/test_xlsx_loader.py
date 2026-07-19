from match_ratings.models import CRITERIA
from match_ratings.xlsx_loader import load_workbook_data


def test_load_workbook_data_shapes(workbook_path):
    matches, weights, bands = load_workbook_data(workbook_path)

    assert len(matches) == 104
    assert {w.criterion for w in weights} == set(CRITERIA)
    assert sum(w.weight for w in weights) == 10.0
    assert len(bands) == 5


def test_final_score_matches_spreadsheet_formula(workbook_path):
    """Sanity-checks the loader against a match we know by hand: México x
    África do Sul, Fase de grupos row 3. Weighted average of the 5 scores
    with the workbook's own weights, rounded to 2 decimals, as Excel does."""
    matches, weights, _bands = load_workbook_data(workbook_path)
    match = next(m for m in matches if m.phase == "Fase de grupos" and m.match_number == 1)

    weight_by_criterion = {w.criterion: w.weight for w in weights}
    total_weight = sum(w.weight for w in weights)
    expected = round(
        sum(match.scores[c] * weight_by_criterion[c] for c in CRITERIA) / total_weight, 2
    )
    assert match.final_score == expected


def test_unrated_future_match_has_no_final_score(workbook_path):
    matches, _weights, _bands = load_workbook_data(workbook_path)
    final = next(m for m in matches if m.phase == "Final" and m.match_number == 104)
    assert final.final_score is None
    assert final.is_rated is False
