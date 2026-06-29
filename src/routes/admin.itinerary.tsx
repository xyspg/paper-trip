import { createFileRoute } from "@tanstack/react-router";
import { ItinerarySection } from "../admin/ItinerarySection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/admin/itinerary")({
  component: ItineraryRoute,
});

function ItineraryRoute() {
  const { stops, setStops, toast } = useAdmin();
  return <ItinerarySection stops={stops} setStops={setStops} toast={toast} />;
}
