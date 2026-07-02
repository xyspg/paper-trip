import type { Context } from "hono";

import {
  b64urlToBytes,
  b64urlToStr,
  bytesToB64url,
  hmacKey,
  isAdminId,
  strToB64url,
} from "./auth";
import type { Env } from "./env";

// Bearer tokens minted from an admin session for local agents (the SKILL.md
// flow). Signed with the same HMAC key as sessions; the `kind` claim plus the
// axa_ prefix keep the two credential kinds from ever being interchangeable.

export type AgentClaims = {
  kind: "agent";
  id: number;
  login: string;
  tripId: string;
  exp: number; // unix seconds
};

const PREFIX = "axa_";
const enc = new TextEncoder();

export async function signAgentToken(claims: AgentClaims, secret: string): Promise<string> {
  const body = strToB64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${PREFIX}${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

export async function verifyAgentToken(
  token: string,
  secret: string,
): Promise<AgentClaims | null> {
  if (!token.startsWith(PREFIX)) return null;
  const [body, sig] = token.slice(PREFIX.length).split(".");
  if (!body || !sig) return null;
  const ok = await crypto.subtle.verify(
    "HMAC",
    await hmacKey(secret),
    b64urlToBytes(sig),
    enc.encode(body),
  );
  if (!ok) return null;
  try {
    const p = JSON.parse(b64urlToStr(body)) as Partial<AgentClaims>;
    if (p.kind !== "agent") return null;
    if (typeof p.exp !== "number" || p.exp < Date.now() / 1000) return null;
    if (typeof p.id !== "number" || typeof p.login !== "string" || typeof p.tripId !== "string") {
      return null;
    }
    if (!isAdminId(p.id)) return null;
    return { kind: "agent", id: p.id, login: p.login, tripId: p.tripId, exp: p.exp };
  } catch {
    return null;
  }
}

// Resolve the Authorization header to agent claims, or null.
export async function agentUser(c: Context<{ Bindings: Env }>): Promise<AgentClaims | null> {
  const secret = c.env.GITHUB_OAUTH_CLIENT_SECRET;
  const header = c.req.header("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return null;
  return verifyAgentToken(header.slice("Bearer ".length).trim(), secret);
}
