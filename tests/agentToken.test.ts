import { describe, expect, it } from "bun:test";

import { signAgentToken, verifyAgentToken, type AgentClaims } from "../worker/agentToken";
import { signSession, verifySession, type SessionUser } from "../worker/auth";

const SECRET = "test-secret";
const NOW = Math.floor(Date.now() / 1000);

// 42668274 is in ADMIN_IDS (worker/auth.ts); both verifiers re-check the allowlist live.
const claims = (over: Partial<AgentClaims> = {}): AgentClaims => ({
  kind: "agent",
  id: 42668274,
  login: "xyspg",
  tripId: "anime-expo-2026",
  exp: NOW + 3600,
  ...over,
});

const user: SessionUser = {
  id: 42668274,
  login: "xyspg",
  name: null,
  email: "x@example.com",
  avatarUrl: "",
};

describe("agent token", () => {
  it("round-trips valid claims", async () => {
    const token = await signAgentToken(claims(), SECRET);
    expect(token.startsWith("axa_")).toBe(true);
    expect(await verifyAgentToken(token, SECRET)).toEqual(claims());
  });

  it("rejects an expired token", async () => {
    const token = await signAgentToken(claims({ exp: NOW - 10 }), SECRET);
    expect(await verifyAgentToken(token, SECRET)).toBeNull();
  });

  it("rejects a tampered signature", async () => {
    const token = await signAgentToken(claims(), SECRET);
    const flipped = token.slice(0, -1) + (token.endsWith("A") ? "B" : "A");
    expect(await verifyAgentToken(flipped, SECRET)).toBeNull();
  });

  it("rejects the wrong secret", async () => {
    const token = await signAgentToken(claims(), SECRET);
    expect(await verifyAgentToken(token, "other-secret")).toBeNull();
  });

  it("rejects an id outside ADMIN_IDS", async () => {
    const token = await signAgentToken(claims({ id: 1 }), SECRET);
    expect(await verifyAgentToken(token, SECRET)).toBeNull();
  });

  it("rejects a payload whose kind is not agent", async () => {
    const forged = { ...claims(), kind: "session" } as unknown as AgentClaims;
    const token = await signAgentToken(forged, SECRET);
    expect(await verifyAgentToken(token, SECRET)).toBeNull();
  });
});

describe("credential separation", () => {
  it("an agent token is never a valid session cookie", async () => {
    const token = await signAgentToken(claims(), SECRET);
    // As-is: the axa_ prefix breaks the signature check.
    expect(await verifySession(token, SECRET)).toBeNull();
    // Prefix stripped: payload verifies, but the kind claim must be rejected.
    expect(await verifySession(token.slice("axa_".length), SECRET)).toBeNull();
  });

  it("a session cookie is never a valid agent token", async () => {
    const cookie = await signSession(user, SECRET);
    expect(await verifyAgentToken(cookie, SECRET)).toBeNull();
    expect(await verifyAgentToken(`axa_${cookie}`, SECRET)).toBeNull();
  });

  it("a real session cookie still verifies", async () => {
    const cookie = await signSession(user, SECRET);
    expect(await verifySession(cookie, SECRET)).toMatchObject({ id: 42668274, login: "xyspg" });
  });
});
