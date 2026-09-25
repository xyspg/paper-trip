import { useState, type ReactNode } from "react";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import {
  AlertTriangle,
  Archive,
  ChevronDown,
  Clock,
  DollarSign,
  ExternalLink,
  Hash,
  Lock,
  MapPin,
  Repeat2,
  Route,
} from "lucide-react";
import { signInWithGitHub, useAdminUser } from "../admin/auth";
import { AddressLink } from "../components/AddressLink";
import { SuggestBox } from "../components/SuggestBox";
import { todayIn } from "../trip/tripClock";
import type { ItemStatus, Trip, TripItem } from "../trip/types";
import {
  formatDayDate,
  hasRichParking,
  itemPlans,
  renderRich,
  tripDayNumber,
  type StopPlan,
} from "./timelineShared";

// Paper theme timeline. It is entirely driven by the current trip; dynamic
// per-category/status hues use inline styles so Tailwind never purges them.

type PaperTimelineProps = {
  trip: Trip;
  orderedDates: string[];
  stopNumbers: Map<string, number>;
  nextItem?: TripItem;
  nextPlan: string;
  travelerCount: number;
  dateRange: string;
};

type Swatch = { color: string; border: string; bg: string };

const categoryMeta: Record<TripItem["category"], { name: MessageDescriptor } & Swatch> = {
  flight: { name: msg`交通 · Transit`, color: "#5b7a99", border: "#cdd8e2", bg: "#eef2f6" },
  drive: { name: msg`交通 · Drive`, color: "#5b7a99", border: "#cdd8e2", bg: "#eef2f6" },
  food: { name: msg`用餐 · Food`, color: "#b08648", border: "#e6d3ad", bg: "#f7f0e2" },
  event: { name: msg`活动 · Event`, color: "#c2553f", border: "#ecccc2", bg: "#f8efec" },
  hotel: { name: msg`酒店 · Stay`, color: "#7a5c84", border: "#ddccdf", bg: "#f5eef6" },
  errand: { name: msg`杂项 · Misc`, color: "#3f6f5b", border: "#cfe0d6", bg: "#eef4f0" },
};

const statusMeta: Record<ItemStatus, { label: MessageDescriptor } & Swatch> = {
  locked: { label: msg`已锁定`, color: "#3f6f5b", border: "#cfe0d6", bg: "#eef4f0" },
  planned: { label: msg`计划中`, color: "#5b7a99", border: "#cdd8e2", bg: "#eef2f6" },
  done: { label: msg`已完成`, color: "#76726a", border: "#ebe9e3", bg: "#fdfdfb" },
};

const PAPER_BOLD = "font-bold text-[#1c1b19]";

// Short label for a stop that carries its own timezone ("EDT", "GMT+9"),
// resolved on that stop's date so DST is right. Null when it matches the
// trip default or the zone string is invalid.
const zoneTag = (item: TripItem, defaultTimezone: string): string | null => {
  if (!item.timezone || item.timezone === defaultTimezone) return null;
  try {
    return (
      new Intl.DateTimeFormat("en-US", { timeZone: item.timezone, timeZoneName: "short" })
        .formatToParts(new Date(`${item.date}T12:00:00`))
        .find((p) => p.type === "timeZoneName")?.value ?? null
    );
  } catch {
    return null;
  }
};

