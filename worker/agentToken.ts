import type { Context } from "hono";

import { b64urlToBytes, b64urlToStr, bytesToB64url, strToB64url } from "./b64";
import type { Env } from "./env";
import { getMembership } from "./registry";
import type { TripRole } from "./registry";

// Bearer tokens minted from a member session for local agents (the SKILL.md
// flow). Signed with AGENT_TOKEN_SECRET — deliberately NOT the better-auth
// secret, so neither credential kind can ever pass the other's verifier. The
// `kind` claim plus the pta_ prefix keep tokens self-describing on top of that.

export type AgentClaims = {
  kind: "agent";
  sub: string; // better-auth user id of the minting human
  login: string;
  tripId: string;
  exp: number; // unix seconds
};

const PREFIX = "pta_";
const enc = new TextEncoder();

export function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export async function signAgentToken(claims: AgentClaims, secret: string): Promise<string> {
  const body = strToB64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${PREFIX}${body}.${bytesToB64url(new Uint8Array(sig))}`;
}

// Signature, shape and expiry only. Authorization (is the minter still a
// member of claims.tripId?) is a live D1 question answered in agentUser, so a
// verified-but-revoked token still opens no doors.
export async function verifyAgentToken(token: string, secret: string): Promise<AgentClaims | null> {
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
    if (typeof p.sub !== "string" || typeof p.login !== "string" || typeof p.tripId !== "string") {
      return null;
    }
    return { kind: "agent", sub: p.sub, login: p.login, tripId: p.tripId, exp: p.exp };
  } catch {
    return null;
  }
}

// Resolve the Authorization header to agent claims scoped to `tripId`, or
// null. Tokens for another trip are rejected outright, and removing the minter
// from the trip revokes every token they issued for it.
export async function agentUser(
  c: Context<{ Bindings: Env }>,
  tripId: string,
): Promise<(AgentClaims & { role: TripRole }) | null> {
  const secret = c.env.AGENT_TOKEN_SECRET;
  const header = c.req.header("authorization");
  if (!secret || !header?.startsWith("Bearer ")) return null;
  const claims = await verifyAgentToken(header.slice("Bearer ".length).trim(), secret);
  if (!claims || claims.tripId !== tripId) return null;
  const membership = await getMembership(c.env.DB, tripId, claims.sub);
  return membership ? { ...claims, role: membership.role } : null;
}
