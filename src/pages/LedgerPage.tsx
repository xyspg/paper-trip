import { useTrip } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import { isLegacyTrip } from "../trip/legacy";
import { PaperLedger } from "./PaperLedger";

export function LedgerPage({ tripId }: { tripId: string }) {
  const { data } = useTrip(tripId);
  // Legacy trip falls back to the seed while loading, matching the timeline page.
  const trip = data?.trip ?? (isLegacyTrip(tripId) ? tripData : null);
  if (!trip) {
    return (
      <div className="grid place-items-center py-24">
        <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }
  // `rev` is the DO document revision of the snapshot being shown; the PDF
  // export stamps it on the statement (absent while the legacy seed fills in).
  return <PaperLedger trip={trip} rev={data?.rev} />;
}
