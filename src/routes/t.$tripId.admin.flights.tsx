import { createFileRoute } from "@tanstack/react-router";
import { FlightsSection } from "../admin/FlightsSection";

export const Route = createFileRoute("/t/$tripId/admin/flights")({
  component: FlightsSection,
});
