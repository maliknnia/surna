-- Phase 1 Task 4: cross-sport SportConfig table + initial seed rows.
-- Additive only. Not wired to UI. No changes to existing tables.

CREATE TABLE IF NOT EXISTS sport_configs (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  sport_type varchar NOT NULL UNIQUE,
  squad_size_min integer NOT NULL,
  squad_size_max integer NOT NULL,
  -- team-formation | team-rotation | individual-fight | team-lineup
  match_structure varchar NOT NULL,
  -- football-grid | gaa-lines | null
  formation_layout varchar,
  -- single-score | dual-score | set-based | round-based
  scoring_type varchar NOT NULL,
  -- continuous | quarters | sets | rounds
  period_structure varchar NOT NULL,
  special_roles text[] NOT NULL DEFAULT ARRAY[]::text[],
  weight_class_tracking boolean NOT NULL DEFAULT false,
  playbook_enabled boolean NOT NULL DEFAULT false,
  -- null = N/A or unlimited (sport-dependent meaning)
  max_subs_per_match integer,
  -- basketball foul-out threshold; null for other sports
  foul_out_limit integer,
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS sport_configs_sport_type_idx ON sport_configs(sport_type);

-- Idempotent seed (upsert on sport_type)
INSERT INTO sport_configs (
  sport_type,
  squad_size_min,
  squad_size_max,
  match_structure,
  formation_layout,
  scoring_type,
  period_structure,
  special_roles,
  weight_class_tracking,
  playbook_enabled,
  max_subs_per_match,
  foul_out_limit
) VALUES
  (
    'football',
    11,
    23,
    'team-formation',
    'football-grid',
    'single-score',
    'continuous',
    ARRAY['Goalkeeper']::text[],
    false,
    false,
    5,
    NULL
  ),
  (
    'gaa',
    15,
    26,
    'team-formation',
    'gaa-lines',
    'dual-score',
    'continuous',
    ARRAY['Goalkeeper']::text[],
    false,
    false,
    6,
    NULL
  ),
  (
    'boxing',
    1,
    1,
    'individual-fight',
    NULL,
    'round-based',
    'rounds',
    ARRAY[]::text[],
    true,
    false,
    NULL,
    NULL
  ),
  (
    'basketball',
    5,
    15,
    'team-lineup',
    NULL,
    'single-score',
    'quarters',
    ARRAY[]::text[],
    false,
    true,
    NULL,
    5
  ),
  (
    'volleyball',
    6,
    14,
    'team-rotation',
    NULL,
    'set-based',
    'sets',
    ARRAY['Libero']::text[],
    false,
    false,
    6,
    NULL
  )
ON CONFLICT (sport_type) DO UPDATE SET
  squad_size_min = EXCLUDED.squad_size_min,
  squad_size_max = EXCLUDED.squad_size_max,
  match_structure = EXCLUDED.match_structure,
  formation_layout = EXCLUDED.formation_layout,
  scoring_type = EXCLUDED.scoring_type,
  period_structure = EXCLUDED.period_structure,
  special_roles = EXCLUDED.special_roles,
  weight_class_tracking = EXCLUDED.weight_class_tracking,
  playbook_enabled = EXCLUDED.playbook_enabled,
  max_subs_per_match = EXCLUDED.max_subs_per_match,
  foul_out_limit = EXCLUDED.foul_out_limit,
  updated_at = now();
