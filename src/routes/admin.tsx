import { createFileRoute, redirect } from "@tanstack/react-router";
import { LEGACY_TRIP_ID } from "../trip/legacy";

// Pre-multi-tenant bookmark: /admin always meant the legacy trip's console.
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({
      to: "/t/$tripId/admin",
      params: { tripId: LEGACY_TRIP_ID },
      replace: true,
    });
  },
});
