import { describe, expect, it } from "bun:test";

import { signAgentToken, verifyAgentToken, type AgentClaims } from "../worker/agentToken";

const SECRET = "test-secret";
const NOW = Math.floor(Date.now() / 1000);

// verifyAgentToken checks signature/shape/expiry only; the live membership
// check (does `sub` still belong to `tripId`?) happens in agentUser against D1
// and is covered by the worker's route gating, not unit-testable here.
const claims = (over: Partial<AgentClaims> = {}): AgentClaims => ({
  kind: "agent",
  sub: "usr_123",
  login: "traveler",
  tripId: "summer-trip",
  exp: NOW + 3600,
  ...over,
});

describe("agent token", () => {
  it("round-trips valid claims", async () => {
    const token = await signAgentToken(claims(), SECRET);
    expect(token.startsWith("pta_")).toBe(true);
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

  it("rejects a payload whose kind is not agent", async () => {
    const forged = { ...claims(), kind: "session" } as unknown as AgentClaims;
    const token = await signAgentToken(forged, SECRET);
    expect(await verifyAgentToken(token, SECRET)).toBeNull();
  });

  it("rejects claims with a missing sub", async () => {
    const forged = { ...claims(), sub: undefined } as unknown as AgentClaims;
    const token = await signAgentToken(forged, SECRET);
    expect(await verifyAgentToken(token, SECRET)).toBeNull();
  });

  it("rejects a bare token without the pta_ prefix", async () => {
    const token = await signAgentToken(claims(), SECRET);
    expect(await verifyAgentToken(token.slice("pta_".length), SECRET)).toBeNull();
  });
});
