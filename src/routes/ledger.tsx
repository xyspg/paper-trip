import { createFileRoute, redirect } from "@tanstack/react-router";
import { LEGACY_TRIP_ID } from "../trip/legacy";

// Pre-multi-tenant bookmark: the un-scoped paths always meant the legacy trip.
export const Route = createFileRoute("/ledger")({
  beforeLoad: () => {
    throw redirect({
      to: "/t/$tripId/ledger",
      params: { tripId: LEGACY_TRIP_ID },
      replace: true,
    });
  },
});
