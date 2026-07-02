import type { Context } from "hono";

import { sessionUser } from "./auth";
import type { SessionUser } from "./auth";
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

// Roster swatches handed out round-robin as members join a trip.
export const MEMBER_COLORS = ["#3f6f5b", "#5b7a99", "#b08648", "#7a5c84", "#c2553f"];

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
  await db
    .prepare(
      "UPDATE trips SET title = COALESCE(?2, title), visibility = COALESCE(?3, visibility), start_date = COALESCE(?4, start_date), end_date = COALESCE(?5, end_date), timezone = COALESCE(?6, timezone) WHERE id = ?1",
    )
    .bind(
      id,
      patch.title ?? null,
      patch.visibility ?? null,
      patch.startDate ?? null,
      patch.endDate ?? null,
      patch.timezone ?? null,
    )
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

// Push the current roster (real members + unclaimed seed placeholders) into
// the trip's DO, where it lives as trip.members. Call after every membership
// change so the document all clients render never drifts from the registry.
export async function syncRoster(env: Env, tripId: string): Promise<void> {
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
  await env.AX26.getByName(tripId).fetch(
    new Request("https://do/internal/members", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ members: roster }),
    }),
  );
}

// Promote member_claims rows (memberships provisioned by OAuth account id, for
// people who had never signed in) into real trip_members rows. Idempotent;
// returns the trip ids that gained a membership so callers can re-read and
// re-sync those rosters.
export async function claimMemberships(db: D1Database, userId: string): Promise<string[]> {
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
      await Promise.all(claimed.map((id) => syncRoster(c.env, id)));
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
