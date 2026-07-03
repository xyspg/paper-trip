import { Hono } from "hono";
import type { Context } from "hono";

import { createAuth } from "./auth";
import { agentUser, signAgentToken } from "./agentToken";
import type { AgentClaims } from "./agentToken";
import {
  LEGACY_TRIP_ID,
  MEMBER_COLORS,
  addMembership,
  claimMemberships,
  countMembers,
  createInviteRow,
  createTrip,
  deleteInvite,
  deleteTrip,
  getInviteByHash,
  getMembership,
  getTrip,
  hashInviteToken,
  listClaims,
  listInvites,
  listMembers,
  listTripsForUser,
  markInviteAccepted,
  memberUser,
  removeMembership,
  sessionMember,
  syncRoster,
  updateTrip,
} from "./registry";
import type { InviteRow } from "./registry";
import { sendInviteEmail } from "./email";
import { bytesToB64url } from "./agentToken";
import type { Member, TripRow, TripVisibility } from "./registry";
import { sessionUser } from "./auth";
import receipt from "./receipt";
import type { Env } from "./env";
import type { TripOp } from "../src/trip/ops";

export { AX26DurableObject } from "./AX26DurableObject";

// Ops a public visitor may run on a PUBLIC trip without signing in: toggling a
// stop's status and submitting a comment. Private trips accept nothing
// anonymous. Unknown ops fail closed.
const PUBLIC_OPS = new Set<TripOp["type"]>(["setItemStatus", "addSuggestion"]);

// Destructive bulk ops: owner-only. A member can edit any content, but only
// the trip's owner may wipe it wholesale.
const OWNER_OPS = new Set<TripOp["type"]>(["reset", "resetExpenses", "clearSuggestions"]);

// Ops a bearer-token agent may run: every content edit, but never the
// destructive bulk ops — those stay behind a human owner session. Unknown ops
// fail closed here too.
const AGENT_OPS = new Set<TripOp["type"]>([
  "setItemStatus",
  "updateItem",
  "addItem",
  "deleteItem",
  "setChecklistItem",
  "addSuggestion",
  "setSuggestionStatus",
  "deleteSuggestion",
  "addExpense",
  "updateExpense",
  "deleteExpense",
  "setExpenseAmount",
  "setExpensePayer",
  "setExpenseSplit",
]);

// What forward() stamps into x-actor-* headers. Sessions map 1:1; agent
// tokens keep the minter's user id but prefix the login with `agent:` so the
// audit trail separates human clicks from delegated agent writes at a glance.
type Actor = { id: string | null; login: string; email: string };
const sessionActor = (u: Member): Actor => ({ id: u.id, login: u.login, email: u.email });
const agentActor = (a: AgentClaims): Actor => ({ id: a.sub, login: `agent:${a.login}`, email: "" });

// Registry row → the JSON shape the client consumes.
const tripMeta = (t: TripRow) => ({
  id: t.id,
  title: t.title,
  visibility: t.visibility,
  startDate: t.start_date,
  endDate: t.end_date,
  timezone: t.timezone,
  createdAt: t.created_at,
});

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const asDate = (v: unknown): string | null => (typeof v === "string" && DATE_RE.test(v) ? v : null);
const asVisibility = (v: unknown): TripVisibility | null =>
  v === "public" || v === "private" ? v : null;

// Short random slug; ~51 bits, plenty for a friend-circle registry (creation
// retries on the astronomically unlikely collision).
function newTripId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

const app = new Hono<{ Bindings: Env }>();

app.get("/api", (c) => c.text("ok"));

// better-auth owns /api/auth/* (sign-in/social, callback/github, get-session,
// sign-out, …). Sessions live in D1 + an httpOnly cookie it manages.
app.on(["GET", "POST"], "/api/auth/*", (c) => createAuth(c.env).handler(c.req.raw));

app.route("/api/receipt", receipt);

