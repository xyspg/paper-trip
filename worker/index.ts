import { Hono } from "hono";

import type { Env } from "./env";

export { AX26DurableObject } from "./AX26DurableObject";

const TRIP_ID = "anime-expo-2026";

const app = new Hono<{ Bindings: Env }>();

app.get("/api", (c) => c.text("ok"));

app.all("/api/trip", (c) => stub(c.env).fetch(c.req.raw));
app.all("/api/trip/*", (c) => stub(c.env).fetch(c.req.raw));

function stub(env: Env) {
  return env.AX26.getByName(TRIP_ID);
}

export default app;
