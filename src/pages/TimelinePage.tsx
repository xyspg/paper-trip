import type { CSSProperties, ReactNode } from "react";
import { AddressLink } from "../components/AddressLink";
import { SuggestBox } from "../components/SuggestBox";
import { cardRecs } from "../trip/cardRecs";
import { categoryColor } from "../trip/categoryColor";
import { useCardImage, useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
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
  flight: { label: "Transit", className: "[--cat:var(--color-cyan)]" },
  drive: { label: "Drive", className: "[--cat:var(--color-cyan)]" },
  food: { label: "Food", className: "[--cat:var(--color-yellow)]" },
  event: { label: "Event", className: "[--cat:var(--color-magenta)]" },
  hotel: { label: "Stay", className: "[--cat:var(--color-violet)]" },
  errand: { label: "Misc", className: "[--cat:var(--color-green)]" },
};

// Render lightweight **bold** spans inside an otherwise plain editorial string.
const renderRich = (text: string): ReactNode[] =>
  text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) =>
      index % 2 === 1 ? (
        <b key={index} className="font-extrabold">
          {part}
        </b>
      ) : (
        part
      ),
    );

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
      <header className="relative isolate overflow-hidden p-[clamp(22px,4vw,40px)] text-paper bg-ink border-[3px] border-ink rounded-card shadow-hard before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_26px,rgb(255_45_107_/_10%)_26px_28px),radial-gradient(circle_at_88%_12%,rgb(0_191_212_/_22%),transparent_42%),radial-gradient(circle_at_8%_96%,rgb(255_196_0_/_16%),transparent_40%)]">
        <span className="inline-flex gap-2.5 items-center px-3 py-1.5 mb-4.5 text-ink uppercase tracking-[0.28em] bg-yellow border-2 border-paper rounded-full font-grotesk text-[12px] font-extrabold">
          <span className="w-[7px] h-[7px] bg-magenta rounded-full" />
          Plan
        </span>
        <h1 className="m-0 uppercase tracking-normal font-display text-[clamp(38px,9vw,92px)] font-black leading-[0.92]">
          Anime Expo{" "}
          <span className="text-magenta [-webkit-text-stroke:2px_var(--color-paper)] [paint-order:stroke_fill]">
            2026
          </span>
        </h1>
        <p className="max-w-[52ch] mt-3.5 mx-0 mb-0 text-paper/78 font-cjk text-[clamp(14px,2.2vw,18px)] font-medium">
          Jul 3 - Jul 5 JFK-LAX/ONT-JFK
        </p>

        <div className="grid grid-cols-3 mt-6.5 overflow-hidden border-2 border-paper rounded-xl max-[560px]:grid-cols-1">
          <SummaryStat
            value={trip.items.length.toString()}
            label={`停靠点 · 横跨 ${orderedDates.length} 天`}
            tone="c1"
          />
          <SummaryStat value={parkingCount.toString()} label="主方案 + 备用方案" tone="c2" />
          <SummaryStat value={dateRange} label="周五抵达 · 周日返程" tone="c3" />
        </div>
      </header>

      <section
        className="relative flex flex-wrap gap-[clamp(16px,3vw,32px)] items-center py-[clamp(18px,3vw,26px)] px-[clamp(20px,3vw,28px)] mt-5.5 overflow-hidden text-paper bg-magenta border-[3px] border-ink rounded-card shadow-hard after:content-['NEXT'] after:absolute after:top-1/2 after:right-[-14px] after:text-white/12 after:[transform:translateY(-50%)_rotate(90deg)] after:tracking-[0.1em] after:pointer-events-none after:font-display after:text-[64px] after:font-black max-[560px]:after:hidden"
        aria-label="下一步行动"
      >
        <span className="px-3 py-1.5 text-yellow whitespace-nowrap uppercase tracking-[0.22em] bg-ink rounded-full font-grotesk text-[12px] font-extrabold">
          下一步行动
        </span>
        <span className="font-display text-[clamp(34px,7vw,56px)] font-black leading-[0.9]">
          {nextItem.time}
        </span>
        <div className="min-w-[200px]">
          <div className="font-cjk text-[clamp(18px,3vw,24px)] font-black">{nextItem.title}</div>
          <div className="mt-1 text-white/85 font-cjk text-[14px] font-medium">
            {nextPlan} · {statusLabel[nextItem.status]}
          </div>
        </div>
      </section>

      {orderedDates.map((date, index) => {
        const meta = dayMeta[date] ?? { label: date, tag: "", accent: "cyan" as DayAccent };
        const accentVar =
          meta.accent === "magenta"
            ? "[--accent:var(--color-magenta)]"
            : meta.accent === "cyan"
              ? "[--accent:var(--color-cyan)]"
              : "[--accent:var(--color-green)]";
        return (
          <section className={`mt-[clamp(34px,6vw,52px)] ${accentVar}`} key={date}>
            <div className="sticky top-2.5 z-[6] flex gap-3.5 items-center py-3 px-4.5 text-paper bg-ink border-[3px] border-ink rounded-xl shadow-hard-sm max-[560px]:items-start">
              <div className="grid shrink-0 w-[46px] h-[46px] place-items-center text-ink bg-[var(--accent)] border-2 border-paper rounded-[10px] font-display text-[28px] font-black leading-none">
                {(index + 1).toString().padStart(2, "0")}
              </div>
              <div className="flex flex-col">
                <div className="uppercase tracking-[0.02em] font-display text-[clamp(16px,2.6vw,22px)] font-extrabold">
                  {formatDayDate(date)}
                </div>
                <div className="text-paper/72 font-cjk text-[13px] font-medium">{meta.label}</div>
              </div>
              <div className="py-1.5 px-[11px] ml-auto text-[var(--accent)] whitespace-nowrap uppercase tracking-[0.16em] border-2 border-paper rounded-full font-grotesk text-[11px] font-extrabold max-[560px]:hidden">
                {meta.tag}
              </div>
            </div>

            <div className="relative pl-9.5 mt-5.5 before:content-[''] before:absolute before:top-1.5 before:bottom-1.5 before:left-4 before:w-1 before:bg-[repeating-linear-gradient(var(--color-ink)_0_10px,transparent_10px_18px)] max-[560px]:pl-0 max-[560px]:before:hidden">
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

      <section className="py-5 px-[22px] mt-[clamp(34px,6vw,52px)] bg-paper-2 border-[3px] border-ink rounded-card shadow-hard-sm">
        <h2 className="m-0 mb-3.5 uppercase tracking-[0.18em] font-display text-[13px] font-extrabold">
          图例 · Legend
        </h2>
        <div className="flex flex-wrap gap-x-[22px] gap-y-2.5">
          <LegendItem swatch="sw-cyan" label="计划中 Planned" />
          <LegendItem swatch="sw-green" label="已锁定 Locked" />
          <LegendItem swatch="sw-amber" label="已完成 Done" />
          <LegendItem swatch="sw-cyan" label="交通" />
          <LegendItem swatch="sw-yellow" label="用餐" />
          <LegendItem swatch="sw-magenta" label="活动" />
          <LegendItem swatch="sw-violet" label="酒店" />
          <LegendItem swatch="sw-green" label="杂项" />
        </div>
        <p className="mt-3.5 pt-3.5 border-t-2 border-dashed border-ink text-ink-soft font-cjk text-[12.5px] font-medium leading-[1.6]">
          回报率 = 积分倍数 × 估值（cpp)
        </p>
      </section>

      <p className="mt-4.5 mx-0 mb-0 text-ink-soft text-center uppercase tracking-[0.14em] font-grotesk text-[12px] font-bold">
        NYC → LAX
      </p>
    </>
  );
}

function SummaryStat({ value, label, tone }: { value: string; label: string; tone: string }) {
  const numTone = tone === "c1" ? "text-cyan" : tone === "c2" ? "text-magenta" : "text-yellow";
  return (
    <div className="py-3.5 px-4 border-r-2 border-paper last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:border-paper max-[560px]:last:border-b-0">
      <div className={`font-display text-[clamp(22px,4vw,34px)] font-black leading-none ${numTone}`}>
        {value}
      </div>
      <div className="mt-1.5 text-paper/70 font-cjk text-[12px] font-medium">{label}</div>
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
  const cardRec = cardRecs[item.id];
  const statusBg =
    item.status === "locked" ? "bg-green" : item.status === "planned" ? "bg-cyan" : "bg-amber";

  return (
    <article className={`relative mb-5.5 last:mb-0 ${category.className}`}>
      <div className="absolute top-5.5 left-[-38px] z-[3] grid w-[34px] h-[34px] place-items-center bg-paper border-[3px] border-ink rounded-full shadow-[3px_3px_0_var(--color-ink)] font-display text-[15px] font-black max-[560px]:top-[-14px] max-[560px]:left-3">
        {stopNumber}
      </div>
      <div className="flex overflow-hidden bg-paper-2 border-[3px] border-ink rounded-card shadow-hard max-[560px]:flex-col">
        <div
          className={`relative flex shrink-0 flex-col items-center justify-center w-[132px] py-4.5 px-3.5 text-ink text-center bg-[var(--cat)] after:content-[''] after:absolute after:top-0 after:right-0 after:bottom-0 after:w-[3px] after:bg-[repeating-linear-gradient(var(--color-ink)_0_7px,transparent_7px_14px)] max-[560px]:flex-row max-[560px]:gap-3.5 max-[560px]:justify-start max-[560px]:w-full max-[560px]:py-3.5 max-[560px]:px-4 max-[560px]:text-left max-[560px]:after:top-auto max-[560px]:after:left-0 max-[560px]:after:w-auto max-[560px]:after:h-[3px] max-[560px]:after:bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_7px,transparent_7px_14px)] ${category.className}`}
        >
          <span className="absolute right-[-8px] z-[2] w-4 h-4 bg-paper border-[3px] border-ink rounded-full top-[-10px] max-[560px]:top-auto max-[560px]:right-auto max-[560px]:bottom-[-10px] max-[560px]:left-[-10px]" />
          <span className="absolute right-[-8px] z-[2] w-4 h-4 bg-paper border-[3px] border-ink rounded-full bottom-[-10px] max-[560px]:right-[-10px] max-[560px]:bottom-[-10px]" />
          <div>
            <div
              className={`font-display font-black leading-[0.95] tracking-normal ${compactTime ? "text-[clamp(20px,3.5vw,26px)]" : "text-[clamp(24px,4vw,34px)]"}${isDarkStub ? " text-paper" : ""}`}
            >
              {item.time}
            </div>
            <div
              className={`mt-1.5 uppercase tracking-[0.14em] opacity-85 font-grotesk text-[11px] font-extrabold max-[560px]:mt-0.5${isDarkStub ? " text-paper" : ""}`}
            >
              {item.durationMinutes} min
            </div>
          </div>
          <div className="py-1 px-2.5 mt-3.5 text-paper uppercase tracking-[0.12em] bg-ink rounded-full font-grotesk text-[11px] font-extrabold max-[560px]:self-center max-[560px]:mt-0 max-[560px]:ml-auto">
            {category.label}
          </div>
        </div>
        <div className="flex-1 min-w-0 py-4 px-4.5">
          <div className="flex flex-wrap gap-2.5 items-start">
            <h2 className="flex-1 min-w-[160px] m-0 font-cjk text-[clamp(17px,2.6vw,21px)] font-black leading-[1.2]">
              {item.title}
            </h2>
            <button
              type="button"
              className={`shrink-0 py-[5px] px-[11px] text-ink whitespace-nowrap uppercase tracking-[0.08em] border-2 border-ink rounded-full font-grotesk text-[11px] font-extrabold cursor-pointer appearance-none [-webkit-appearance:none] transition-transform duration-[80ms] ease-[ease] active:[transform:scale(0.94)] ${statusBg}`}
              onClick={() => onCycleStatus(item)}
              title="点击切换状态"
            >
              {statusLabel[item.status]}
            </button>
          </div>
          <div className="mt-2 text-ink font-cjk text-[14px] font-bold">{item.location}</div>
          <AddressLink
            className="inline-block mt-0.5 text-ink-soft no-underline font-grotesk text-[13px] hover:text-ink hover:underline hover:underline-offset-2"
            query={`${item.location}, ${item.address}`}
          >
            {item.address}
          </AddressLink>
          {plans.length > 0 && (
            <div className="grid gap-2 mt-3.5">
              {plans.map((plan) => (
                <Plan key={plan.label} kind={plan.kind} label={plan.label} text={plan.text} />
              ))}
            </div>
          )}
          {cardRec && <PayWith rec={cardRec} accent={categoryColor[item.category]} />}
          <div className="mt-3 flex">
            <SuggestBox itemId={item.id} itemTitle={item.title} />
          </div>
        </div>
      </div>
    </article>
  );
}

function PayWith({ rec, accent }: { rec: (typeof cardRecs)[string]; accent: string }) {
  const cardImage = useCardImage();
  const bestImage = cardImage(rec.best.cardName);
  return (
    <div
      className="mt-3.5 overflow-hidden bg-paper border-2 border-ink rounded-xl"
      style={{ "--pw": `var(${accent})` } as CSSProperties}
    >
      <div className="flex gap-[9px] items-center py-[7px] px-3 text-paper bg-ink max-[560px]:gap-[7px] max-[560px]:py-1.5 max-[560px]:px-[11px]">
        <span className="py-[3px] px-[9px] uppercase tracking-[0.14em] whitespace-nowrap text-ink bg-[var(--pw,var(--color-cyan))] rounded-full font-grotesk text-[11px] font-extrabold">
          刷卡建议
        </span>
        <span className="uppercase tracking-[0.12em] text-paper/78 font-grotesk text-[11px] font-bold">
          {rec.category}
        </span>
      </div>
      <div className="flex gap-3 items-center p-3 max-[560px]:gap-2.5 max-[560px]:p-[11px]">
        <div className="shrink-0 w-[74px] h-[47px] overflow-hidden border-2 border-ink rounded-md shadow-[2px_2px_0_var(--color-ink)] bg-[repeating-linear-gradient(48deg,#ece6d6_0_6px,#f5f0e2_6px_12px)] max-[560px]:w-[58px] max-[560px]:h-[37px]">
          {bestImage && (
            <img
              src={bestImage}
              alt={rec.best.name}
              loading="lazy"
              className="block w-full h-full object-cover"
            />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-cjk text-[14px] font-extrabold leading-[1.25] max-[560px]:text-[13.5px]">
            {rec.best.name}
            {rec.best.last4 && <span className="text-ink-soft font-bold"> {rec.best.last4}</span>}
          </div>
          <div className="mt-[3px] text-ink-soft font-cjk text-[12px] font-medium">
            {rec.best.why}
          </div>
        </div>
        <div className="flex shrink-0 gap-px items-baseline text-ink font-display font-black">
          <span className="tracking-[-0.02em] text-[27px] leading-none max-[560px]:text-[22px]">
            {rec.best.rate}
          </span>
          <span className="text-[14px]">%</span>
        </div>
      </div>
      <div className="grid gap-[7px] py-[9px] px-3 border-t-2 border-dashed border-ink max-[560px]:gap-2 max-[560px]:px-[11px]">
        {rec.alts.map((alt) => {
          const altImage = cardImage(alt.cardName);
          return (
            <div className="flex gap-[9px] items-center font-cjk max-[560px]:gap-2" key={alt.name}>
              <span
                className="shrink-0 overflow-hidden w-[34px] h-[21px] bg-[var(--c,#999)] border-[1.5px] border-ink rounded-[3px]"
                style={{ "--c": alt.swatch } as CSSProperties}
              >
                {altImage && (
                  <img
                    src={altImage}
                    alt={alt.name}
                    loading="lazy"
                    className="block w-full h-full object-cover"
                  />
                )}
              </span>
              <span className="flex-1 min-w-0 text-[12.5px] font-bold max-[560px]:text-[12px]">
                {alt.name}
              </span>
              <span className="uppercase tracking-[0.06em] whitespace-nowrap text-ink-soft font-grotesk text-[10px] font-bold max-[560px]:tracking-[0.04em]">
                {alt.tag}
              </span>
              <span className="shrink-0 min-w-[44px] text-right text-ink-soft font-display text-[13px] font-extrabold max-[560px]:min-w-[38px]">
                {alt.rate}
              </span>
            </div>
          );
        })}
      </div>
      {rec.note && (
        <div className="flex gap-2 items-start py-[9px] px-3 border-t-2 border-ink bg-[color-mix(in_srgb,var(--pw,var(--color-cyan))_16%,var(--color-paper))] font-cjk text-[12px] font-semibold leading-normal max-[560px]:gap-[7px] max-[560px]:px-[11px]">
          <span className="shrink-0 mt-px py-[3px] px-[7px] uppercase tracking-[0.1em] text-paper bg-ink rounded-md font-grotesk text-[9px] font-extrabold">
            {rec.note.kind}
          </span>
          <span>{renderRich(rec.note.text)}</span>
        </div>
      )}
    </div>
  );
}

function Plan({ kind, label, text }: { kind: "main" | "alt"; label: string; text: string }) {
  return (
    <div
      className={`grid grid-cols-[max-content_1fr] gap-2.5 items-center py-2.5 px-3 border-2 border-ink rounded-[10px] ${kind === "main" ? "bg-[color-mix(in_srgb,var(--cat,var(--color-cyan))_16%,var(--color-paper-2))]" : "bg-paper border-dashed"}`}
    >
      <span
        className={`shrink-0 inline-flex items-center py-1 px-2 uppercase tracking-[0.1em] rounded-md font-grotesk text-[10px] font-extrabold leading-none ${kind === "main" ? "text-paper bg-ink" : "text-ink bg-paper border-2 border-ink"}`}
      >
        {label}
      </span>
      <span
        className={`font-cjk text-[13.5px] font-medium leading-[1.45]${kind === "alt" ? " text-ink-soft" : ""}`}
      >
        {text}
      </span>
    </div>
  );
}

function LegendItem({ swatch, label }: { swatch: string; label: string }) {
  const swColor =
    swatch === "sw-cyan"
      ? "bg-cyan"
      : swatch === "sw-green"
        ? "bg-green"
        : swatch === "sw-amber"
          ? "bg-amber"
          : swatch === "sw-yellow"
            ? "bg-yellow"
            : swatch === "sw-magenta"
              ? "bg-magenta"
              : swatch === "sw-violet"
                ? "bg-violet"
                : "";
  return (
    <div className="flex gap-2 items-center font-cjk text-[13px] font-bold">
      <span className={`w-4 h-4 border-2 border-ink rounded-[5px] ${swColor}`} />
      {label}
    </div>
  );
}
