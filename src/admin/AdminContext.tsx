import { createContext, useContext } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Stop, Expense } from "./adminData"
import type { ToastFn } from "./useAdminToasts"
import type { useTripOp } from "../trip/hooks"
import type { TripItem, TripSuggestion } from "../trip/types"

// Shared state for the admin layout and its section routes. The layout owns the
// auth gate, live trip sync and ephemeral itinerary state, then hands them down
// so each `/admin/*` route stays a thin wrapper around its section component.
export type AdminContextValue = {
  toast: ToastFn
  stops: Stop[]
  setStops: Dispatch<SetStateAction<Stop[]>>
  suggestions: TripSuggestion[]
  items: TripItem[]
  expenses: Expense[]
  tripOp: ReturnType<typeof useTripOp>
}

const AdminContext = createContext<AdminContextValue | null>(null)

export const AdminProvider = AdminContext.Provider

export function useAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext)
  if (!ctx) throw new Error("useAdmin must be used within the /admin layout")
  return ctx
}
