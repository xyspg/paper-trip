import type { Context } from "hono";

import { sessionUser } from "./auth";
import type { SessionUser } from "./auth";
import type { Env } from "./env";

// D1 registry: which trips exist, who belongs to them, who is invited. Trip
// CONTENT (items/expenses/…) lives in each trip's Durable Object; everything
// here is authorization and listing metadata.

// The pre-multi-tenant trip. Its DO name predates tripId generation, and its
// expenses reference the historical member keys 'you'/'spr'.
export const LEGACY_TRIP_ID = "anime-expo-2026";

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

export type Member = SessionUser & { role: TripRole; memberKey: string };

export function getTrip(db: D1Database, id: string): Promise<TripRow | null> {
  return db
    .prepare(
      "SELECT id, title, visibility, start_date, end_date, timezone, created_by, created_at FROM trips WHERE id = ?1",
    )
    .bind(id)
    .first<TripRow>();
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

// Promote member_claims rows (memberships provisioned by OAuth account id, for
// people who had never signed in) into real trip_members rows. Idempotent;
// returns whether anything was promoted so callers know to re-read.
export async function claimMemberships(db: D1Database, userId: string): Promise<boolean> {
  const accounts = await db
    .prepare('SELECT "providerId", "accountId" FROM account WHERE "userId" = ?1')
    .bind(userId)
    .all<{ providerId: string; accountId: string }>();

  let claimed = false;
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
    }
    await db
      .prepare("DELETE FROM member_claims WHERE provider_id = ?1 AND account_id = ?2")
      .bind(account.providerId, account.accountId)
      .run();
    claimed = true;
  }
  return claimed;
}

// Session + membership on one trip, in one call. Claims are promoted on a
// membership miss, so a freshly signed-in invitee/seeded admin resolves without
// depending on any auth-hook ordering. This replaces the ADMIN_IDS allowlist:
// authorization is "is a member of this trip", never a global admin bit.
export async function memberUser(
  c: Context<{ Bindings: Env }>,
  tripId: string,
): Promise<Member | null> {
  const user = await sessionUser(c);
  if (!user) return null;
  let membership = await getMembership(c.env.DB, tripId, user.id);
  if (!membership && (await claimMemberships(c.env.DB, user.id))) {
    membership = await getMembership(c.env.DB, tripId, user.id);
  }
  if (!membership) return null;
  return { ...user, role: membership.role, memberKey: membership.member_key };
}
