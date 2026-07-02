-- Register the pre-multi-tenant trip. Its Durable Object keeps the name
-- "anime-expo-2026", so all existing state/audit/backups survive untouched.
-- Public preserves today's anonymous-read behavior.
INSERT INTO trips (id, title, visibility, start_date, end_date, timezone)
VALUES ('anime-expo-2026', 'Anime Expo 2026', 'public', '2026-07-03', '2026-07-05', 'America/Los_Angeles');

-- The two humans from the retired ADMIN_IDS allowlist, as claims: better-auth
-- user ids don't exist until first sign-in, so membership is keyed by GitHub
-- numeric id here and promoted to trip_members on their next login.
-- member_key preserves the payer ids the legacy expenses reference.
INSERT INTO member_claims (trip_id, provider_id, account_id, role, member_key, display_name, color) VALUES
  ('anime-expo-2026', 'github', '42668274',  'owner',  'you', 'xyspg',           '#3f6f5b'),
  ('anime-expo-2026', 'github', '194129427', 'member', 'spr', 'Sapphire Rapids', '#5b7a99');
