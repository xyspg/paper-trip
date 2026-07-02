import { createFileRoute } from "@tanstack/react-router";
import { TimelinePage } from "../pages/TimelinePage";

export const Route = createFileRoute("/t/$tripId/timeline")({
  component: TimelineRoute,
});

function TimelineRoute() {
  const { tripId } = Route.useParams();
  return <TimelinePage tripId={tripId} />;
}
