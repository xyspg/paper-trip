export type StopCat = "transit" | "food" | "event" | "stay" | "misc";

export type AdminMember = {
  id: string;
  name: string;
  handle: string;
  role: string;
  color: string;
  traveler: boolean;
  initials: string;
  avatarUrl?: string;
};

// Expenses now live on the synced Trip (single source of truth); re-exported
// here so admin modules keep importing the type from one place.
export type { Expense } from "../trip/types";

// ---- Legacy-trip roster fallback ----
// Real rosters live on the synced trip (trip.members, see src/trip/roster.ts);
// this pair remains only as the legacy trip's first-frame fallback before its
// snapshot arrives.
export const MEMBERS: AdminMember[] = [
  {
    id: "you",
    name: "xyspg",
    handle: "xyspg",
    role: "管理员",
    color: "var(--color-magenta)",
    traveler: true,
    initials: "XY",
    avatarUrl: "https://github.com/xyspg.png",
  },
  {
    id: "spr",
    name: "Sapphire Rapids",
    handle: "sapphirerapids",
    role: "同行",
    color: "var(--color-cyan)",
    traveler: true,
    initials: "SR",
    avatarUrl: "https://github.com/sapphire-rapids.png",
  },
];

// ---- Category palette (shared with itinerary page) ----
// Editorial paper hues (slate / ochre / alert / plum / accent). Literal hex so
// the itinerary can derive translucent tints via `color + '55'` / `+ '12'`.
export const CATS: Record<StopCat, { label: string; color: string }> = {
  transit: { label: "交通 · Transit", color: "#5b7a99" },
  food: { label: "用餐 · Food", color: "#b08648" },
  event: { label: "活动 · Event", color: "#c2553f" },
  stay: { label: "酒店 · Stay", color: "#7a5c84" },
  misc: { label: "杂项 · Misc", color: "#3f6f5b" },
};

// Category keys in declaration order, derived once so the add/edit modals share
// one list instead of each redeclaring `Object.keys(CATS) as StopCat[]`.
export const CAT_KEYS = Object.keys(CATS) as StopCat[];

// Round to cents. The one money-rounding helper shared by the split/receipt math
// (deriveShares, PaymentSplit) so every surface rounds identically.
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export const fmtMoney = (n: number): string =>
  "$" +
  (Math.round((Number(n) || 0) * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// Absolute local time with seconds, shared by the audit log and backup list.
// Falls back to the raw string if the ISO input ever fails to parse.
export const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const uid = (p: string): string => `${p}_${Math.random().toString(36).slice(2, 8)}`;
