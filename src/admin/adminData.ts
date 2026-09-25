import { t } from "@lingui/core/macro";
import { intlLocale } from "../locale";
import { fmtCurrency } from "../trip/currency";

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

// ---- Category palette (shared with itinerary page) ----
// Editorial paper hues (slate / ochre / alert / plum / accent). Literal hex so
// the itinerary can derive translucent tints via `color + '55'` / `+ '12'`.
// Labels are display-only getters that translate on read: the locale is
// activated after modules load, so a module-level string would freeze in the
// source language, and a getter keeps `label: string` for every caller.
export const CATS: Record<StopCat, { readonly label: string; color: string }> = {
  transit: {
    get label() {
      return t`交通 · Transit`;
    },
    color: "#5b7a99",
  },
  food: {
    get label() {
      return t`用餐 · Food`;
    },
    color: "#b08648",
  },
  event: {
    get label() {
      return t`活动 · Event`;
    },
    color: "#c2553f",
  },
  stay: {
    get label() {
      return t`酒店 · Stay`;
    },
    color: "#7a5c84",
  },
  misc: {
    get label() {
      return t`杂项 · Misc`;
    },
    color: "#3f6f5b",
  },
};

// Category keys in declaration order, derived once so the add/edit modals share
// one list instead of each redeclaring `Object.keys(CATS) as StopCat[]`.
export const CAT_KEYS = Object.keys(CATS) as StopCat[];

// Round to cents. The one money-rounding helper shared by the split/receipt math
// (deriveShares, PaymentSplit) so every surface rounds identically.
export const round2 = (n: number): number => Math.round(n * 100) / 100;

// Money display, currency-aware. The default keeps legacy call sites on USD —
// the unit pre-multi-currency data is recorded in; surfaces that know their
// trip/expense currency pass it explicitly.
export const fmtMoney = (n: number, currency?: string): string => fmtCurrency(n, currency);

// Absolute local time with seconds, shared by the audit log and backup list.
// Falls back to the raw string if the ISO input ever fails to parse.
export const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(intlLocale(), {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

export const uid = (p: string): string => `${p}_${Math.random().toString(36).slice(2, 8)}`;
