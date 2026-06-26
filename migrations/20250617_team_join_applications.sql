-- Team join requirements (questions, documents, optional fee) + richer applications

ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_fee_cents integer DEFAULT 0;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_fee_note text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_requirements jsonb DEFAULT '{"questions":[],"documents":[]}'::jsonb;

ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS answers jsonb DEFAULT '{}'::jsonb;
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS agreed_documents jsonb DEFAULT '[]'::jsonb;
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS payment_status varchar DEFAULT 'not_required';
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS source varchar DEFAULT 'self';
ALTER TABLE team_join_requests ADD COLUMN IF NOT EXISTS invited_by varchar REFERENCES users(id);
