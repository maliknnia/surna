-- Performance indexes on most-queried columns (userId, teamId, eventId, createdAt, lat/lng).
-- Idempotent — safe to re-run.

CREATE INDEX IF NOT EXISTS posts_author_created_idx ON posts (author_id, created_at DESC);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS post_likes_post_user_idx ON post_likes (post_id, user_id);
CREATE INDEX IF NOT EXISTS post_likes_user_created_idx ON post_likes (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_comments_post_created_idx ON post_comments (post_id, created_at DESC);
CREATE INDEX IF NOT EXISTS post_comments_author_created_idx ON post_comments (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_shares_post_user_idx ON post_shares (post_id, user_id);
CREATE INDEX IF NOT EXISTS post_shares_user_created_idx ON post_shares (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS post_media_post_created_idx ON post_media (post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS team_members_team_user_idx ON team_members (team_id, user_id);
CREATE INDEX IF NOT EXISTS team_members_user_idx ON team_members (user_id);

CREATE INDEX IF NOT EXISTS team_join_requests_team_user_idx ON team_join_requests (team_id, user_id);
CREATE INDEX IF NOT EXISTS team_join_requests_team_created_idx ON team_join_requests (team_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_created_idx ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS notifications_user_read_idx ON notifications (user_id, is_read);

CREATE INDEX IF NOT EXISTS events_organizer_created_idx ON events (organizer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_start_date_idx ON events (start_date);
CREATE INDEX IF NOT EXISTS events_lat_lng_idx ON events (lat, lng);

CREATE INDEX IF NOT EXISTS event_participants_event_user_idx ON event_participants (event_id, user_id);
CREATE INDEX IF NOT EXISTS event_participants_user_idx ON event_participants (user_id);

CREATE INDEX IF NOT EXISTS event_rsvps_event_user_idx ON event_rsvps (event_id, user_id);
CREATE INDEX IF NOT EXISTS event_rsvps_event_created_idx ON event_rsvps (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS event_updates_event_created_idx ON event_updates (event_id, created_at DESC);

CREATE INDEX IF NOT EXISTS person_presence_lat_lng_idx ON person_presence (lat, lng);
CREATE INDEX IF NOT EXISTS person_presence_user_idx ON person_presence (user_id);

CREATE INDEX IF NOT EXISTS places_lat_lng_idx ON places (latitude, longitude);
CREATE INDEX IF NOT EXISTS places_owner_created_idx ON places (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS stories_user_created_idx ON stories (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS saved_posts_user_created_idx ON saved_posts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_posts_post_idx ON saved_posts (post_id);

CREATE INDEX IF NOT EXISTS stream_sessions_team_created_idx ON stream_sessions (team_id, created_at DESC);
CREATE INDEX IF NOT EXISTS stream_sessions_event_idx ON stream_sessions (event_id);

CREATE INDEX IF NOT EXISTS instant_teams_lat_lng_idx ON instant_teams (lat, lng);
CREATE INDEX IF NOT EXISTS instant_teams_created_at_idx ON instant_teams (created_at DESC);

CREATE INDEX IF NOT EXISTS instant_team_members_team_user_idx ON instant_team_members (team_id, user_id);
CREATE INDEX IF NOT EXISTS instant_team_members_user_idx ON instant_team_members (user_id);

CREATE INDEX IF NOT EXISTS point_transactions_user_created_idx ON point_transactions (user_id, created_at DESC);
