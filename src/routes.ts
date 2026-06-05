export type RouteConfig = {
  id: string;
  label: string;
  path: "/timeline" | "/bookings" | "/ledger";
};

// Single source of truth for shared route metadata. The route components live in
// src/routes so TanStack Router can generate the route tree from files. /admin is
// intentionally omitted: it is reachable by URL but hidden from the nav.
export const routes: RouteConfig[] = [
  { id: "timeline", label: "行程时间线", path: "/timeline" },
  { id: "bookings", label: "预订信息", path: "/bookings" },
  { id: "ledger", label: "账目明细", path: "/ledger" },
];
