CREATE UNIQUE INDEX IF NOT EXISTS user_reviews_subject_author_idx
  ON user_reviews (subject_id, author_id);
