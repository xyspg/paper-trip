import { useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import { isLegacyTrip } from "../trip/legacy";
import type { ItemStatus, TripItem } from "../trip/types";
import { PaperTimeline } from "./PaperTimeline";

const statusCycle: ItemStatus[] = ["planned", "locked", "done"];
const nextStatus = (status: ItemStatus): ItemStatus =>
  statusCycle[(statusCycle.indexOf(status) + 1) % statusCycle.length];

const shortDate = (iso: string): string => {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export function TimelinePage({ tripId }: { tripId: string }) {
  useTripLiveSync(tripId); // 挂载时连 WS，收别人的改动（TripLayout 按 tripId key 重挂）
  const op = useTripOp(tripId);
  const { data } = useTrip(tripId);
  // 旧行程加载首帧用静态 tripData 兜底；其他行程等服务端快照
  const trip = data?.trip ?? (isLegacyTrip(tripId) ? tripData : null);

  if (!trip) {
    return (
      <div className="grid place-items-center py-24">
        <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  const orderedDates = [...new Set(trip.items.map((item) => item.date))];
  // Global 1-based stop number per item, precomputed so the render doesn't scan
  // the array with indexOf for every stop.
  const stopNumbers = new Map(trip.items.map((item, index) => [item.id, index + 1]));

  // Fresh trips have no items yet; PaperTimeline hides the next-action row.
  const nextItem = trip.items.find((item) => item.status !== "done") ?? trip.items[0];
  const nextPlan = nextItem
    ? (nextItem.parking?.primary ?? nextItem.notes[0] ?? nextItem.location)
    : "";
  const parkingCount = trip.items.filter((item) => item.parking?.primary).length;
  const dateRange = `${shortDate(trip.dates.start)}–${shortDate(trip.dates.end)}`;

  const cycleStatus = (item: TripItem) =>
    op.mutate({ type: "setItemStatus", itemId: item.id, status: nextStatus(item.status) });

  return (
    <PaperTimeline
      trip={trip}
      orderedDates={orderedDates}
      stopNumbers={stopNumbers}
      nextItem={nextItem}
      nextPlan={nextPlan}
      parkingCount={parkingCount}
      dateRange={dateRange}
      onCycleStatus={cycleStatus}
    />
  );
}