// Mint an expiring bearer token for a local agent (the /admin/agent flow).
// Membership-gated; signed with AGENT_TOKEN_SECRET (never the session secret).
app.post("/api/agent/token", async (c) => {
  const user = await memberUser(c, LEGACY_TRIP_ID);
  if (!user) return c.json({ error: "forbidden" }, 403);
  const secret = c.env.AGENT_TOKEN_SECRET;
  if (!secret) return c.json({ error: "config" }, 500);
  const body = await c.req
    .json<{ ttlDays?: number }>()
    .catch(() => ({}) as { ttlDays?: number });
  const ttlDays = Math.min(365, Math.max(1, Math.round(body.ttlDays ?? 90)));
  const exp = Math.floor(Date.now() / 1000) + ttlDays * 86400;
  const token = await signAgentToken(
    { kind: "agent", sub: user.id, login: user.login, tripId: LEGACY_TRIP_ID, exp },
    secret,
  );
  return c.json({ token, exp });
});

// Parking pass links are capability URLs — knowing one is full authority to
// edit or cancel the reservation — so the real URL never leaves the server.
// Legacy-trip members get a 302 to the provider; everyone else a 403.
app.get("/api/parking-pass/:rid", async (c) => {
  if (!(await memberUser(c, LEGACY_TRIP_ID))) return c.json({ error: "forbidden" }, 403);
  let urls: Record<string, string> = {};
  try {
    urls = JSON.parse(c.env.PARKING_PASS_URLS ?? "{}") as Record<string, string>;
  } catch {
    // Malformed secret reads as "no passes configured" and falls through to 404.
  }
  const url = urls[c.req.param("rid")];
  if (!url) return c.json({ error: "not found" }, 404);
  return c.redirect(url, 302);
});

// ---- registry: trips, members ----

app.get("/api/trips", async (c) => {
  const user = await sessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  // Promote any pending seed/invite claims first so a first-ever sign-in
  // already sees the trips waiting for them.
  const claimed = await claimMemberships(c.env.DB, user.id);
  await Promise.all(claimed.map((id) => syncRoster(c.env, id)));
  const trips = await listTripsForUser(c.env.DB, user.id);
  return c.json({ trips: trips.map((t) => ({ ...tripMeta(t), role: t.role })) });
});

app.post("/api/trips", async (c) => {
  const user = await sessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    timezone?: unknown;
    visibility?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title.trim().slice(0, 120) : "";
  if (!title) return c.json({ error: "title_required" }, 400);
  const startDate = asDate(body?.startDate);
  const endDate = asDate(body?.endDate);
  const timezone =
    typeof body?.timezone === "string" && body.timezone ? body.timezone : "America/Los_Angeles";
  const visibility = asVisibility(body?.visibility) ?? "private";

  // Retry the slug on collision; two failures in a row means something is
  // deeply wrong with the RNG, not the registry.
  let id = newTripId();
  for (let attempt = 0; (await getTrip(c.env.DB, id)) && attempt < 2; attempt++) {
    id = newTripId();
  }

  await createTrip(c.env.DB, {
    id,
    title,
    visibility,
    startDate,
    endDate,
    timezone,
    createdBy: user.id,
  });
  await addMembership(c.env.DB, {
    tripId: id,
    userId: user.id,
    role: "owner",
    memberKey: user.id,
    color: MEMBER_COLORS[0],
  });
  const init = await c.env.AX26.getByName(id).fetch(
    new Request("https://do/internal/init", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        tripId: id,
        title,
        dates: { start: startDate ?? "", end: endDate ?? "" },
        timezone,
      }),
    }),
  );
  if (!init.ok) {
    // Roll the registry back so a botched init isn't a permanent ghost row.
    await deleteTrip(c.env.DB, id);
    return c.json({ error: "init_failed" }, 500);
  }
  await syncRoster(c.env, id);
  const trip = await getTrip(c.env.DB, id);
  return c.json({ trip: trip ? { ...tripMeta(trip), role: "owner" as const } : null }, 201);
});

app.get("/api/trips/:tripId", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);
  const { user, member } = await sessionMember(c, tripId);
  if (trip.visibility === "private" && !member) {
    return c.json({ error: user ? "forbidden" : "unauthorized" }, user ? 403 : 401);
  }
  return c.json({ trip: { ...tripMeta(trip), role: member?.role ?? null } });
});

