import { createFileRoute, redirect } from "@tanstack/react-router";

// Bare /t/:tripId has no view of its own; the timeline is the front page.
export const Route = createFileRoute("/t/$tripId/")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/t/$tripId/timeline", params, replace: true });
  },
});
