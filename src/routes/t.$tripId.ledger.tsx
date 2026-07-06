import { createFileRoute } from "@tanstack/react-router";
import { LedgerPage } from "../pages/LedgerPage";

export const Route = createFileRoute("/t/$tripId/ledger")({
  component: LedgerRoute,
});

function LedgerRoute() {
  const { tripId } = Route.useParams();
  return <LedgerPage tripId={tripId} />;
}
