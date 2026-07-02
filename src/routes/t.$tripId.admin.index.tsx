import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare …/admin has no section of its own; send it to the first tab. Forward
// the search params so an auth `?error=…` (e.g. a rejected login) survives the
// hop and the login screen can surface it instead of silently swallowing it.
export const Route = createFileRoute("/t/$tripId/admin/")({
  beforeLoad: ({ params, search }) => {
    throw redirect({ to: "/t/$tripId/admin/itinerary", params, search });
  },
});
