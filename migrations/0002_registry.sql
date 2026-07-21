-- Multi-tenant registry: trips, memberships, invites. Trip CONTENT lives in
-- each trip's Durable Object (named by trips.id); D1 only answers "which trips
-- exist, who belongs to them, who is invited".

CREATE TABLE trips (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  start_date  TEXT,
  end_date    TEXT,
  timezone    TEXT NOT NULL DEFAULT 'UTC',
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE trip_members (
  trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner','member')),
  -- Roster/payer id inside the trip document. Expenses reference this stable
  -- key even if the user's profile changes.
  member_key  TEXT NOT NULL,
  color       TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  PRIMARY KEY (trip_id, user_id)
);
CREATE INDEX trip_members_user_idx ON trip_members (user_id);

CREATE TABLE trip_invites (
  id          TEXT PRIMARY KEY,
  trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,             -- delivery address only, never authorization
  token_hash  TEXT NOT NULL UNIQUE,      -- b64url(sha256(token)); the raw token is never stored
  invited_by  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  expires_at  TEXT NOT NULL,
  accepted_by TEXT,
  accepted_at TEXT
);
CREATE INDEX trip_invites_trip_idx ON trip_invites (trip_id);