export function PaperTimeline({
  trip,
  orderedDates,
  stopNumbers,
  nextItem,
  nextPlan,
  travelerCount,
  dateRange,
}: PaperTimelineProps) {
  const { t } = useLingui();
  const titleWords = trip.title.trim().split(/\s+/);
  const titleYear = titleWords.length > 1 ? titleWords.pop() : undefined;
  const titleLead = titleWords.join(" ");
  // Fresh trips have no items yet; the next-action row simply doesn't render.
  const nextStatus = nextItem ? statusMeta[nextItem.status] : undefined;

  // Days before today in the trip's own timezone are archived into a collapsed section at the
  // bottom; the rest stay inline. Manual header toggles are stored as sparse
  // overrides so the date-derived defaults (archived → collapsed) still apply
  // to days the user never touched, even after server data replaces the trip.
  // Archived by the trip's own calendar date, not the device's, so a day is not
  // archived while it is still that evening at the destination.
  const today = todayIn(trip.base.timezone);
  const activeDates = orderedDates.filter((date) => date >= today);
  const archivedDates = orderedDates.filter((date) => date < today);
  const dayCount = orderedDates.length;
  const archivedCount = archivedDates.length;
  const [dayOverrides, setDayOverrides] = useState<Record<string, boolean>>({});
  const [archiveOpen, setArchiveOpen] = useState(false);
  const isDayCollapsed = (date: string) => dayOverrides[date] ?? date < today;
  const toggleDay = (date: string) =>
    setDayOverrides((prev) => ({ ...prev, [date]: !isDayCollapsed(date) }));

  const renderDay = (date: string) => (
    <DaySection
      key={date}
      tripId={trip.id}
      defaultTimezone={trip.base.timezone}
      date={date}
      dayNumber={tripDayNumber(trip.dates.start, date)}
      items={trip.items.filter((item) => item.date === date)}
      stopNumbers={stopNumbers}
      collapsed={isDayCollapsed(date)}
      onToggle={() => toggleDay(date)}
    />
  );

  return (
    <div className="font-sans text-[#1c1b19]">
      {/* MASTHEAD */}
      <header className="pb-[30px] border-b border-[#ebe9e3]">
        <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f6f5b]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#3f6f5b]" />
          <Trans>行程作战表 · Travel Ops</Trans>
        </span>
        <h1 className="mt-3.5 font-sans font-extrabold tracking-[-0.03em] leading-[0.98] text-[clamp(38px,7vw,60px)]">
          {titleLead}
          {titleYear && <span className="text-[#3f6f5b]"> {titleYear}</span>}
        </h1>
        <p className="mt-4 max-w-[54ch] font-cjk text-[14.5px] leading-[1.8] text-[#76726a]">
          {trip.subtitle} · {dateRange}
        </p>

        <div className="grid grid-cols-3 mt-6.5 overflow-hidden border border-[#ebe9e3] rounded-[14px] max-[620px]:grid-cols-1">
          <Stat k="Stops" v={trip.items.length.toString()} sub={t`停靠点 · 横跨 ${dayCount} 天`} />
          <Stat k="Travelers" v={travelerCount.toString()} sub={t`同行人数 · Travelers`} />
          <Stat k="Window" v={dateRange} sub={t`行程日期 · Travel dates`} accent />
        </div>
      </header>

      {/* NEXT ACTION */}
      {nextItem && nextStatus && (
        <section
          className="flex gap-[18px] items-center flex-wrap mt-[22px] py-[18px] px-[22px] bg-white border border-[#ebe9e3] rounded-[14px]"
          aria-label={t`下一步行动`}
        >
          <span className="font-grotesk text-[10px] font-semibold uppercase tracking-[0.14em] text-white bg-[#3f6f5b] rounded-full py-[5px] px-3">
            <Trans>下一步行动</Trans>
          </span>
          <span className="font-grotesk font-bold text-[30px] tracking-[-0.02em]">
            {nextItem.time}
          </span>
          <div>
            <div className="font-cjk font-bold text-[17px]">{nextItem.title}</div>
            <div className="mt-[3px] font-cjk text-[12.5px] text-[#76726a]">
              {nextPlan} · {t(nextStatus.label)}
            </div>
          </div>
          <span
            className="ml-auto font-grotesk text-[10.5px] font-semibold tracking-[0.04em] rounded-full py-[5px] px-3 border"
            style={{
              color: nextStatus.color,
              borderColor: nextStatus.border,
              background: nextStatus.bg,
            }}
          >
            {t(nextStatus.label)}
          </span>
        </section>
      )}

      {/* EMPTY STATE — a brand-new trip with no stops yet */}
      {trip.items.length === 0 && (
        <section className="grid place-items-center mt-[22px] py-16 px-6 bg-white border border-[#ebe9e3] rounded-[14px] text-center">
          <div>
            <div className="font-grotesk text-[11px] tracking-[0.16em] uppercase text-[#3f6f5b]">
              Empty Timeline
            </div>
            <div className="mt-2 font-sans font-bold text-[20px] tracking-tight">
              <Trans>还没有停靠点</Trans>
            </div>
            <p className="mt-2 font-cjk text-[13px] text-[#76726a] leading-relaxed">
              <Trans>在后台的「行程停靠点」里添加第一站，时间线就会出现在这里。</Trans>
            </p>
          </div>
        </section>
      )}

      {/* DAY SECTIONS */}
      {activeDates.map(renderDay)}

      {/* ARCHIVED DAYS — days already past at the destination, tucked behind one toggle */}
      {archivedDates.length > 0 && (
        <section className="mt-[clamp(34px,6vw,48px)]">
          <button
            type="button"
            aria-expanded={archiveOpen}
            onClick={() => setArchiveOpen((open) => !open)}
            className="flex w-full items-center justify-center gap-2.5 py-3 px-[18px] bg-transparent border border-dashed border-[#cfccc2] rounded-[14px] font-cjk font-semibold text-[13px] text-[#76726a] cursor-pointer transition-colors hover:border-[#1c1b19] hover:text-[#1c1b19]"
          >
            <Archive size={15} strokeWidth={2.2} />
            <Trans>查看已归档日程（{archivedCount} 天）</Trans>
            <ChevronDown
              className={`transition-transform ${archiveOpen ? "rotate-180" : ""}`}
              size={16}
              strokeWidth={2.2}
            />
          </button>
          {archiveOpen && archivedDates.map(renderDay)}
        </section>
      )}

      {/* LEGEND */}
      <section className="mt-[clamp(34px,6vw,48px)] p-[22px] bg-white border border-[#ebe9e3] rounded-[14px]">
        <h3 className="mb-4 font-grotesk font-bold text-[12px] uppercase tracking-[0.14em]">
          <Trans>图例 · Legend</Trans>
        </h3>
        <div className="flex flex-wrap gap-x-[22px] gap-y-2.5">
          <Legend color="#3f6f5b" label={t`已锁定 Locked`} />
          <Legend color="#5b7a99" label={t`计划中 Planned`} />
          <Legend color="#76726a" label={t`已完成 Done`} />
          <Legend color="#5b7a99" label={t`交通`} />
          <Legend color="#b08648" label={t`用餐`} />
          <Legend color="#c2553f" label={t`活动`} />
          <Legend color="#7a5c84" label={t`酒店`} />
          <Legend color="#3f6f5b" label={t`杂项`} />
        </div>
      </section>
    </div>
  );
}

