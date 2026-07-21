# World Cup Match Ratings

*[Leia em português](README.md)*

Personal, subjective ratings for every match of the 2026 World Cup — 5
criteria per match, with configurable weights, rolled up into a "final
score" per match. This is a separate project from `world-cup-analytics`
(which is objective data via an API); this one is opinionated, and the
main goal is **reproducibility**: anyone can clone it and run it on their
own machine, with no infrastructure required, and do the same thing with
their own ratings.

## The spreadsheet is the source of truth

[`Notas_da_Copa_2026.xlsx`](Notas_da_Copa_2026.xlsx) has one sheet per
tournament phase (group stage, round of 32, round of 16, quarterfinals,
semifinals, third place, final) plus two configuration sheets:

- **Quesitos** ("Criteria"): the 5 criteria scored for every match, 0 to
  10, and each one's weight in the final score — editable, everything else
  recalculates on its own:

  | Criterion | Weight |
  |---|---|
  | First half | 2.5 |
  | Second half | 2.5 |
  | Back and forth (both sides attacking, pace, open game) | 2.0 |
  | Emotion (tension, comebacks, late goals, drama) | 2.0 |
  | Historic component (upsets, records, rivalry) | 1.0 |

  Final score = weighted average of the 5 criteria using the weights
  above, rounded to 2 decimals — each match's formula lives in `K3` of its
  phase sheet. The same sheet also has the color legend (0–1.99 purple,
  2–4.99 red, 5–6.99 amber, 7–8.99 blue, 9–10 green) used by both tools in
  this repository.

- **Resumo** ("Summary"): overall aggregates (total matches, overall
  average, highest and lowest score) via formulas that read the other
  sheets.

This repository **never recomputes the final score** — it reads whatever
value the spreadsheet itself already calculated. The spreadsheet is the
authority; the code only reads, aggregates, and displays.

## Make your own

Blank templates (same fixtures and scores, default criteria and weights,
just the 5 rating columns left blank for you to fill in):

- [`templates_blank/Notas_da_Copa_2026_modelo_PT.xlsx`](templates_blank/Notas_da_Copa_2026_modelo_PT.xlsx)
- [`templates_blank/World_Cup_2026_match_ratings_template_EN.xlsx`](templates_blank/World_Cup_2026_match_ratings_template_EN.xlsx)

Regenerate them from the filled-in spreadsheet with
`python scripts/generate_blank_templates.py`.

## Local mode — "try it yourself"

No Docker, no database: reads the `.xlsx` straight off disk and serves a
dashboard in your browser.

```bash
git clone <this-repo> && cd worldcup-match-ratings
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python run.py Notas_da_Copa_2026.xlsx
```

Opens on its own at `http://127.0.0.1:8420`. Edit the spreadsheet and
refresh the browser — the data is re-read automatically (no restart
needed). To use your own: `.venv/bin/python run.py path/to/your-spreadsheet.xlsx`.

This is the recommended mode if you just want to try it with your own
spreadsheet. The dashboard has an **EN/PT** button in the top-right corner
— the spreadsheet itself stays in Portuguese underneath, but the interface
(teams, phases, criteria, text) is translated on the fly, no page reload.

> **Debian/Ubuntu:** if `python3 -m venv .venv` fails with "ensurepip is
> not available", your system is missing that Python version's venv
> package — `sudo apt install python3.10-venv` (adjust the version)
> fixes it.

## Hosted mode

Same aggregation code, but the data is persisted in Postgres (schema
`match_ratings`) and the API/dashboard read from there instead of the
`.xlsx` directly — meant for my own published instance, reusing existing
infrastructure. See [`DEPLOY.md`](DEPLOY.md) for how this wires into
`jvmello-infra`, and `scripts/import_xlsx_to_db.py` for the idempotent
spreadsheet → Postgres import.

## Structure

```
src/match_ratings/
  models.py       # Match, CriteriaWeight, ColorBand — plain data structures
  xlsx_loader.py  # spreadsheet -> models (weights, color bands, and scores are read, never recomputed)
  aggregate.py    # summary, top ratings, by team, by criterion — same logic for local and hosted
  data_source.py  # the one seam between "where the data comes from" (local xlsx or Postgres) and everything else
  api.py          # FastAPI app shared by both modes
  db/             # schema, loader, and importer for hosted mode
webapp/           # static dashboard (plain HTML/CSS/JS, no build step)
  i18n.js         # PT/EN interface translation (teams, phases, criteria, text), display-only
run.py            # local mode entrypoint
hosted.py         # hosted mode entrypoint
tests/            # validates the loader and aggregations against the real spreadsheet
```

## Running the tests

```bash
.venv/bin/pip install -r requirements-dev.txt
.venv/bin/pytest
```
