-- Phase 2 Task 2: individual / boxing weight-class tournaments.
-- Additive only. Does not alter team tournament semantics (entry_type defaults to 'team').
-- Applied 2026-07-31.

-- Tournament entry mode: 'team' (default) | 'individual'
ALTER TABLE pro_tournaments
  ADD COLUMN IF NOT EXISTS entry_type varchar NOT NULL DEFAULT 'team';

-- Per-class champions when entry_type = individual (weight_class → { userId, displayName })
ALTER TABLE pro_tournaments
  ADD COLUMN IF NOT EXISTS class_champions_json jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Individual entrants (boxers, etc.) — separate from team registrations
CREATE TABLE IF NOT EXISTS pro_tournament_entrants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id varchar NOT NULL REFERENCES pro_tournaments(id) ON DELETE CASCADE,
  user_id varchar NOT NULL,
  display_name varchar NOT NULL,
  -- Fixed enum values (app-validated): flyweight, bantamweight, featherweight,
  -- lightweight, welterweight, middleweight, light_heavyweight, heavyweight
  weight_class varchar NOT NULL,
  status varchar NOT NULL DEFAULT 'pending',
  registered_at timestamp DEFAULT now(),
  UNIQUE (tournament_id, user_id)
);

CREATE INDEX IF NOT EXISTS pro_tournament_entrants_tournament_idx
  ON pro_tournament_entrants(tournament_id);
CREATE INDEX IF NOT EXISTS pro_tournament_entrants_class_idx
  ON pro_tournament_entrants(tournament_id, weight_class);

-- Fixture sides for individuals + weight-class bracket scope
ALTER TABLE pro_tournament_fixtures
  ADD COLUMN IF NOT EXISTS weight_class varchar;

ALTER TABLE pro_tournament_fixtures
  ADD COLUMN IF NOT EXISTS home_user_id varchar;

ALTER TABLE pro_tournament_fixtures
  ADD COLUMN IF NOT EXISTS away_user_id varchar;

CREATE INDEX IF NOT EXISTS pro_tournament_fixtures_weight_class_idx
  ON pro_tournament_fixtures(tournament_id, weight_class);
