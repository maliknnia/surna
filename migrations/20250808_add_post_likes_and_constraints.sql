-- migrations/20250808_add_post_likes_and_constraints.sql

-- 1) Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id varchar NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Unique constraint to prevent duplicate likes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_post_likes_user_post'
  ) THEN
    ALTER TABLE post_likes
      ADD CONSTRAINT uq_post_likes_user_post UNIQUE (user_id, post_id);
  END IF;
END$$;

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes (user_id);

-- 4) Example constraints for other join tables (add if missing)
ALTER TABLE IF EXISTS team_members
  ADD CONSTRAINT IF NOT EXISTS uq_team_members_user_team UNIQUE (user_id, team_id);
ALTER TABLE IF EXISTS post_comments
  ADD CONSTRAINT IF NOT EXISTS fk_post_comments_post FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;