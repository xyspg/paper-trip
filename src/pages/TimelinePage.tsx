import { useTrip, useTripLiveSync } from "../trip/hooks";
import { tripTravelers } from "../trip/roster";
import { nowIn } from "../trip/tripClock";
import { PaperTimeline } from "./PaperTimeline";

const shortDate = (iso: string): string => {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

export function TimelinePage({ tripId }: { tripId: string }) {
  useTripLiveSync(tripId); // 挂载时连 WS，收别人的改动（TripLayout 按 tripId key 重挂）
  const { data } = useTrip(tripId);
  const trip = data?.trip ?? null;

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

  // 下一步行动按行程自己的时区（trip.base.timezone）的当前时间推导：取第一个尚未
  // 开始的行程，已经过去的（含前一天）自动跳过。行程全部结束（或空行程）时
  // nextItem 为 undefined，PaperTimeline 据此隐藏下一步行动行。
  const now = nowIn(trip.base.timezone);
  const nextItem = trip.items.find((item) => `${item.date} ${item.time}` >= now);
  const nextPlan = nextItem
    ? (nextItem.parking?.primary ?? nextItem.notes[0] ?? nextItem.location)
    : "";
  const travelerCount = tripTravelers(trip).length;
  const dateRange = `${shortDate(trip.dates.start)}–${shortDate(trip.dates.end)}`;

  return (
    <PaperTimeline
      trip={trip}
      orderedDates={orderedDates}
      stopNumbers={stopNumbers}
      nextItem={nextItem}
      nextPlan={nextPlan}
      travelerCount={travelerCount}
      dateRange={dateRange}
    />
  );
}
