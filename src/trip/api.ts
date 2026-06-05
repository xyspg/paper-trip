import type { TripOp } from "./ops";
import type { Trip } from "./types";

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

export const tripWsUrl = (): string => {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${location.host}/api/trip`;
};
