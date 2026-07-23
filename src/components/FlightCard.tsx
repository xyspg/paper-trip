import { Plane } from "lucide-react";
import type { ReactNode } from "react";
import type { Flight } from "../trip/types";

type Traveler = {
  name: string;
  avatarUrl?: string;
  color?: string;
};

type Props = {
  flight: Flight;
  traveler: Traveler;
  actions?: ReactNode;
  compact?: boolean;
};

const formatDate = (date: string) => {
  if (!date) return "日期待定";
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
    weekday: "short",
    timeZone: "UTC",
  }).format(parsed);
};

function TravelerAvatar({ traveler }: { traveler: Traveler }) {
  const initials = traveler.name.trim().slice(0, 2).toUpperCase() || "?";
  return traveler.avatarUrl ? (
    <img
      className="size-7 rounded-full object-cover"
      src={traveler.avatarUrl}
      alt=""
      draggable={false}
    />
  ) : (
    <span
      className="grid size-7 place-items-center rounded-full font-grotesk text-[10px] font-bold text-white"
      style={{ background: traveler.color ?? "#3f6f5b" }}
    >
      {initials}
    </span>
  );
}

function Endpoint({ endpoint, label }: { endpoint: Flight["departure"]; label: string }) {
  return (
    <div className="min-w-0">
      <div className="font-grotesk text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#9b988f]">
        {label}
      </div>
      <div className="mt-1.5 truncate font-sans text-[22px] font-extrabold tracking-[-0.02em] text-[#1c1b19]">
        {endpoint.airport}
      </div>
      <div className="mt-1 font-cjk text-[12.5px] font-semibold text-[#3b3833]">
        {formatDate(endpoint.date)} · {endpoint.time}
      </div>
      {endpoint.timezone && (
        <div className="mt-1 truncate font-mono text-[9.5px] text-[#9b988f]">
          {endpoint.timezone}
        </div>
      )}
    </div>
  );
}

export function FlightCard({ flight, traveler, actions, compact }: Props) {
  const identity = [flight.airline, flight.flightNumber].filter(Boolean).join(" · ");
  return (
    <article className="overflow-hidden rounded-[14px] border border-[#ebe9e3] bg-white">
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#f0eee8] px-4 py-3">
        <TravelerAvatar traveler={traveler} />
        <span className="font-cjk text-[12.5px] font-bold text-[#3b3833]">{traveler.name}</span>
        {identity ? (
          <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.1em] text-[#5b7a99]">
            {identity}
          </span>
        ) : (
          <span className="font-grotesk text-[10px] uppercase tracking-[0.1em] text-[#9b988f]">
            Flight
          </span>
        )}
        {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
      </div>

      <div
        className={`grid items-center gap-4 px-5 ${compact ? "grid-cols-[1fr_auto_1fr] py-4" : "grid-cols-[1fr_minmax(62px,0.35fr)_1fr] py-5"} max-[520px]:grid-cols-[1fr_auto_1fr] max-[520px]:gap-3`}
      >
        <Endpoint endpoint={flight.departure} label="Departure · 出发" />
        <div className="flex items-center justify-center gap-1 text-[#5b7a99]" aria-hidden="true">
          <span className="h-px min-w-3 flex-1 bg-[#cdd8e2]" />
          <Plane className="shrink-0 rotate-45" size={compact ? 16 : 19} strokeWidth={2.1} />
          <span className="h-px min-w-3 flex-1 bg-[#cdd8e2]" />
        </div>
        <Endpoint endpoint={flight.arrival} label="Arrival · 到达" />
      </div>

      {(flight.confirmation || flight.notes) && (
        <div className="grid gap-2 border-t border-dashed border-[#ebe9e3] bg-[#fdfdfb] px-4 py-3 font-cjk text-[12px] leading-relaxed text-[#76726a]">
          {flight.confirmation && (
            <div>
              <span className="mr-2 font-grotesk text-[9.5px] font-semibold uppercase tracking-[0.1em] text-[#9b988f]">
                Confirmation
              </span>
              <span className="font-mono font-semibold text-[#3b3833]">{flight.confirmation}</span>
            </div>
          )}
          {flight.notes && <div>{flight.notes}</div>}
        </div>
      )}
    </article>
  );
}
