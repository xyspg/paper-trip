import { appleMapsUrl } from "../maps";
import { useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import type { ItemStatus, TripItem } from "../trip/types";

type DayAccent = "magenta" | "cyan" | "green";

// Per-day presentational metadata keyed by the real trip dates. The dates and
// ordering come from the data; only the editorial label/tag/accent live here.
const dayMeta: Record<string, { label: string; tag: string; accent: DayAccent }> = {
  "2026-07-03": { label: "抵达 + Anime Expo 第一天", tag: "Arrival Day", accent: "magenta" },
  "2026-07-04": { label: "Anime Expo 全天", tag: "Main Event", accent: "cyan" },
  "2026-07-05": { label: "返程缓冲", tag: "Departure", accent: "green" },
};

const categoryMeta: Record<TripItem["category"], { label: string; className: string }> = {
  flight: { label: "Transit", className: "cat-cyan" },
  drive: { label: "Drive", className: "cat-cyan" },
  food: { label: "Food", className: "cat-yellow" },
  event: { label: "Event", className: "cat-magenta" },
  hotel: { label: "Stay", className: "cat-violet" },
  errand: { label: "Misc", className: "cat-green" },
};

const statusLabel: Record<ItemStatus, string> = {
  planned: "计划中",
  locked: "已锁定",
  done: "已完成",
};

const statusCycle: ItemStatus[] = ["planned", "locked", "done"];
const nextStatus = (status: ItemStatus): ItemStatus =>
  statusCycle[(statusCycle.indexOf(status) + 1) % statusCycle.length];

const formatDayDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  const md = `${date.getMonth() + 1}/${date.getDate()}`;
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${md} · ${weekday}`;
};

const shortDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  return `${date.getMonth() + 1}/${date.getDate()}`;
};

type StopPlan = { kind: "main" | "alt"; label: string; text: string };

const itemPlans = (item: TripItem): StopPlan[] => {
  if (item.parking) {
    const plans: StopPlan[] = [{ kind: "main", label: "主方案", text: item.parking.primary }];
    if (item.parking.backup) {
      plans.push({ kind: "alt", label: "备用", text: item.parking.backup });
    }
    return plans;
  }
  return item.notes.slice(0, 2).map((text, index) => ({
    kind: index === 0 ? "main" : "alt",
    label: index === 0 ? "提示" : "备注",
    text,
  }));
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
  const parkingCount = trip.items.filter(
    (item) => item.parking?.primary && item.parking?.backup,
  ).length;
  const dateRange = `${shortDate(trip.dates.start)}–${shortDate(trip.dates.end)}`;

  const cycleStatus = (item: TripItem) =>
    op.mutate({ type: "setItemStatus", itemId: item.id, status: nextStatus(item.status) });

  return (
    <>
      <header className="masthead">
        <span className="mh-kicker">
          <span className="dot" />
          Plan
        </span>
        <h1 className="mh-title">
          Anime Expo <span className="yr">2026</span>
        </h1>
        <p className="mh-sub">Jul 3 - Jul 5 JFK-LAX/ONT-JFK</p>

        <div className="mh-stats">
          <SummaryStat
            value={trip.items.length.toString()}
            label={`停靠点 · 横跨 ${orderedDates.length} 天`}
            tone="c1"
          />
          <SummaryStat value={parkingCount.toString()} label="主方案 + 备用方案" tone="c2" />
          <SummaryStat value={dateRange} label="周五抵达 · 周日返程" tone="c3" />
        </div>
      </header>

      <section className="nextup" aria-label="下一步行动">
        <span className="nu-flag">下一步行动</span>
        <span className="nu-time">{nextItem.time}</span>
        <div className="nu-body">
          <div className="nu-title">{nextItem.title}</div>
          <div className="nu-note">
            {nextPlan} · {statusLabel[nextItem.status]}
          </div>
        </div>
      </section>

      {orderedDates.map((date, index) => {
        const meta = dayMeta[date] ?? { label: date, tag: "", accent: "cyan" as DayAccent };
        return (
          <section className={`day accent-${meta.accent}`} key={date}>
            <div className="day-head">
              <div className="dh-num">{(index + 1).toString().padStart(2, "0")}</div>
              <div className="dh-meta">
                <div className="dh-date">{formatDayDate(date)}</div>
                <div className="dh-label">{meta.label}</div>
              </div>
              <div className="dh-tag">{meta.tag}</div>
            </div>

            <div className="timeline">
              {trip.items
                .filter((item) => item.date === date)
                .map((item) => (
                  <TicketStop
                    item={item}
                    stopNumber={stopNumbers.get(item.id) ?? 0}
                    key={item.id}
                    compactTime={!item.time.includes(":")}
                    onCycleStatus={cycleStatus}
                  />
                ))}
            </div>
          </section>
        );
      })}

      <section className="legend">
        <h2>图例 · Legend</h2>
        <div className="legend-grid">
          <LegendItem swatch="sw-cyan" label="计划中 Planned" />
          <LegendItem swatch="sw-green" label="已锁定 Locked" />
          <LegendItem swatch="sw-amber" label="已完成 Done" />
          <LegendItem swatch="sw-cyan" label="交通" />
          <LegendItem swatch="sw-yellow" label="用餐" />
          <LegendItem swatch="sw-magenta" label="活动" />
          <LegendItem swatch="sw-violet" label="酒店" />
          <LegendItem swatch="sw-green" label="杂项" />
        </div>
      </section>

      <p className="foot">NYC → LAX</p>
    </>
  );
}

function SummaryStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  return (
    <div className="stat">
      <div className={`num ${tone}`}>{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

function TicketStop({
  item,
  stopNumber,
  compactTime,
  onCycleStatus,
}: {
  item: TripItem;
  stopNumber: number;
  compactTime: boolean;
  onCycleStatus: (item: TripItem) => void;
}) {
  const category = categoryMeta[item.category];
  const isDarkStub = item.category === "event" || item.category === "hotel";
  const plans = itemPlans(item);

  return (
    <article className={`stop ${category.className}`}>
      <div className="pin">{stopNumber}</div>
      <div className="ticket">
        <div className={`stub ${category.className} ${isDarkStub ? "stub-dark" : ""}`}>
          <span className="perf-notch top" />
          <span className="perf-notch bot" />
          <div>
            <div className={`s-time ${compactTime ? "s-time-compact" : ""}`}>{item.time}</div>
            <div className="s-sub">{item.durationMinutes} min</div>
          </div>
          <div className="s-cat">{category.label}</div>
        </div>
        <div className="tbody">
          <div className="tbody-head">
            <h2 className="t-title">{item.title}</h2>
            <button
              type="button"
              className={`status ${item.status}`}
              onClick={() => onCycleStatus(item)}
              title="点击切换状态"
            >
              {statusLabel[item.status]}
            </button>
          </div>
          <div className="t-loc">{item.location}</div>
          <a
            className="t-addr"
            href={appleMapsUrl(`${item.location}, ${item.address}`)}
            target="_blank"
            rel="noreferrer"
          >
            {item.address}
          </a>
          {plans.length > 0 && (
            <div className="plans">
              {plans.map((plan) => (
                <Plan key={plan.label} kind={plan.kind} label={plan.label} text={plan.text} />
              ))}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function Plan({ kind, label, text }: { kind: "main" | "alt"; label: string; text: string }) {
  return (
    <div className={`plan ${kind}`}>
      <span className="pk">{label}</span>
      <span className="pt">{text}</span>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  return (
    <div className="lg-item">
      <span className={`lg-sw ${swatch}`} />
      {label}
    </div>
  );
}
