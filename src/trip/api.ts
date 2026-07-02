import type { TripOp } from "./ops";
import type { Trip, TripBackup } from "./types";

export type { TripBackup };

export type TripSnapshot = { rev: number; trip: Trip };

export type TripRole = "owner" | "member";
export type TripVisibility = "public" | "private";

// Registry metadata for one trip (the D1 row, not the DO document). `role` is
// the caller's membership on it — null when reading a public trip anonymously.
export type TripMeta = {
  id: string;
  title: string;
  visibility: TripVisibility;
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  createdAt: string;
  role: TripRole | null;
};

// Access failures carry the HTTP status so layouts can distinguish "sign in
// first" (401) from "not a member" (403) from "no such trip" (404).
export class TripAccessError extends Error {
  status: number;
  constructor(status: number) {
    super(`trip access failed: ${status}`);
    this.status = status;
  }
}

const trips = (tripId: string) => `/api/trips/${encodeURIComponent(tripId)}`;

export const fetchTripMeta = async (tripId: string): Promise<TripMeta> => {
  const res = await fetch(trips(tripId));
  if (!res.ok) throw new TripAccessError(res.status);
  const { trip } = (await res.json()) as { trip: TripMeta };
  return trip;
};

export const fetchTrips = async (): Promise<TripMeta[]> => {
  const res = await fetch("/api/trips");
  if (!res.ok) throw new TripAccessError(res.status);
  const data = (await res.json()) as { trips: TripMeta[] };
  return data.trips;
};

export const fetchTrip = async (tripId: string): Promise<TripSnapshot> => {
  const res = await fetch(`${trips(tripId)}/trip`);
  if (!res.ok) throw new TripAccessError(res.status);
  return (await res.json()) as TripSnapshot;
};

export const sendOp = async (tripId: string, op: TripOp): Promise<TripSnapshot> => {
  const res = await fetch(`${trips(tripId)}/trip`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(op),
  });
  if (!res.ok) throw new Error(`POST ${trips(tripId)}/trip failed: ${res.status}`);
  return (await res.json()) as TripSnapshot;
};

// One row of the append-only audit trail (mirrors the DO `audit` table). Member
// only; `detail` is the JSON-stringified TripOp that produced the change.
export type AuditEntry = {
  seq: number;
  at: string;
  rev: number;
  op: string;
  target: string | null;
  // Numeric on rows written before the better-auth migration, string after.
  actorId: number | string | null;
  actorLogin: string;
  actorEmail: string | null;
  ip: string | null;
  detail: string;
};

export const fetchAudit = async (tripId: string): Promise<AuditEntry[]> => {
  const res = await fetch(`${trips(tripId)}/audit`);
  if (!res.ok) throw new Error(`GET ${trips(tripId)}/audit failed: ${res.status}`);
  const { entries } = (await res.json()) as { entries: AuditEntry[] };
  return entries;
};

export const fetchBackups = async (tripId: string): Promise<TripBackup[]> => {
  const res = await fetch(`${trips(tripId)}/backups`);
  if (!res.ok) throw new Error(`GET ${trips(tripId)}/backups failed: ${res.status}`);
  const { backups } = (await res.json()) as { backups: TripBackup[] };
  return backups;
};

export const createBackup = async (tripId: string, label?: string): Promise<TripBackup> => {
  const res = await fetch(`${trips(tripId)}/backups`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`POST ${trips(tripId)}/backups failed: ${res.status}`);
  const { backup } = (await res.json()) as { backup: TripBackup };
  return backup;
};

export const deleteBackup = async (tripId: string, id: string): Promise<void> => {
  const res = await fetch(`${trips(tripId)}/backups/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error(`DELETE ${trips(tripId)}/backups failed: ${res.status}`);
};

export const restoreBackup = async (
  tripId: string,
  id: string,
): Promise<TripSnapshot & { backup: TripBackup }> => {
  const res = await fetch(`${trips(tripId)}/backups/${encodeURIComponent(id)}/restore`, {
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`POST ${trips(tripId)}/backups/:id/restore failed: ${res.status}`);
  }
  return (await res.json()) as TripSnapshot & { backup: TripBackup };
};

export type AgentTokenGrant = { token: string; exp: number };

// Mint an expiring bearer token for a local agent (member session required).
export const mintAgentToken = async (ttlDays?: number): Promise<AgentTokenGrant> => {
  const res = await fetch("/api/agent/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ttlDays }),
  });
  if (!res.ok) throw new Error(`POST /api/agent/token failed: ${res.status}`);
  return (await res.json()) as AgentTokenGrant;
};

export const tripWsUrl = (tripId: string): string => {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}${trips(tripId)}/trip`;
};

export type CreditCard = {
  name: string;
  issuer: string;
  approvedAt: string;
  imageUrl: string;
};

export const fetchCreditCards = async (): Promise<CreditCard[]> => {
  const res = await fetch("https://xyspg.moe/api/credit-cards");
  if (!res.ok) throw new Error(`GET credit-cards failed: ${res.status}`);
  return (await res.json()) as CreditCard[];
};