app.patch("/api/trips/:tripId", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (member?.role !== "owner") return c.json({ error: "forbidden" }, 403);

  const body = (await c.req.json().catch(() => null)) as {
    title?: unknown;
    startDate?: unknown;
    endDate?: unknown;
    timezone?: unknown;
    visibility?: unknown;
  } | null;
  if (!body) return c.json({ error: "bad_request" }, 400);

  const patch = {
    title:
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim().slice(0, 120)
        : undefined,
    visibility: asVisibility(body.visibility) ?? undefined,
    startDate: asDate(body.startDate) ?? undefined,
    endDate: asDate(body.endDate) ?? undefined,
    timezone: typeof body.timezone === "string" && body.timezone ? body.timezone : undefined,
  };
  await updateTrip(c.env.DB, tripId, patch);

  // Mirror document-visible metadata into the DO so mastheads update live.
  if (patch.title || patch.startDate || patch.endDate || patch.timezone) {
    await c.env.AX26.getByName(tripId).fetch(
      new Request("https://do/internal/meta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          title: patch.title,
          dates: { start: patch.startDate, end: patch.endDate },
          timezone: patch.timezone,
        }),
      }),
    );
  }
  const updated = await getTrip(c.env.DB, tripId);
  return c.json({ trip: updated ? { ...tripMeta(updated), role: "owner" as const } : null });
});

app.delete("/api/trips/:tripId", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (member?.role !== "owner") return c.json({ error: "forbidden" }, 403);
  // Registry row first (the trip disappears from lists even if the DO wipe
  // needs a retry), then the DO's storage.
  await deleteTrip(c.env.DB, tripId);
  await c.env.AX26.getByName(tripId).fetch(
    new Request("https://do/internal/destroy", { method: "POST" }),
  );
  return c.json({ ok: true });
});

app.get("/api/trips/:tripId/members", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (!member) return c.json({ error: "forbidden" }, 403);
  const [members, claims] = await Promise.all([
    listMembers(c.env.DB, tripId),
    listClaims(c.env.DB, tripId),
  ]);
  return c.json({
    members: members.map((m) => ({
      userId: m.userId,
      memberKey: m.memberKey,
      role: m.role,
      name: m.name,
      login: m.login,
      image: m.image,
      color: m.color,
    })),
    // Seeded people who have never signed in; they hold a claim, not an account.
    pending: claims.map((cl) => ({
      memberKey: cl.member_key,
      role: cl.role,
      name: cl.display_name,
      color: cl.color,
    })),
  });
});

app.delete("/api/trips/:tripId/members/:userId", async (c) => {
  const tripId = c.req.param("tripId");
  const targetId = c.req.param("userId");
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (member?.role !== "owner") return c.json({ error: "forbidden" }, 403);
  const target = await getMembership(c.env.DB, tripId, targetId);
  if (!target) return c.json({ error: "not_found" }, 404);
  if (target.role === "owner") return c.json({ error: "cannot_remove_owner" }, 403);
  await removeMembership(c.env.DB, tripId, targetId);
  await syncRoster(c.env, tripId);
  return c.json({ ok: true, members: await countMembers(c.env.DB, tripId) });
});

// ---- invites (owner sends; the emailed token is a bearer credential) ----

// The origin invite links point at. APP_ORIGIN wins in production; behind
// Portless/Vite the worker sees an internal host, so fall back to the
// forwarded headers the proxy sets.
function publicOrigin(c: Context<{ Bindings: Env }>): string {
  if (c.env.APP_ORIGIN) return c.env.APP_ORIGIN;
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
  const proto = c.req.header("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(c.req.url).origin;
}

const inviteInfo = (row: InviteRow) => ({
  id: row.id,
  email: row.email,
  createdAt: row.created_at,
  expiresAt: row.expires_at,
  expired: row.expires_at < new Date().toISOString(),
});

app.post("/api/trips/:tripId/invites", async (c) => {
  const tripId = c.req.param("tripId");
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (member?.role !== "owner") return c.json({ error: "forbidden" }, 403);

  const body = (await c.req.json().catch(() => null)) as { email?: unknown } | null;
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 254 || !email.includes("@")) {
    return c.json({ error: "bad_email" }, 400);
  }

  const token = bytesToB64url(crypto.getRandomValues(new Uint8Array(32)));
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 7 * 86400_000).toISOString();
  await createInviteRow(c.env.DB, {
    id,
    tripId,
    email,
    tokenHash: await hashInviteToken(token),
    invitedBy: member.id,
    expiresAt,
  });

  // The raw token exists only in this response (and the email); D1 keeps the
  // hash. If mail fails the owner still gets a copyable accept link.
  const acceptUrl = `${publicOrigin(c)}/invite/${token}`;
  const mail = await sendInviteEmail(c.env, {
    to: email,
    tripTitle: trip.title,
    inviterName: member.name?.trim() || member.login,
    acceptUrl,
  });

  return c.json(
    {
      invite: { id, email, createdAt: new Date().toISOString(), expiresAt, expired: false },
      acceptUrl,
      emailSent: mail.sent,
      emailError: mail.error ?? null,
    },
    201,
  );
});

