import { Outlet, createFileRoute } from "@tanstack/react-router";
import { TripLayout } from "../components/TripLayout";

// Everything trip-scoped lives under this layout: it resolves registry
// metadata + the caller's role and gates private trips. Keyed by tripId so
// switching trips remounts the subtree (fresh websocket, fresh mount state).
export const Route = createFileRoute("/t/$tripId")({
  component: TripRoute,
});

function TripRoute() {
  const { tripId } = Route.useParams();
  return (
    <TripLayout key={tripId} tripId={tripId}>
      <Outlet />
    </TripLayout>
  );
}
