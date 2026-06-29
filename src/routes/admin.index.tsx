import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare `/admin` has no section of its own; send it to the first tab.
export const Route = createFileRoute("/admin/")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/itinerary" });
  },
});
