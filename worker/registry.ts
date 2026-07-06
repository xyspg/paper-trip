import type { Context } from "hono";

import { sessionUser } from "./auth";
import type { SessionUser } from "./auth";
import { bytesToB64url } from "./b64";
import type { Env } from "./env";
import type { TripMember } from "../src/trip/types";

// D1 registry: which trips exist, who belongs to them, who is invited. Trip
// CONTENT (items/expenses/…) lives in each trip's Durable Object; everything
// here is authorization and listing metadata.

export { LEGACY_TRIP_ID } from "../src/trip/legacy";

export type TripVisibility = "public" | "private";
export type TripRole = "owner" | "member";

export type TripRow = {
  id: string;
  title: string;
  visibility: TripVisibility;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  created_by: string | null;
  created_at: string;
};

export type MembershipRow = {
  trip_id: string;
  user_id: string;
  role: TripRole;
  member_key: string;
  color: string | null;
};

export type MemberDetail = {
  userId: string;
  role: TripRole;
  memberKey: string;
  color: string | null;
  name: string;
  login: string | null;
  image: string | null;
};

export type ClaimRow = {
  member_key: string;
  role: TripRole;
  display_name: string;
  color: string | null;
};

export type Member = SessionUser & { role: TripRole; memberKey: string };

// Roster swatches handed out round-robin as members join a trip (shared with
// the client fallback so both sides always agree).
export { MEMBER_COLORS } from "../src/trip/roster";

export function getTrip(db: D1Database, id: string): Promise<TripRow | null> {
  return db
    .prepare(
      "SELECT id, title, visibility, start_date, end_date, timezone, created_by, created_at FROM trips WHERE id = ?1",
    )
    .bind(id)
    .first<TripRow>();
}

export async function listTripsForUser(
  db: D1Database,
  userId: string,
): Promise<(TripRow & { role: TripRole })[]> {
  const rows = await db
    .prepare(
      "SELECT t.id, t.title, t.visibility, t.start_date, t.end_date, t.timezone, t.created_by, t.created_at, m.role FROM trips t JOIN trip_members m ON m.trip_id = t.id WHERE m.user_id = ?1 ORDER BY t.created_at DESC",
    )
    .bind(userId)
    .all<TripRow & { role: TripRole }>();
  return rows.results;
}

export async function createTrip(
  db: D1Database,
  trip: {
    id: string;
    title: string;
    visibility: TripVisibility;
    startDate: string | null;
    endDate: string | null;
    timezone: string;
    createdBy: string;
  },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO trips (id, title, visibility, start_date, end_date, timezone, created_by) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
    )
    .bind(
      trip.id,
      trip.title,
      trip.visibility,
      trip.startDate,
      trip.endDate,
      trip.timezone,
      trip.createdBy,
    )
    .run();
}

// undefined = keep the stored value; null (dates only) = clear it. Built as a
// dynamic SET list because COALESCE can't express "set to NULL".
export async function updateTrip(
  db: D1Database,
  id: string,
  patch: {
    title?: string;
    visibility?: TripVisibility;
    startDate?: string | null;
    endDate?: string | null;
    timezone?: string;
  },
): Promise<void> {
  const sets: string[] = [];
  const binds: (string | null)[] = [];
  const add = (column: string, value: string | null) => {
    sets.push(`${column} = ?${binds.length + 2}`);
    binds.push(value);
  };
  if (patch.title !== undefined) add("title", patch.title);
  if (patch.visibility !== undefined) add("visibility", patch.visibility);
  if (patch.startDate !== undefined) add("start_date", patch.startDate);
  if (patch.endDate !== undefined) add("end_date", patch.endDate);
  if (patch.timezone !== undefined) add("timezone", patch.timezone);
  if (sets.length === 0) return;
  await db
    .prepare(`UPDATE trips SET ${sets.join(", ")} WHERE id = ?1`)
    .bind(id, ...binds)
    .run();
}

export async function deleteTrip(db: D1Database, id: string): Promise<void> {
  // Members/invites/claims cascade via their trip_id foreign keys.
  await db.prepare("DELETE FROM trips WHERE id = ?1").bind(id).run();
}

export function getMembership(
  db: D1Database,
  tripId: string,
  userId: string,
): Promise<MembershipRow | null> {
  return db
    .prepare(
      "SELECT trip_id, user_id, role, member_key, color FROM trip_members WHERE trip_id = ?1 AND user_id = ?2",
    )
    .bind(tripId, userId)
    .first<MembershipRow>();
}