app.get("/api/trips/:tripId/invites", async (c) => {
  const tripId = c.req.param("tripId");
  if (!(await getTrip(c.env.DB, tripId))) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (member?.role !== "owner") return c.json({ error: "forbidden" }, 403);
  const invites = await listInvites(c.env.DB, tripId);
  return c.json({ invites: invites.map(inviteInfo) });
});

app.delete("/api/trips/:tripId/invites/:id", async (c) => {
  const tripId = c.req.param("tripId");
  if (!(await getTrip(c.env.DB, tripId))) return c.json({ error: "not_found" }, 404);
  const { member } = await sessionMember(c, tripId);
  if (member?.role !== "owner") return c.json({ error: "forbidden" }, 403);
  const removed = await deleteInvite(c.env.DB, tripId, c.req.param("id"));
  if (!removed) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

// Preview for the /invite/:token landing page. The token itself is the
// capability, so this is public; it exposes only the trip title + inviter.
app.get("/api/invites/:token", async (c) => {
  const row = await getInviteByHash(c.env.DB, await hashInviteToken(c.req.param("token")));
  if (!row) return c.json({ status: "invalid" });
  const status = row.accepted_by
    ? "used"
    : row.expires_at < new Date().toISOString()
      ? "expired"
      : "valid";
  return c.json({
    status,
    tripTitle: row.trip_title,
    inviterName: row.inviter_name ?? "行程创建者",
  });
});

app.post("/api/invites/:token/accept", async (c) => {
  const user = await sessionUser(c);
  if (!user) return c.json({ error: "unauthorized" }, 401);
  const row = await getInviteByHash(c.env.DB, await hashInviteToken(c.req.param("token")));
  if (!row) return c.json({ error: "invalid" }, 404);

  // Already on the roster (e.g. double-click, or invited twice): idempotent ok.
  if (await getMembership(c.env.DB, row.trip_id, user.id)) {
    return c.json({ ok: true, tripId: row.trip_id });
  }
  if (row.accepted_by) return c.json({ error: "used" }, 409);
  if (row.expires_at < new Date().toISOString()) return c.json({ error: "expired" }, 410);

  const count = await countMembers(c.env.DB, row.trip_id);
  await addMembership(c.env.DB, {
    tripId: row.trip_id,
    userId: user.id,
    role: "member",
    memberKey: user.id,
    color: MEMBER_COLORS[count % MEMBER_COLORS.length],
  });
  await markInviteAccepted(c.env.DB, row.id, user.id);
  await syncRoster(c.env, row.trip_id);
  return c.json({ ok: true, tripId: row.trip_id });
});

// ---- trip content: forwarded to the trip's Durable Object ----

app.all("/api/trips/:tripId/trip", (c) => handleTripTraffic(c, c.req.param("tripId"), "/api/trip"));
app.get("/api/trips/:tripId/audit", (c) =>
  handleTripTraffic(c, c.req.param("tripId"), "/api/trip/audit"),
);
app.all("/api/trips/:tripId/backups", (c) =>
  handleTripTraffic(c, c.req.param("tripId"), "/api/trip/backups"),
);
app.all("/api/trips/:tripId/backups/*", (c) => {
  const suffix = new URL(c.req.url).pathname.split("/backups/")[1] ?? "";
  return handleTripTraffic(c, c.req.param("tripId"), `/api/trip/backups/${suffix}`);
});

// Legacy alias: the pre-multi-tenant client talked to /api/trip* with no trip
// id. Kept until the frontend is fully re-routed (Phase 3), then deleted.
app.all("/api/trip", (c) => handleTripTraffic(c, LEGACY_TRIP_ID, "/api/trip"));
app.all("/api/trip/*", (c) =>
  handleTripTraffic(c, LEGACY_TRIP_ID, new URL(c.req.url).pathname),
);

// Reads and WebSocket upgrades are open on public trips and member/agent-only
// on private ones; writes are gated by credential: member session (everything;
// destructive bulk ops owner-only), agent bearer token (AGENT_OPS + whole-trip
// PUT + backup list/create), anonymous (PUBLIC_OPS on public trips only). We
// peek the op from a clone so the original body still reaches the DO.
async function handleTripTraffic(
  c: Context<{ Bindings: Env }>,
  tripId: string,
  doPath: string,
): Promise<Response> {
  const trip = await getTrip(c.env.DB, tripId);
  if (!trip) return c.json({ error: "not_found" }, 404);

  const req = c.req.raw;
  const { user, member } = await sessionMember(c, tripId);
  const agent = member ? null : await agentUser(c, tripId);

  // The audit trail is member-only to read; never expose it to visitors or agents.
  if (req.method === "GET" && doPath === "/api/trip/audit") {
    if (!member) return c.json({ error: "forbidden" }, 403);
    return forward(c, tripId, doPath);
  }

  // Backups include full trip snapshots and restore/delete actions. Members
  // list/create; restore/delete are owner-only. Agents may only list and
  // create on the collection path (SKILL.md tells them to snapshot before a
  // bulk PUT).
  if (doPath === "/api/trip/backups" || doPath.startsWith("/api/trip/backups/")) {
    const destructive = doPath !== "/api/trip/backups";
    if (member) {
      if (destructive && member.role !== "owner") return c.json({ error: "forbidden" }, 403);
      return forward(c, tripId, doPath, sessionActor(member));
    }
    if (agent && !destructive && (req.method === "GET" || req.method === "POST")) {
      return forward(c, tripId, doPath, agentActor(agent));
    }
    return c.json({ error: "forbidden" }, 403);
  }

  // Whole-trip replacement (rev-checked in the DO). Requires membership or an
  // agent token — once the DO answers PUT, an ungated PUT would be anonymous
  // full write.
  if (req.method === "PUT" && doPath === "/api/trip") {
    if (member) return forward(c, tripId, doPath, sessionActor(member));
    if (agent) return forward(c, tripId, doPath, agentActor(agent));
    return c.json({ error: "unauthorized" }, 401);
  }

  if (req.method === "POST") {
    const op = (await req
      .clone()
      .json()
      .catch(() => null)) as TripOp | null;
    if (member) {
      if (op && OWNER_OPS.has(op.type) && member.role !== "owner") {
        return c.json({ error: "owner_only" }, 403);
      }
      return forward(c, tripId, doPath, sessionActor(member));
    }
    if (agent) {
      if (!op || !AGENT_OPS.has(op.type)) return c.json({ error: "op_not_allowed" }, 403);
      return forward(c, tripId, doPath, agentActor(agent));
    }
    if (trip.visibility !== "public" || !op || !PUBLIC_OPS.has(op.type)) {
      return c.json({ error: "forbidden" }, 403);
    }
    // Stamp the verified actor onto the request the DO records in its audit log.
    // We always `set` (never trust an inbound x-actor-* header), so a client
    // cannot forge an operator; unauthenticated public ops record as `public`.
    return forward(c, tripId, doPath, null);
  }

  // Plain reads + WebSocket upgrades.
  if (trip.visibility === "private" && !member && !agent) {
    return c.json({ error: user ? "forbidden" : "unauthorized" }, user ? 403 : 401);
  }
  return forward(c, tripId, doPath);
}

// Rewrite the request onto the DO's canonical /api/trip* path and hand it to
// the trip's Durable Object. `actor` undefined = plain pass-through (reads,
// websocket upgrades); null = anonymous public write; otherwise stamped.
function forward(
  c: Context<{ Bindings: Env }>,
  tripId: string,
  doPath: string,
  actor?: Actor | null,
): Promise<Response> {
  const req = c.req.raw;
  const url = new URL(req.url);
  url.pathname = doPath;
  let out = new Request(url, req);
  if (actor !== undefined) {
    const headers = new Headers(req.headers);
    headers.set("x-actor-id", actor?.id ?? "");
    headers.set("x-actor-login", actor?.login ?? "public");
    headers.set("x-actor-email", actor?.email ?? "");
    headers.set("x-actor-ip", c.req.header("cf-connecting-ip") ?? "");
    out = new Request(out, { headers });
  }
  return c.env.AX26.getByName(tripId).fetch(out);
}

export default app;
