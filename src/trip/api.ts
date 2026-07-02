import type { TripOp } from "./ops";
import type { Trip, TripBackup } from "./types";

export type { TripBackup };

export type TripSnapshot = { rev: number; trip: Trip };

export const fetchTrip = async (): Promise<TripSnapshot> => {
  const res = await fetch("/api/trip");
  if (!res.ok) throw new Error(`GET /api/trip failed: ${res.status}`);
  return (await res.json()) as TripSnapshot;
};

export const sendOp = async (op: TripOp): Promise<TripSnapshot> => {
  const res = await fetch("/api/trip", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(op),
  });
  if (!res.ok) throw new Error(`POST /api/trip failed: ${res.status}`);
  return (await res.json()) as TripSnapshot;
};

// One row of the append-only audit trail (mirrors the DO `audit` table). Admin
// only; `detail` is the JSON-stringified TripOp that produced the change.
export type AuditEntry = {
  seq: number;
  at: string;
  rev: number;
  op: string;
  target: string | null;
  actorId: number | null;
  actorLogin: string;
  actorEmail: string | null;
  ip: string | null;
  detail: string;
};

export const fetchAudit = async (): Promise<AuditEntry[]> => {
  const res = await fetch("/api/trip/audit");
  if (!res.ok) throw new Error(`GET /api/trip/audit failed: ${res.status}`);
  const { entries } = (await res.json()) as { entries: AuditEntry[] };
  return entries;
};

export const fetchBackups = async (): Promise<TripBackup[]> => {
  const res = await fetch("/api/trip/backups");
  if (!res.ok) throw new Error(`GET /api/trip/backups failed: ${res.status}`);
  const { backups } = (await res.json()) as { backups: TripBackup[] };
  return backups;
};

export const createBackup = async (label?: string): Promise<TripBackup> => {
  const res = await fetch("/api/trip/backups", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ label }),
  });
  if (!res.ok) throw new Error(`POST /api/trip/backups failed: ${res.status}`);
  const { backup } = (await res.json()) as { backup: TripBackup };
  return backup;
};

export const deleteBackup = async (id: string): Promise<void> => {
  const res = await fetch(`/api/trip/backups/${encodeURIComponent(id)}`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE /api/trip/backups failed: ${res.status}`);
};

export const restoreBackup = async (id: string): Promise<TripSnapshot & { backup: TripBackup }> => {
  const res = await fetch(`/api/trip/backups/${encodeURIComponent(id)}/restore`, {
    method: "POST",
  });
  if (!res.ok) throw new Error(`POST /api/trip/backups/:id/restore failed: ${res.status}`);
  return (await res.json()) as TripSnapshot & { backup: TripBackup };
};

export type AgentTokenGrant = { token: string; exp: number };

// Mint an expiring bearer token for a local agent (admin session required).
export const mintAgentToken = async (ttlDays?: number): Promise<AgentTokenGrant> => {
  const res = await fetch("/api/agent/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ttlDays }),
  });
  if (!res.ok) throw new Error(`POST /api/agent/token failed: ${res.status}`);
  return (await res.json()) as AgentTokenGrant;
};

export const tripWsUrl = (): string => {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/api/trip`;
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
