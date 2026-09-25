import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

export type TripTab = {
  id: string;
  label: MessageDescriptor;
  to: "/t/$tripId/timeline" | "/t/$tripId/bookings" | "/t/$tripId/ledger";
};

// Single source of truth for the trip-scoped nav tabs. The route components
// live in src/routes so TanStack Router can generate the route tree from
// files. /t/$tripId/admin is intentionally omitted: it is reachable by URL but
// hidden from the nav.
export const tripTabs: TripTab[] = [
  { id: "timeline", label: msg`行程时间线`, to: "/t/$tripId/timeline" },
  { id: "bookings", label: msg`预订信息`, to: "/t/$tripId/bookings" },
  { id: "ledger", label: msg`账目明细`, to: "/t/$tripId/ledger" },
];
