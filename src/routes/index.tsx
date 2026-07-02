import { createFileRoute, redirect } from "@tanstack/react-router";
import { LEGACY_TRIP_ID } from "../trip/legacy";

// Placeholder until the trips dashboard lands: home goes to the legacy trip.
export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({
      to: "/t/$tripId/timeline",
      params: { tripId: LEGACY_TRIP_ID },
      replace: true,
    });
  },
});
