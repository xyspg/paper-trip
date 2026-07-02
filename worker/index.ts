import { Hono } from "hono";
import type { Context } from "hono";

import auth, { sessionUser } from "./auth";
import receipt from "./receipt";
import type { Env } from "./env";
import type { TripOp } from "../src/trip/ops";

export { AX26DurableObject } from "./AX26DurableObject";

const TRIP_ID = "anime-expo-2026";

// Ops a public timeline visitor may run without signing in: toggling a stop's
// status and submitting a comment. Everything else — reviewing/deleting
// suggestions, editing items, reset — is admin-only. Unknown ops fail closed.
const PUBLIC_OPS = new Set<TripOp["type"]>(["setItemStatus", "addSuggestion"]);

const app = new Hono<{ Bindings: Env }>();

app.get("/api", (c) => c.text("ok"));

app.route("/api/auth", auth);
app.route("/api/receipt", receipt);

// Parking pass links are capability URLs — knowing one is full authority to
// edit or cancel the reservation — so the real URL never leaves the server.
// Signed-in admins get a 302 to the provider; everyone else a 403.
app.get("/api/parking-pass/:rid", async (c) => {
  if (!(await sessionUser(c))) return c.json({ error: "forbidden" }, 403);
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

// Reads and WebSocket upgrades are public; writes are gated by op type. We peek
// the op from a clone so the original body still reaches the Durable Object.
async function forwardTrip(c: Context<{ Bindings: Env }>): Promise<Response> {
  const req = c.req.raw;
  const path = new URL(req.url).pathname;

  // The audit trail is admin-only to read; never expose it to public visitors.
  if (req.method === "GET" && path === "/api/trip/audit") {
    if (!(await sessionUser(c))) return c.json({ error: "forbidden" }, 403);
    return stub(c.env).fetch(req);
  }

  // Backups include full trip snapshots and restore/delete actions, so every
  // backup endpoint is admin-only regardless of HTTP method.
  if (path === "/api/trip/backups" || path.startsWith("/api/trip/backups/")) {
    const user = await sessionUser(c);
    if (!user) return c.json({ error: "forbidden" }, 403);
    return forwardWithActor(c, req, user);
  }

  if (req.method === "POST") {
    const op = (await req
      .clone()
      .json()
      .catch(() => null)) as TripOp | null;
    const user = await sessionUser(c);
    if ((!op || !PUBLIC_OPS.has(op.type)) && !user) {
      return c.json({ error: "forbidden" }, 403);
    }
    // Stamp the verified actor onto the request the DO records in its audit log.
    // We always `set` (never trust an inbound x-actor-* header), so a client
    // cannot forge an operator; unauthenticated public ops record as `public`.
    return forwardWithActor(c, req, user);
  }

  return stub(c.env).fetch(req);
}

function forwardWithActor(
  c: Context<{ Bindings: Env }>,
  req: Request,
  user: Awaited<ReturnType<typeof sessionUser>>,
) {
  const headers = new Headers(req.headers);
  headers.set("x-actor-id", user ? String(user.id) : "");
  headers.set("x-actor-login", user?.login ?? "public");
  headers.set("x-actor-email", user?.email ?? "");
  headers.set("x-actor-ip", c.req.header("cf-connecting-ip") ?? "");
  return stub(c.env).fetch(new Request(req, { headers }));
}

function stub(env: Env) {
  return env.AX26.getByName(TRIP_ID);
}

export default app;