export async function addMembership(
  db: D1Database,
  m: { tripId: string; userId: string; role: TripRole; memberKey: string; color: string | null },
): Promise<void> {
  await db
    .prepare(
      "INSERT OR IGNORE INTO trip_members (trip_id, user_id, role, member_key, color) VALUES (?1, ?2, ?3, ?4, ?5)",
    )
    .bind(m.tripId, m.userId, m.role, m.memberKey, m.color)
    .run();
}

export async function removeMembership(
  db: D1Database,
  tripId: string,
  userId: string,
): Promise<void> {
  await db
    .prepare("DELETE FROM trip_members WHERE trip_id = ?1 AND user_id = ?2")
    .bind(tripId, userId)
    .run();
}

export async function listMembers(db: D1Database, tripId: string): Promise<MemberDetail[]> {
  const rows = await db
    .prepare(
      'SELECT m.user_id AS userId, m.role, m.member_key AS memberKey, m.color, u.name, u.login, u.image FROM trip_members m JOIN "user" u ON u.id = m.user_id WHERE m.trip_id = ?1 ORDER BY m.created_at',
    )
    .bind(tripId)
    .all<MemberDetail>();
  return rows.results;
}

export async function listClaims(db: D1Database, tripId: string): Promise<ClaimRow[]> {
  const rows = await db
    .prepare(
      "SELECT member_key, role, display_name, color FROM member_claims WHERE trip_id = ?1",
    )
    .bind(tripId)
    .all<ClaimRow>();
  return rows.results;
}

export async function countMembers(db: D1Database, tripId: string): Promise<number> {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM trip_members WHERE trip_id = ?1")
    .bind(tripId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

// Who a worker-internal DO call acts for, so its audit rows carry a verified
// identity instead of the "public" fallback.
export type InternalActor = { id: string; login: string; email: string };

export function internalHeaders(actor?: InternalActor): HeadersInit {
  return {
    "content-type": "application/json",
    "x-actor-id": actor?.id ?? "",
    "x-actor-login": actor?.login ?? "system",
    "x-actor-email": actor?.email ?? "",
  };
}

export const actorOf = (u: SessionUser): InternalActor => ({
  id: u.id,
  login: u.login,
  email: u.email,
});

// Push the current roster (real members + unclaimed seed placeholders) into
// the trip's DO, where it lives as trip.members. Call after every membership
// change so the document all clients render never drifts from the registry.
export async function syncRoster(
  env: Env,
  tripId: string,
  actor?: InternalActor,
): Promise<void> {
  const [members, claims] = await Promise.all([
    listMembers(env.DB, tripId),
    listClaims(env.DB, tripId),
  ]);
  const roster: TripMember[] = [
    ...members.map((m) => ({
      id: m.memberKey,
      userId: m.userId,
      name: m.name || m.login || m.userId,
      avatarUrl: m.image ?? undefined,
      color: m.color ?? undefined,
    })),
    ...claims.map((cl) => ({
      id: cl.member_key,
      name: cl.display_name,
      color: cl.color ?? undefined,
    })),
  ];
  await env.TRIPS.getByName(tripId).fetch(
    new Request("https://do/internal/members", {
      method: "POST",
      headers: internalHeaders(actor),
      body: JSON.stringify({ members: roster }),
    }),
  );
}

// ---- invites (bearer-link semantics: the emailed token IS the credential;
// the email address is delivery only, never authorization) ----

export type InviteRow = {
  id: string;
  trip_id: string;
  email: string;
  invited_by: string;
  created_at: string;
  expires_at: string;
  accepted_by: string | null;
  accepted_at: string | null;
};

// Only the SHA-256 of the token is stored; a D1 leak can't mint invitations.
export async function hashInviteToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return bytesToB64url(new Uint8Array(digest));
}

export async function createInviteRow(
  db: D1Database,
  invite: {
    id: string;
    tripId: string;
    email: string;
    tokenHash: string;
    invitedBy: string;
    expiresAt: string;
  },
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO trip_invites (id, trip_id, email, token_hash, invited_by, expires_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
    )
    .bind(invite.id, invite.tripId, invite.email, invite.tokenHash, invite.invitedBy, invite.expiresAt)
    .run();
}

// Open (not yet accepted) invites, newest first. Expired ones stay listed so
// the owner can see and revoke them.
export async function listInvites(db: D1Database, tripId: string): Promise<InviteRow[]> {
  const rows = await db
    .prepare(
      "SELECT id, trip_id, email, invited_by, created_at, expires_at, accepted_by, accepted_at FROM trip_invites WHERE trip_id = ?1 AND accepted_by IS NULL ORDER BY created_at DESC",
    )
    .bind(tripId)
    .all<InviteRow>();
  return rows.results;
}

export function getInviteByHash(
  db: D1Database,
  tokenHash: string,
): Promise<(InviteRow & { trip_title: string; inviter_name: string | null }) | null> {
  return db
    .prepare(
      'SELECT i.id, i.trip_id, i.email, i.invited_by, i.created_at, i.expires_at, i.accepted_by, i.accepted_at, t.title AS trip_title, COALESCE(u.name, u.login) AS inviter_name FROM trip_invites i JOIN trips t ON t.id = i.trip_id LEFT JOIN "user" u ON u.id = i.invited_by WHERE i.token_hash = ?1',
    )
    .bind(tokenHash)
    .first<InviteRow & { trip_title: string; inviter_name: string | null }>();
}

export async function deleteInvite(db: D1Database, tripId: string, id: string): Promise<boolean> {
  const res = await db
    .prepare("DELETE FROM trip_invites WHERE trip_id = ?1 AND id = ?2")
    .bind(tripId, id)
    .run();
  return (res.meta.changes ?? 0) > 0;
}

export async function markInviteAccepted(
  db: D1Database,
  id: string,
  userId: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE trip_invites SET accepted_by = ?2, accepted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?1",
    )
    .bind(id, userId)
    .run();
}

