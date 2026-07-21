import { createFileRoute, redirect } from "@tanstack/react-router";

// A trip id is required; unscoped bookmarks return to the trip dashboard.
export const Route = createFileRoute("/ledger")({
  beforeLoad: () => {
    throw redirect({
      to: "/",
      replace: true,
    });
  },
});
