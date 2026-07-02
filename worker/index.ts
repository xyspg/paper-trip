import { Hono } from "hono";
import type { Context } from "hono";

import { createAuth } from "./auth";
import { agentUser, signAgentToken } from "./agentToken";
import type { AgentClaims } from "./agentToken";
import { LEGACY_TRIP_ID, memberUser } from "./registry";
import type { Member } from "./registry";
import receipt from "./receipt";
import type { Env } from "./env";
import type { TripOp } from "../src/trip/ops";

export { AX26DurableObject } from "./AX26DurableObject";

// Ops a public timeline visitor may run without signing in: toggling a stop's
// status and submitting a comment. Everything else — reviewing/deleting
// suggestions, editing items, reset — needs trip membership. Unknown ops fail
// closed.
const PUBLIC_OPS = new Set<TripOp["type"]>(["setItemStatus", "addSuggestion"]);

// Ops a bearer-token agent may run: every content edit, but never the
// destructive bulk ops (reset, resetExpenses, clearSuggestions) — those stay
// behind a human session. Unknown ops fail closed here too.
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

// What forwardWithActor stamps into x-actor-* headers. Sessions map 1:1; agent
// tokens keep the minter's user id but prefix the login with `agent:` so the
// audit trail separates human clicks from delegated agent writes at a glance.
type Actor = { id: string | null; login: string; email: string };
const sessionActor = (u: Member): Actor => ({ id: u.id, login: u.login, email: u.email });
const agentActor = (a: AgentClaims): Actor => ({ id: a.sub, login: `agent:${a.login}`, email: "" });

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
// Trip members get a 302 to the provider; everyone else a 403.
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

app.all("/api/trip", forwardTrip);
app.all("/api/trip/*", forwardTrip);

// Reads and WebSocket upgrades are public (the legacy trip is registered
// public); writes are gated by credential: member session (everything), agent
// bearer token (AGENT_OPS + whole-trip PUT + backup list/create), anonymous
// (PUBLIC_OPS only). We peek the op from a clone so the original body still
// reaches the Durable Object.
async function forwardTrip(c: Context<{ Bindings: Env }>): Promise<Response> {
  const req = c.req.raw;
  const path = new URL(req.url).pathname;

  // The audit trail is member-only to read; never expose it to visitors or agents.
  if (req.method === "GET" && path === "/api/trip/audit") {
    if (!(await memberUser(c, LEGACY_TRIP_ID))) return c.json({ error: "forbidden" }, 403);
    return stub(c.env).fetch(req);
  }

  // Backups include full trip snapshots and restore/delete actions. Members get
  // everything; agents may only list and create on the collection path (SKILL.md
  // tells them to snapshot before a bulk PUT) — restore/delete stay human-only.
  if (path === "/api/trip/backups" || path.startsWith("/api/trip/backups/")) {
    const user = await memberUser(c, LEGACY_TRIP_ID);
    if (user) return forwardWithActor(c, req, sessionActor(user));
    const agent = await agentUser(c, LEGACY_TRIP_ID);
    if (
      agent &&
      path === "/api/trip/backups" &&
      (req.method === "GET" || req.method === "POST")
    ) {
      return forwardWithActor(c, req, agentActor(agent));
    }
    return c.json({ error: "forbidden" }, 403);
  }

  // Whole-trip replacement (rev-checked in the DO). Requires session or token —
  // once the DO answers PUT, an ungated PUT would be anonymous full write.
  if (req.method === "PUT" && path === "/api/trip") {
    const user = await memberUser(c, LEGACY_TRIP_ID);
    if (user) return forwardWithActor(c, req, sessionActor(user));
    const agent = await agentUser(c, LEGACY_TRIP_ID);
    if (agent) return forwardWithActor(c, req, agentActor(agent));
    return c.json({ error: "unauthorized" }, 401);
  }

  if (req.method === "POST") {
    const op = (await req
      .clone()
      .json()
      .catch(() => null)) as TripOp | null;
    const user = await memberUser(c, LEGACY_TRIP_ID);
    if (user) return forwardWithActor(c, req, sessionActor(user));
    const agent = await agentUser(c, LEGACY_TRIP_ID);
    if (agent) {
      if (!op || !AGENT_OPS.has(op.type)) return c.json({ error: "op_not_allowed" }, 403);
      return forwardWithActor(c, req, agentActor(agent));
    }
    if (!op || !PUBLIC_OPS.has(op.type)) return c.json({ error: "forbidden" }, 403);
    // Stamp the verified actor onto the request the DO records in its audit log.
    // We always `set` (never trust an inbound x-actor-* header), so a client
    // cannot forge an operator; unauthenticated public ops record as `public`.
    return forwardWithActor(c, req, null);
  }

  return stub(c.env).fetch(req);
}

function forwardWithActor(c: Context<{ Bindings: Env }>, req: Request, actor: Actor | null) {
  const headers = new Headers(req.headers);
  headers.set("x-actor-id", actor?.id ?? "");
  headers.set("x-actor-login", actor?.login ?? "public");
  headers.set("x-actor-email", actor?.email ?? "");
  headers.set("x-actor-ip", c.req.header("cf-connecting-ip") ?? "");
  return stub(c.env).fetch(new Request(req, { headers }));
}

function stub(env: Env) {
  return env.AX26.getByName(LEGACY_TRIP_ID);
}

export default app;
