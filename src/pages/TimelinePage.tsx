import { useTrip, useTripLiveSync } from "../trip/hooks";
import { tripTravelers } from "../trip/roster";
import { PaperTimeline } from "./PaperTimeline";

const shortDate = (iso: string): string => {
  if (!iso) return "—";
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

// A trip's own wall-clock "now" as a "YYYY-MM-DD HH:MM" string, so it compares
// lexicographically against each item's `${date} ${time}` (both zero-padded).
// Each trip advances on its own base timezone, so the next action tracks that
// clock regardless of the viewer's device timezone. Falls back to the device
// timezone if the stored zone string is invalid (matches `todayIn` in
// PaperTimeline).
const CLOCK_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};
const nowIn = (timeZone: string): string => {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone, ...CLOCK_OPTS }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", CLOCK_OPTS).formatToParts(new Date());
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
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
