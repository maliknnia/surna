-- Family / inner-circle list for location sharing (Snapchat-style)
CREATE TABLE IF NOT EXISTS "user_location_circles" (
  "id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "member_id" varchar NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "circle" varchar DEFAULT 'family' NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "user_location_circles_user_member_circle"
  ON "user_location_circles" ("user_id", "member_id", "circle");

CREATE INDEX IF NOT EXISTS "user_location_circles_user_id_idx"
  ON "user_location_circles" ("user_id");
