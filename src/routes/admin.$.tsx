import { createFileRoute, redirect } from "@tanstack/react-router";
import { LEGACY_TRIP_ID } from "../trip/legacy";

// Deep admin bookmarks (/admin/split, /admin/audit, …) keep their section.
export const Route = createFileRoute("/admin/$")({
  beforeLoad: ({ params }) => {
    throw redirect({
      href: `/t/${LEGACY_TRIP_ID}/admin/${params._splat ?? ""}`,
      replace: true,
    });
  },
});
