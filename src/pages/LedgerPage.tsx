import { useTrip } from "../trip/hooks";
import { PaperLedger } from "./PaperLedger";

export function LedgerPage({ tripId, autoExport }: { tripId: string; autoExport?: boolean }) {
  const { data } = useTrip(tripId);
  const trip = data?.trip ?? null;
  if (!trip) {
    return (
      <div className="grid place-items-center py-24">
        <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }
  // `rev` is the DO document revision of the snapshot being shown; the PDF
  // export stamps it on the statement once the live snapshot arrives.
  return <PaperLedger trip={trip} rev={data?.rev} autoExport={autoExport} />;
}
