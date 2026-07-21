import { createFileRoute } from "@tanstack/react-router";
import { ItinerarySection } from "../admin/ItinerarySection";
import { useAdmin } from "../admin/AdminContext";
import { useTripAccess } from "../components/TripLayout";

export const Route = createFileRoute("/t/$tripId/admin/itinerary")({
  component: ItineraryRoute,
});

function ItineraryRoute() {
  const { items, tripOp, toast } = useAdmin();
  const { meta } = useTripAccess();
  return (
    <ItinerarySection
      items={items}
      startDate={meta.startDate}
      endDate={meta.endDate}
      timezone={meta.timezone}
      tripOp={tripOp}
      toast={toast}
    />
  );
}
