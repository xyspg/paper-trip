-- Multi-tenant registry: trips, memberships, invites. Trip CONTENT lives in
-- each trip's Durable Object (named by trips.id); D1 only answers "which trips
-- exist, who belongs to them, who is invited".

CREATE TABLE trips (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  visibility  TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('public','private')),
  start_date  TEXT,
  end_date    TEXT,
  timezone    TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  created_by  TEXT,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);

CREATE TABLE trip_members (
  trip_id     TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('owner','member')),
  -- Roster/payer id inside the trip document: 'you'/'spr' on the legacy trip
  -- (expenses reference those), = user_id everywhere else.
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

-- Memberships provisioned for people who have never signed in, keyed by OAuth
-- account id (matches better-auth account.providerId/accountId). Promoted into
-- trip_members lazily on sign-in by claimMemberships (worker/registry.ts).
CREATE TABLE member_claims (
  trip_id      TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  provider_id  TEXT NOT NULL,
  account_id   TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('owner','member')),
  member_key   TEXT NOT NULL,
  display_name TEXT NOT NULL,
  color        TEXT,
  PRIMARY KEY (trip_id, provider_id, account_id)
);
