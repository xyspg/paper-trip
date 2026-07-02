import { useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import type { ItemStatus, TripItem } from "../trip/types";
import { PaperTimeline } from "./PaperTimeline";

const statusCycle: ItemStatus[] = ["planned", "locked", "done"];
const nextStatus = (status: ItemStatus): ItemStatus =>
  statusCycle[(statusCycle.indexOf(status) + 1) % statusCycle.length];

const shortDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export function TimelinePage() {
  useTripLiveSync(); // 挂载时连 WS，收别人的改动
  const op = useTripOp();
  const { data } = useTrip();
  // 加载首帧用静态 tripData 兜底，拿到服务端数据后自动替换
  const trip = data?.trip ?? tripData;

  const orderedDates = [...new Set(trip.items.map((item) => item.date))];
  // Global 1-based stop number per item, precomputed so the render doesn't scan
  // the array with indexOf for every stop.
  const stopNumbers = new Map(trip.items.map((item, index) => [item.id, index + 1]));

  const nextItem = trip.items.find((item) => item.status !== "done") ?? trip.items[0];
  const nextPlan = nextItem.parking?.primary ?? nextItem.notes[0] ?? nextItem.location;
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
