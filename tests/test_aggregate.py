from match_ratings import aggregate as agg
from match_ratings.xlsx_loader import load_workbook_data


def test_summary_mirrors_resumo_sheet(workbook_path):
    """The Resumo sheet caches B5=103 (partidas avaliadas) and B6=6.63
    (média geral) for this workbook; aggregate.summary must reproduce them
    without recomputing anything from the raw scores."""
    matches, _weights, _bands = load_workbook_data(workbook_path)
    s = agg.summary(matches)

    assert s.total_matches == 104
    assert s.rated_matches == 103
    assert s.overall_average == 6.63


def test_top_matches_is_sorted_descending_and_all_rated(workbook_path):
    matches, _weights, _bands = load_workbook_data(workbook_path)
    top = agg.top_matches(matches, limit=10)

    assert len(top) == 10
    assert all(m.is_rated for m in top)
    scores = [m.final_score for m in top]
    assert scores == sorted(scores, reverse=True)


def test_team_stats_only_counts_matches_the_team_played(workbook_path):
    matches, _weights, _bands = load_workbook_data(workbook_path)
    stats = {t.team: t for t in agg.team_stats(matches)}

    argentina = stats["Argentina"]
    expected_matches = [
        m
        for m in agg.rated(matches)
        if m.home_team == "Argentina" or m.away_team == "Argentina"
    ]
    assert argentina.matches_played == len(expected_matches)
    assert argentina.best_match.final_score >= argentina.worst_match.final_score


def test_criteria_averages_cover_all_five_in_sheet_order(workbook_path):
    matches, weights, _bands = load_workbook_data(workbook_path)
    averages = agg.criteria_averages(matches, weights)

    assert [c.criterion for c in averages] == [
        "first_half",
        "second_half",
        "back_and_forth",
        "emotion",
        "historic_component",
    ]
    assert all(0 <= c.average <= 10 for c in averages)


def test_filter_matches_by_phase_and_team(workbook_path):
    matches, _weights, _bands = load_workbook_data(workbook_path)

    group_stage = agg.filter_matches(matches, phase="Fase de grupos")
    assert all(m.phase == "Fase de grupos" for m in group_stage)

    brazil_matches = agg.filter_matches(matches, team="brasil")
    assert all("brasil" in m.home_team.lower() or "brasil" in m.away_team.lower() for m in brazil_matches)
