-- Captain → player team invites (regular teams, not instant teams)

CREATE TABLE IF NOT EXISTS team_member_invites (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id varchar NOT NULL REFERENCES teams(id),
  user_id varchar NOT NULL REFERENCES users(id),
  invited_by varchar NOT NULL REFERENCES users(id),
  status varchar DEFAULT 'pending',
  message text,
  created_at timestamp DEFAULT now(),
  responded_at timestamp
);

CREATE INDEX IF NOT EXISTS team_member_invites_user_status_idx
  ON team_member_invites(user_id, status);

CREATE INDEX IF NOT EXISTS team_member_invites_team_status_idx
  ON team_member_invites(team_id, status);