function DaySection({
  tripId,
  defaultTimezone,
  date,
  dayNumber,
  items,
  stopNumbers,
  collapsed,
  onToggle,
}: {
  tripId: string;
  defaultTimezone: string;
  date: string;
  dayNumber: number;
  items: TripItem[];
  stopNumbers: Map<string, number>;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const { t } = useLingui();
  const stopCount = items.length;
  return (
    <section className="mt-[clamp(34px,6vw,48px)]">
      <button
        type="button"
        aria-expanded={!collapsed}
        title={collapsed ? t`展开当天日程` : t`折叠当天日程`}
        onClick={onToggle}
        className="flex gap-[13px] items-center mb-1 w-full p-0 bg-transparent border-0 text-left text-inherit cursor-pointer group"
      >
        <span className="grid shrink-0 w-[38px] h-[38px] place-items-center font-grotesk font-bold text-[14px] tracking-[0.02em] text-[#fafaf8] bg-[#1c1b19] rounded-[10px]">
          {dayNumber.toString().padStart(2, "0")}
        </span>
        <span className="min-w-0">
          <span className="block font-grotesk font-bold text-[15px] tracking-[0.04em]">
            {formatDayDate(date)}
          </span>
          <span className="block mt-px font-cjk text-[12.5px] text-[#76726a]">
            {collapsed ? (
              <Trans>
                第 {dayNumber} 天 · {stopCount} 站
              </Trans>
            ) : (
              <Trans>第 {dayNumber} 天</Trans>
            )}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2.5">
          <ChevronDown
            className={`text-[#9b988f] transition-transform group-hover:text-[#1c1b19] ${collapsed ? "-rotate-90" : ""}`}
            size={18}
            strokeWidth={2.2}
          />
        </span>
      </button>

      {!collapsed && (
        <div className="relative mt-[18px] pl-[30px] before:content-[''] before:absolute before:left-[13px] before:top-2 before:bottom-2 before:w-px before:bg-[#ebe9e3] max-[620px]:pl-0 max-[620px]:before:hidden">
          {items.map((item) => (
            <Ticket
              key={item.id}
              tripId={tripId}
              zone={zoneTag(item, defaultTimezone)}
              item={item}
              stopNumber={stopNumbers.get(item.id) ?? 0}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({ k, v, sub, accent }: { k: string; v: string; sub: string; accent?: boolean }) {
  return (
    <div className="py-4 px-5 border-l border-[#ebe9e3] first:border-l-0 max-[620px]:border-l-0 max-[620px]:border-t max-[620px]:border-[#ebe9e3] max-[620px]:first:border-t-0">
      <div className="font-grotesk text-[10px] uppercase tracking-[0.12em] text-[#9b988f]">{k}</div>
      <div
        className={`mt-[7px] font-sans font-extrabold text-[26px] tracking-[-0.01em]${accent ? " text-[#3f6f5b]" : ""}`}
      >
        {v}
      </div>
      <div className="mt-[3px] font-cjk text-[11.5px] text-[#76726a]">{sub}</div>
    </div>
  );
}

function Ticket({
  tripId,
  zone,
  item,
  stopNumber,
}: {
  tripId: string;
  zone: string | null;
  item: TripItem;
  stopNumber: number;
}) {
  const { t } = useLingui();
  const category = categoryMeta[item.category];
  const plans = itemPlans(item);
  const compact = !item.time.includes(":");

  return (
    <article className="relative mb-4 last:mb-0">
      <div className="absolute left-[-30px] top-5 z-[3] grid w-[27px] h-[27px] place-items-center bg-white border border-[#ebe9e3] rounded-full font-grotesk font-bold text-[12px] text-[#3b3833] max-[620px]:static max-[620px]:mb-[-8px]">
        {stopNumber}
      </div>

      <div className="flex overflow-hidden bg-white border border-[#ebe9e3] rounded-[14px] max-[620px]:flex-col">
        <div className="shrink-0 flex flex-col justify-center items-center gap-3 w-[118px] py-[18px] px-3.5 text-center border-r border-[#f0eee8] max-[620px]:flex-row max-[620px]:justify-start max-[620px]:w-full max-[620px]:border-r-0 max-[620px]:border-b">
          <div
            className={`font-grotesk font-bold leading-[0.95] tracking-[-0.01em] ${compact ? "text-[20px]" : "text-[clamp(22px,3.4vw,26px)]"}`}
          >
            {item.time}
            {zone && (
              <span className="block mt-1 font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.08em] text-[#b08648]">
                <Trans>{zone} 当地</Trans>
              </span>
            )}
          </div>
          <span
            className="font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.08em] rounded-full py-1 px-2.5 border max-[620px]:ml-auto"
            style={{ color: category.color, borderColor: category.border, background: category.bg }}
          >
            {t(category.name)}
          </span>
        </div>

        <div className="flex-1 min-w-0 py-[18px] px-5">
          <div className="flex gap-2.5 items-start flex-wrap">
            <h2 className="flex-1 min-w-[150px] m-0 font-cjk font-bold text-[18px] leading-[1.25]">
              {item.title}
            </h2>
          </div>
          <div className="mt-[9px] font-cjk font-semibold text-[13.5px]">{item.location}</div>
          <AddressLink
            className="inline-block mt-[3px] font-mono text-[11.5px] text-[#9b988f] no-underline hover:text-[#1c1b19] hover:underline hover:underline-offset-2"
            query={`${item.location}, ${item.address}`}
          >
            {item.address}
          </AddressLink>

          {item.parking && hasRichParking(item) && <ParkingPanel tripId={tripId} item={item} />}

          {plans.length > 0 && (
            <div className="grid gap-2 mt-3.5">
              {plans.map((plan, index) => (
                <PlanRow key={`${plan.label}-${index}`} plan={plan} />
              ))}
            </div>
          )}

          <div className="mt-3 flex">
            <SuggestBox tripId={tripId} itemId={item.id} itemTitle={item.title} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PlanRow({ plan }: { plan: StopPlan }) {
  const alt = plan.kind === "alt";
  return (
    <div
      className={`flex gap-[11px] items-start py-2.5 px-[13px] rounded-[10px] border ${
        alt ? "border-dashed border-[#d8d5cb] bg-[#fafaf8]" : "border-[#ebe9e3] bg-[#fdfdfb]"
      }`}
    >
      <span
        className={`shrink-0 mt-0.5 font-grotesk font-bold text-[9.5px] uppercase tracking-[0.06em] ${
          alt ? "text-[#9b988f]" : "text-[#3f6f5b]"
        }`}
      >
        {plan.label}
      </span>
      <span
        className={`font-cjk text-[13px] leading-[1.6] ${alt ? "text-[#76726a]" : "text-[#3b3833]"}`}
      >
        {renderRich(plan.text, PAPER_BOLD)}
      </span>
    </div>
  );
}

function ParkingPanel({ tripId, item }: { tripId: string; item: TripItem }) {
  const parking = item.parking;
  if (!parking) return null;

  const timeWindow =
    parking.validFrom && parking.validTo ? `${parking.validFrom} - ${parking.validTo}` : undefined;
  const walk =
    parking.walkMinutes && parking.walkDistanceMiles
      ? `${parking.walkMinutes} min / ${parking.walkDistanceMiles} mi`
      : undefined;

  return (
    <div className="mt-3.5 overflow-hidden border border-[#e6dfd4] rounded-[13px] bg-[#fdfdfb]">
      <div className="flex flex-wrap gap-2 items-center px-[13px] py-[10px] border-b border-[#ebe9e3] bg-[#f7f0e2]">
        <span className="font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.12em] text-white bg-[#1c1b19] rounded-full py-[3px] px-2.5">
          Parking
        </span>
        <span className="font-cjk font-bold text-[13.5px] text-[#1c1b19]">{parking.primary}</span>
        {parking.provider && (
          <span className="ml-auto font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.08em] text-[#76726a] border border-[#e0d8cc] bg-white rounded-full py-[3px] px-2 max-[620px]:ml-0">
            {parking.provider}
          </span>
        )}
      </div>

      <div className="grid grid-cols-[1.05fr_0.95fr] gap-3 p-[13px] max-[760px]:grid-cols-1">
        <div className="min-w-0">
          <div className="grid grid-cols-2 gap-2 max-[500px]:grid-cols-1">
            {parking.reservationId && (
              <ParkingFact
                icon={<Hash size={13} />}
                label="Rental ID"
                value={parking.reservationId}
              />
            )}
            {timeWindow && (
              <ParkingFact icon={<Clock size={13} />} label="Window" value={timeWindow} />
            )}
            {typeof parking.price === "number" && (
              <ParkingFact
                icon={<DollarSign size={13} />}
                label="Total"
                value={`$${parking.price.toFixed(2)}`}
              />
            )}
            {walk && <ParkingFact icon={<Route size={13} />} label="Walk" value={walk} />}
            {parking.inOutAllowed && (
              <ParkingFact icon={<Repeat2 size={13} />} label="Access" value="In & Out Allowed" />
            )}
          </div>

          {parking.warning && (
            <div className="flex gap-[9px] items-start mt-2.5 py-2.5 px-[13px] rounded-[10px] border border-[#ead6a3] bg-[#fff8dc] font-cjk text-[12px] leading-[1.6] text-[#3b3833]">
              <AlertTriangle
                className="shrink-0 mt-[2px] text-[#b08648]"
                size={15}
                strokeWidth={2.4}
              />
              <span>{parking.warning}</span>
            </div>
          )}

          {parking.notes && parking.notes.length > 0 && (
            <div className="grid gap-1.5 mt-2.5">
              {parking.notes.map((note) => (
                <div className="font-cjk text-[12px] leading-[1.55] text-[#76726a]" key={note}>
                  {note}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid content-start gap-2">
          {parking.address && (
            <AddressLink
              className="inline-flex items-center gap-2.5 w-full box-border py-2.5 px-[13px] rounded-[10px] border border-[#ebe9e3] bg-white text-[#1c1b19] no-underline font-cjk font-semibold text-[12.5px] hover:border-[#cfc7bb]"
              query={parking.address}
              leading={<MapPin className="shrink-0 text-[#3f6f5b]" size={16} strokeWidth={2.4} />}
            >
              <span className="flex-1 min-w-0">
                <span className="block font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.1em] text-[#9b988f]">
                  Map
                </span>
                <span className="block truncate">{parking.address}</span>
              </span>
            </AddressLink>
          )}

          {parking.reservationId && (
            <ParkingPassButton
              tripId={tripId}
              reservationId={parking.reservationId}
              provider={parking.provider ?? "Parking"}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// The provider pass URL is a capability link (holding it = authority to edit or
// cancel the reservation), so it stays server-side: signed-in admins follow the
// trip-scoped redirect, everyone else is offered the GitHub login first.
function ParkingPassButton({
  tripId,
  reservationId,
  provider,
}: {
  tripId: string;
  reservationId: string;
  provider: string;
}) {
  const { data: user } = useAdminUser();
  const { t } = useLingui();
  const className =
    "inline-flex items-center justify-center gap-2 py-2.5 px-[13px] rounded-[10px] border-0 bg-[#1c1b19] text-white no-underline font-grotesk font-semibold text-[10.5px] uppercase tracking-[0.1em] cursor-pointer hover:bg-[#3f6f5b]";

  return user ? (
    <a
      className={className}
      href={`/api/trips/${encodeURIComponent(tripId)}/parking-pass/${encodeURIComponent(reservationId)}`}
      target="_blank"
      rel="noreferrer"
    >
      {provider} Pass
      <ExternalLink size={14} strokeWidth={2.4} />
    </a>
  ) : (
    <button
      type="button"
      className={className}
      title={t`使用 GitHub 登录后打开`}
      onClick={() => signInWithGitHub(window.location.pathname)}
    >
      <Trans>{provider} Pass · 登录打开</Trans>
      <Lock size={14} strokeWidth={2.4} />
    </button>
  );
}

function ParkingFact({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2 items-start min-w-0 py-2 px-[11px] rounded-[10px] border border-[#ebe9e3] bg-white">
      <span className="grid shrink-0 place-items-center w-[23px] h-[23px] rounded-[7px] bg-[#eef4f0] text-[#3f6f5b]">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.08em] text-[#9b988f]">
          {label}
        </span>
        <span className="block font-cjk font-bold text-[12.5px] text-[#1c1b19] truncate">
          {value}
        </span>
      </span>
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex gap-2 items-center font-cjk font-semibold text-[12.5px] text-[#3b3833]">
      <span className="w-3 h-3 rounded-[4px]" style={{ background: color }} />
      {label}
    </div>
  );
}
