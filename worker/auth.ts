import { betterAuth } from "better-auth";
import type { Context } from "hono";

import type { Env } from "./env";

// Fields beyond the better-auth core schema. Exported so the one-off migration
// generator (which compiled migrations/0001_better_auth.sql) consumes the same
// definition the runtime expects — the SQL and the server can never drift.
export const authModelOptions = {
  user: {
    additionalFields: {
      // GitHub handle, populated by mapProfileToUser at sign-in. Display and
      // audit only — authorization always keys on the immutable user id.
      login: { type: "string", required: false, input: false },
    },
  },
} as const;

// Session identity the worker hands around. `id` is the better-auth user id (a
// string — NOT the GitHub numeric id; that lives in the `account` table).
export type SessionUser = {
  id: string;
  login: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
};

type Auth = ReturnType<typeof buildAuth>;

// One instance per isolate. `env` (and its D1 binding) is stable across
// requests within an isolate; keying on the binding means a fresh binding can
// never reuse a stale instance, and a re-used binding never rebuilds Kysely.
const instances = new WeakMap<D1Database, Auth>();

function buildAuth(env: Env) {
  return betterAuth({
    // D1 binding, auto-detected by better-auth ≥1.5 — no adapter dependency.
    database: env.DB,
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    trustedOrigins: [env.APP_ORIGIN ?? "", "https://ax26.localhost"].filter(Boolean),
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days, matching the retired HMAC cookie
      // Skip the per-request D1 session read; a revoked session lives ≤5 min.
      cookieCache: { enabled: true, maxAge: 300 },
    },
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID ?? "",
        clientSecret: env.GITHUB_CLIENT_SECRET ?? "",
        mapProfileToUser: (profile) => ({ login: profile.login }),
      },
    },
    ...authModelOptions,
  });
}

export function createAuth(env: Env): Auth {
  const cached = instances.get(env.DB);
  if (cached) return cached;
  const auth = buildAuth(env);
  instances.set(env.DB, auth);
  return auth;
}

// Resolve the better-auth session cookie to a user, or null. Authentication
// only — per-trip authorization is membership, checked in worker/registry.ts.
export async function sessionUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
  const session = await createAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return null;
  const u = session.user as typeof session.user & { login?: string | null };
  return {
    id: u.id,
    login: u.login || u.name || "user",
    name: u.name ?? null,
    email: u.email,
    avatarUrl: u.image ?? null,
  };
}
