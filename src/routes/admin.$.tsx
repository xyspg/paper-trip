import { createFileRoute, redirect } from "@tanstack/react-router";
import { LEGACY_TRIP_ID } from "../trip/legacy";

// Exists so /admin/<section> matches at all; the parent /admin beforeLoad
// (which sees the full pathname) redirects first, so this is only a fallback.
export const Route = createFileRoute("/admin/$")({
  beforeLoad: ({ params }) => {
    throw redirect({
      href: `/t/${LEGACY_TRIP_ID}/admin/${params._splat ?? ""}`,
      replace: true,
    });
  },
});
