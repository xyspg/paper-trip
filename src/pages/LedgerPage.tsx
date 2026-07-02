import { useTrip } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import { PaperLedger } from "./PaperLedger";

export function LedgerPage() {
  const { data } = useTrip();
  // Fall back to the seed while the trip loads, matching the timeline page.
  const trip = data?.trip ?? tripData;
  return <PaperLedger trip={trip} />;
}
