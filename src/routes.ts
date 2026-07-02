export type TripTab = {
  id: string;
  label: string;
  to: "/t/$tripId/timeline" | "/t/$tripId/bookings" | "/t/$tripId/ledger";
};

// Single source of truth for the trip-scoped nav tabs. The route components
// live in src/routes so TanStack Router can generate the route tree from
// files. /t/$tripId/admin is intentionally omitted: it is reachable by URL but
// hidden from the nav.
export const tripTabs: TripTab[] = [
  { id: "timeline", label: "行程时间线", to: "/t/$tripId/timeline" },
  { id: "bookings", label: "预订信息", to: "/t/$tripId/bookings" },
  { id: "ledger", label: "账目明细", to: "/t/$tripId/ledger" },
];
