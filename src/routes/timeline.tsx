import { createFileRoute } from "@tanstack/react-router";
import { TimelinePage } from "../pages/TimelinePage";

export const Route = createFileRoute("/timeline")({
  component: TimelinePage,
});
