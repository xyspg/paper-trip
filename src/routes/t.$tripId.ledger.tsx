import { createFileRoute } from "@tanstack/react-router";
import { LedgerPage } from "../pages/LedgerPage";

// ?export=pdf is the shareable statement link: opening it generates the
// ledger PDF and shows it in this tab. Any other value is dropped.
type LedgerSearch = { export?: "pdf" };

export const Route = createFileRoute("/t/$tripId/ledger")({
  validateSearch: (search: Record<string, unknown>): LedgerSearch =>
    search.export === "pdf" ? { export: "pdf" } : {},
  component: LedgerRoute,
});

function LedgerRoute() {
  const { tripId } = Route.useParams();
  const search = Route.useSearch();
  return <LedgerPage tripId={tripId} autoExport={search.export === "pdf"} />;
}
