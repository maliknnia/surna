-- Phase 1: optional link from game-day / fixture rows to a canonical competitive match.
-- Additive only — nullable FKs, ON DELETE SET NULL. No unique index.
-- Does not change existing query behavior (columns unused until app code sets them).

-- ── team_games ──────────────────────────────────────────────────────────────
ALTER TABLE team_games
  ADD COLUMN IF NOT EXISTS competitive_match_id varchar;

DO $$
BEGIN
  ALTER TABLE team_games
    ADD CONSTRAINT team_games_competitive_match_id_fkey
    FOREIGN KEY (competitive_match_id)
    REFERENCES competitive_matches(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS team_games_competitive_match_id_idx
  ON team_games(competitive_match_id);

-- ── pro_match_squads ────────────────────────────────────────────────────────
ALTER TABLE pro_match_squads
  ADD COLUMN IF NOT EXISTS competitive_match_id varchar;

DO $$
BEGIN
  ALTER TABLE pro_match_squads
    ADD CONSTRAINT pro_match_squads_competitive_match_id_fkey
    FOREIGN KEY (competitive_match_id)
    REFERENCES competitive_matches(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS pro_match_squads_competitive_match_id_idx
  ON pro_match_squads(competitive_match_id);

-- ── pro_tournament_fixtures ─────────────────────────────────────────────────
-- Table is often created at runtime by tournamentService.ensureTournamentTables().
-- Only alter when present; boot-time ensure will also ADD COLUMN IF NOT EXISTS.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pro_tournament_fixtures'
  ) THEN
    ALTER TABLE pro_tournament_fixtures
      ADD COLUMN IF NOT EXISTS competitive_match_id varchar;

    BEGIN
      ALTER TABLE pro_tournament_fixtures
        ADD CONSTRAINT pro_tournament_fixtures_competitive_match_id_fkey
        FOREIGN KEY (competitive_match_id)
        REFERENCES competitive_matches(id)
        ON DELETE SET NULL;
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;

    CREATE INDEX IF NOT EXISTS pro_tournament_fixtures_competitive_match_id_idx
      ON pro_tournament_fixtures(competitive_match_id);
  END IF;
END $$;
