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

app.all("/api/trip", forwardTrip);
app.all("/api/trip/*", forwardTrip);

// Reads and WebSocket upgrades are public; writes are gated by op type. We peek
// the op from a clone so the original body still reaches the Durable Object.
async function forwardTrip(c: Context<{ Bindings: Env }>): Promise<Response> {
  const req = c.req.raw;
  if (req.method === "POST") {
    const op = (await req
      .clone()
      .json()
      .catch(() => null)) as TripOp | null;
    if (!op || !PUBLIC_OPS.has(op.type)) {
      const user = await sessionUser(c);
      if (!user) return c.json({ error: "forbidden" }, 403);
    }
  }
  return stub(c.env).fetch(req);
}

function stub(env: Env) {
  return env.AX26.getByName(TRIP_ID);
}

export default app;
