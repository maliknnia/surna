-- Team game results + player participation (consumer teams)

CREATE TABLE IF NOT EXISTS team_games (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES teams(id),
  logged_by varchar NOT NULL REFERENCES users(id),
  opponent_name varchar NOT NULL,
  result varchar NOT NULL,
  our_score integer,
  their_score integer,
  played_at timestamp DEFAULT now(),
  notes text,
  created_at timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_game_participants (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id varchar NOT NULL REFERENCES team_games(id) ON DELETE CASCADE,
  team_id varchar NOT NULL REFERENCES teams(id),
  user_id varchar NOT NULL REFERENCES users(id),
  show_on_profile boolean DEFAULT true,
  created_at timestamp DEFAULT now()
);

CREATE INDEX IF NOT EXISTS team_games_team_played_idx ON team_games(team_id, played_at DESC);
CREATE INDEX IF NOT EXISTS team_game_participants_user_idx ON team_game_participants(user_id, show_on_profile);
