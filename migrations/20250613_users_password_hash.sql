-- Email/password signup requires password_hash on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR;
