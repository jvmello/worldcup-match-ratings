-- Hosted-mode schema. Lives in the same Postgres instance/database as
-- world-cup-analytics (jvmello-infra's worldcup-db), under its own schema
-- so the two projects never collide. See ../../../DEPLOY.md.

CREATE SCHEMA IF NOT EXISTS match_ratings;

CREATE TABLE IF NOT EXISTS match_ratings.matches (
    id SERIAL PRIMARY KEY,
    phase TEXT NOT NULL,
    match_number INTEGER NOT NULL,
    match_date DATE,
    match_time TEXT,
    home_team TEXT NOT NULL,
    away_team TEXT NOT NULL,
    score TEXT,
    first_half NUMERIC,
    second_half NUMERIC,
    back_and_forth NUMERIC,
    emotion NUMERIC,
    historic_component NUMERIC,
    final_score NUMERIC,
    imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (phase, match_number)
);

-- One row per criterion per "version" of the weights. A new row is only
-- inserted when a weight actually changes from the previous version,
-- so the table stays small while keeping history if the workbook's
-- Quesitos weights are ever edited.
CREATE TABLE IF NOT EXISTS match_ratings.criteria_config (
    id SERIAL PRIMARY KEY,
    criterion TEXT NOT NULL,
    weight NUMERIC NOT NULL,
    effective_from DATE NOT NULL,
    UNIQUE (criterion, effective_from)
);
