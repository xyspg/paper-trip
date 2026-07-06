import { PaperBookings } from "./PaperBookings";
import { isLegacyTrip } from "../trip/legacy";

// The bookings view is curated content (flights/hotel hardcoded for the legacy
// trip). Other trips get an empty state until bookings become trip data.
export function BookingsPage({ tripId }: { tripId: string }) {
  if (!isLegacyTrip(tripId)) {
    return (
      <div className="grid place-items-center py-20">
        <div className="w-full max-w-[420px] bg-white border border-[#ebe9e3] rounded-[14px] p-7 text-center">
          <div className="font-grotesk text-[11px] tracking-[0.16em] uppercase text-[#3f6f5b]">
            Bookings
          </div>
          <h1 className="mt-2 font-sans font-bold text-[22px] tracking-tight">暂无预订信息</h1>
          <p className="mt-3 font-cjk text-[13.5px] text-[#76726a] leading-relaxed">
            这个行程还没有录入航班或酒店。把确认号和时间记到行程时间线的停靠点备注里即可。
          </p>
        </div>
      </div>
    );
  }
  return <PaperBookings />;
}
