ALTER TABLE teams ADD COLUMN IF NOT EXISTS join_policy varchar DEFAULT 'open';
ALTER TABLE teams ADD COLUMN IF NOT EXISTS featured_highlight_ids text[] DEFAULT ARRAY[]::text[];