// Promote member_claims rows (memberships provisioned by OAuth account id, for
// people who had never signed in) into real trip_members rows. Idempotent;
// returns the trip ids that gained a membership so callers can re-read and
// re-sync those rosters.
export async function claimMemberships(db: D1Database, userId: string): Promise<string[]> {
  // Steady-state fast path: claims exist only around seeding/provisioning, so
  // one cheap probe usually replaces the per-account scans below.
  const anyClaims = await db.prepare("SELECT 1 FROM member_claims LIMIT 1").first();
  if (!anyClaims) return [];

  const accounts = await db
    .prepare('SELECT "providerId", "accountId" FROM account WHERE "userId" = ?1')
    .bind(userId)
    .all<{ providerId: string; accountId: string }>();

  const claimedTripIds: string[] = [];
  for (const account of accounts.results) {
    const claims = await db
      .prepare(
        "SELECT trip_id, role, member_key, color FROM member_claims WHERE provider_id = ?1 AND account_id = ?2",
      )
      .bind(account.providerId, account.accountId)
      .all<{ trip_id: string; role: TripRole; member_key: string; color: string | null }>();
    if (claims.results.length === 0) continue;

    for (const claim of claims.results) {
      await db
        .prepare(
          "INSERT OR IGNORE INTO trip_members (trip_id, user_id, role, member_key, color) VALUES (?1, ?2, ?3, ?4, ?5)",
        )
        .bind(claim.trip_id, userId, claim.role, claim.member_key, claim.color)
        .run();
      claimedTripIds.push(claim.trip_id);
    }
    await db
      .prepare("DELETE FROM member_claims WHERE provider_id = ?1 AND account_id = ?2")
      .bind(account.providerId, account.accountId)
      .run();
  }
  return claimedTripIds;
}

// Session and membership on one trip, resolved together. Claims are promoted
// on a membership miss (and the affected rosters re-synced), so a freshly
// signed-in invitee/seeded admin resolves without depending on any auth-hook
// ordering. This replaces the ADMIN_IDS allowlist: authorization is "is a
// member of this trip", never a global admin bit.
export async function sessionMember(
  c: Context<{ Bindings: Env }>,
  tripId: string,
): Promise<{ user: SessionUser | null; member: Member | null }> {
  const user = await sessionUser(c);
  if (!user) return { user: null, member: null };
  let membership = await getMembership(c.env.DB, tripId, user.id);
  if (!membership) {
    const claimed = await claimMemberships(c.env.DB, user.id);
    if (claimed.length > 0) {
      await Promise.all(claimed.map((id) => syncRoster(c.env, id, actorOf(user))));
      membership = await getMembership(c.env.DB, tripId, user.id);
    }
  }
  if (!membership) return { user, member: null };
  return { user, member: { ...user, role: membership.role, memberKey: membership.member_key } };
}

export async function memberUser(
  c: Context<{ Bindings: Env }>,
  tripId: string,
): Promise<Member | null> {
  return (await sessionMember(c, tripId)).member;
}
