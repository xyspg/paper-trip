import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare `/admin` has no section of its own; send it to the first tab. Forward the
// search params so an auth `?error=…` (e.g. a rejected login) survives the hop and
// the login screen can surface it instead of silently swallowing the failure.
export const Route = createFileRoute("/admin/")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/admin/itinerary", search });
  },
});
