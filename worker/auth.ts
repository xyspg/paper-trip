import { Hono } from "hono";
import type { Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";

import type { Env } from "./env";

// Admins, hardcoded by GitHub numeric user id. Ids are immutable and unique, so
// a rename or a freed-up username can never impersonate an admin (unlike login
// or email matching). 42668274 = xyspg, 194129427 = Sapphire-Rapids.
const ADMIN_IDS = new Set([42668274, 194129427]);

// Fixed callback registered with the GitHub OAuth app. The proxy validates our
// return origin and forwards GitHub's `code` back to us. See xyspg/oauth-proxy.
const PROXY = "https://oauth.xyspg.moe/callback/github";
const STATE_COOKIE = "ax_oauth_state";
const SESSION_COOKIE = "ax_session";
const SESSION_TTL = 60 * 60 * 24 * 30; // 30 days
const enc = new TextEncoder();

// Shared attributes for both the CSRF nonce and the session cookie.
const COOKIE_BASE = { httpOnly: true, secure: true, sameSite: "Lax", path: "/" } as const;

// Every auth failure bounces back to the login screen with a typed code that
// AdminLogin maps to a message; the union keeps the two in sync.
type AuthError = "config" | "oauth" | "token" | "user" | "forbidden";
const fail = (c: Context, code: AuthError) => c.redirect(`/admin?error=${code}`, 302);

export type SessionUser = {
  id: number;
  login: string;
  name: string | null;
  email: string;
  avatarUrl: string;
};

// ---- base64url helpers (URL-safe, no padding) ----
function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
function b64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
const strToB64url = (s: string) => bytesToB64url(enc.encode(s));
const b64urlToStr = (s: string) => new TextDecoder().decode(b64urlToBytes(s));

// ---- HMAC-SHA256 signed, stateless session token: `<payload>.<sig>`.
// Keyed by the GitHub client secret, so no extra secret to manage. ----
function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

async function signSession(user: SessionUser, secret: string): Promise<string> {
  const payload = { ...user, exp: Math.floor(Date.now() / 1000) + SESSION_TTL };
  const body = strToB64url(JSON.stringify(payload));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

async function verifySession(token: string, secret: string): Promise<SessionUser | null> {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    b64urlToBytes(sig),
    enc.encode(body),
  );
  if (!ok) return null;
  try {
    const p = JSON.parse(b64urlToStr(body)) as SessionUser & { exp?: number };
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    // Re-check the allowlist on every request, not just at login, so removing an
    // id from ADMIN_IDS revokes any live session immediately instead of waiting
    // up to SESSION_TTL for the cookie to expire. This also rejects pre-`id`
    // cookies (id absent): without it `String(user.id)` would stamp "undefined"
    // and the audit log would record a null actor for an authenticated admin.
    if (typeof p.id !== "number" || !ADMIN_IDS.has(p.id)) return null;
    return {
      id: p.id,
      login: p.login,
      name: p.name ?? null,
      email: p.email,
      avatarUrl: p.avatarUrl,
    };
  } catch {
    return null;
  }
}

// Resolve the signed session cookie to a user, or null. Shared by the SPA probe
// and the trip write-gate so cookie/secret handling lives in one place.
export async function sessionUser(c: Context<{ Bindings: Env }>): Promise<SessionUser | null> {
  const secret = c.env.GITHUB_OAUTH_CLIENT_SECRET;
  const token = getCookie(c, SESSION_COOKIE);
  return secret && token ? await verifySession(token, secret) : null;
}

const auth = new Hono<{ Bindings: Env }>();

// Public origin the browser actually uses. Behind Portless/Vite the worker sees
// the internal host (127.0.0.1:<port>), so prefer the forwarded headers.
function publicOrigin(c: Context): string {
  const host = c.req.header("x-forwarded-host") ?? c.req.header("host");
  const proto = c.req.header("x-forwarded-proto") ?? "https";
  return host ? `${proto}://${host}` : new URL(c.req.url).origin;
}

// 1. Begin login: stash a CSRF nonce in an httpOnly cookie, then bounce to GitHub
//    with the proxy as redirect_uri and our return URL packed into `state`.
auth.get("/github", (c) => {
  const clientId = c.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) return fail(c, "config");

  const returnUrl = `${publicOrigin(c)}/api/auth/callback/github`;
  const appState = crypto.randomUUID();
  setCookie(c, STATE_COOKIE, appState, { ...COOKIE_BASE, maxAge: 600 });

  const u = new URL("https://github.com/login/oauth/authorize");
  u.searchParams.set("client_id", clientId);
  u.searchParams.set("redirect_uri", PROXY);
  u.searchParams.set("scope", "read:user user:email");
  u.searchParams.set("state", `${strToB64url(returnUrl)}~${appState}`);
  return c.redirect(u.toString(), 302);
});

// 2. Proxy redirects here with `code` and the restored `appState`. Verify CSRF,
//    exchange the code, load the GitHub identity + verified email, gate, issue session.
auth.get("/callback/github", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const expected = getCookie(c, STATE_COOKIE);
  deleteCookie(c, STATE_COOKIE, { path: "/" });

  if (!code || !state || !expected || state !== expected) {
    return fail(c, "oauth");
  }
  const clientId = c.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = c.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail(c, "config");

  const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: PROXY,
    }),
  });
  const tokenJson = await tokenRes
    .json<{ access_token?: string }>()
    .catch(() => ({}) as { access_token?: string });
  const accessToken = tokenJson.access_token;
  if (!accessToken) return fail(c, "token");

  const ghHeaders = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "ax26-admin",
  };
  const [profile, emails] = await Promise.all([
    fetch("https://api.github.com/user", { headers: ghHeaders })
      .then((r) =>
        r.ok
          ? r.json<{
              id: number;
              login: string;
              name: string | null;
              avatar_url: string;
              email: string | null;
            }>()
          : null,
      )
      .catch(() => null),
    fetch("https://api.github.com/user/emails", { headers: ghHeaders })
      .then((r) =>
        r.ok ? r.json<Array<{ email: string; primary: boolean; verified: boolean }>>() : [],
      )
      .catch(() => [] as Array<{ email: string; primary: boolean; verified: boolean }>),
  ]);
  if (!profile) return fail(c, "user");

  // Gate on the immutable numeric id, never on a mutable login/email.
  if (!ADMIN_IDS.has(profile.id)) {
    // Name the rejected account so the login screen can tell the user *which*
    // GitHub identity was refused, instead of a dead end with no context.
    const who = encodeURIComponent(profile.login);
    return c.redirect(`/admin?error=forbidden&login=${who}`, 302);
  }

  // Display-only: a verified email for the session; never trust unverified.
  const primary = emails.find((e) => e.primary && e.verified) ?? emails.find((e) => e.verified);
  const email = (primary?.email ?? "").toLowerCase();

  const user: SessionUser = {
    id: profile.id,
    login: profile.login,
    name: profile.name,
    email,
    avatarUrl: profile.avatar_url,
  };
  setCookie(c, SESSION_COOKIE, await signSession(user, clientSecret), {
    ...COOKIE_BASE,
    maxAge: SESSION_TTL,
  });
  return c.redirect("/admin", 302);
});

// 3. Session probe for the SPA: returns the current user or 401.
auth.get("/me", async (c) => {
  const user = await sessionUser(c);
  if (!user) return c.json({ user: null }, 401);
  return c.json({ user });
});

auth.post("/logout", (c) => {
  deleteCookie(c, SESSION_COOKIE, { path: "/" });
  return c.json({ ok: true });
});

export default auth;
