import { createFileRoute, redirect } from "@tanstack/react-router";
import { LEGACY_TRIP_ID } from "../trip/legacy";

// Pre-multi-tenant bookmark: /admin (and /admin/<section>) always meant the
// legacy trip's console. This parent beforeLoad runs before the /admin/$
// child's would, so the suffix is preserved from the full pathname here.
export const Route = createFileRoute("/admin")({
  beforeLoad: ({ location }) => {
    const suffix = location.pathname.replace(/^\/admin\/?/, "");
    throw redirect({
      href: `/t/${LEGACY_TRIP_ID}/admin${suffix ? `/${suffix}` : ""}`,
      replace: true,
    });
  },
});
