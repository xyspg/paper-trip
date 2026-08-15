import { createContext, useContext } from "react";
import type { AdminMember, Expense } from "./adminData";
import type { ToastFn } from "./useAdminToasts";
import type { useTripOp } from "../trip/hooks";
import type { Flight, Payment, TripItem, TripSuggestion } from "../trip/types";

// Shared state for the admin layout and its section routes. The layout owns the
// auth gate and live trip sync, then hands the current trip's persisted content
// down so each `…/admin/*` route stays a thin wrapper around its section.
export type AdminContextValue = {
  tripId: string;
  toast: ToastFn;
  suggestions: TripSuggestion[];
  items: TripItem[];
  expenses: Expense[];
  flights: Flight[];
  // Settle-up transfers between travelers (trip.payments).
  payments: Payment[];
  // The trip's roster (from trip.members) — who money can be split across.
  travelers: AdminMember[];
  // The trip's settlement currency (trip.base.currency) — what totals,
  // balances, and settle-up amounts are stated in.
  currency: string;
  // The trip's own timezone (trip.base.timezone) — any "today" defaults derive
  // from it, never from the device clock's zone.
  timezone: string;
  tripOp: ReturnType<typeof useTripOp>;
};

const AdminContext = createContext<AdminContextValue | null>(null);

export const AdminProvider = AdminContext.Provider;

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within the admin layout");
  return ctx;
}
