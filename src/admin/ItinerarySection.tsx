import { useState } from "react";
import { CATS, uid } from "./adminData";
import type { StopCat } from "./adminData";
import { AddStopModal } from "./AddStopModal";
import type { NewStopInput } from "./AddStopModal";
import { Icons } from "./AdminIcons";
import { Editable } from "./Editable";
import {
  AdminEmptyState,
  BTN,
  BTN_GHOST,
  BTN_DANGER,
  BTN_INK,
  BTN_SM,
  Metrics,
  SectionHead,
} from "./adminUi";
import { useConfirm } from "./useConfirm";
import type { ToastFn } from "./useAdminToasts";
import {
  addPlanToItem,
  deletePlanFromItem,
  itineraryDates,
  itineraryStop,
  tripCategoryFor,
  updatePlanText,
} from "./itineraryAdapter";
import type { ItineraryStop } from "./itineraryAdapter";
import { formatDayDate } from "../pages/timelineShared";
import type { useTripOp } from "../trip/hooks";
import type { TripOp } from "../trip/ops";
import type { ItemStatus, TripItem } from "../trip/types";

type Props = {
  items: TripItem[];
  startDate: string | null;
  endDate: string | null;
  timezone: string;
  tripOp: ReturnType<typeof useTripOp>;
  toast: ToastFn;
};

const STATUS_CYCLE: ItemStatus[] = ["planned", "locked", "done"];
const CAT_CYCLE: StopCat[] = ["transit", "food", "event", "stay", "misc"];

const STATUS_STYLE: Record<
  ItemStatus,
  { label: string; color: string; border: string; bg: string }
> = {
  planned: { label: "计划中", color: "#5b7a99", border: "#cdd8e2", bg: "#eef2f6" },
  locked: { label: "已锁定", color: "#3f6f5b", border: "#cfe0d6", bg: "#eef4f0" },
  done: { label: "已完成", color: "#76726a", border: "#ebe9e3", bg: "#fdfdfb" },
};

export function ItinerarySection({ items, startDate, endDate, timezone, tripOp, toast }: Props) {
  const { confirm, confirmModal } = useConfirm();

  const send = (op: TripOp, success?: string) =>
    tripOp.mutate(op, {
      onSuccess: () => {
        if (success) toast(success);
      },
      onError: () => toast("保存失败，请重试", "warn"),
    });

  const updateItem = (id: string, transform: (item: TripItem) => TripItem, success?: string) => {
    const item = items.find((candidate) => candidate.id === id);
    if (!item) return;
    const next = transform(item);
    if (next === item) return;
    send({ type: "updateItem", item: next }, success);
  };

  const patch = (id: string, p: Partial<ItineraryStop>) =>
    updateItem(id, (item) => ({
      ...item,
      time: p.time ?? item.time,
      title: p.title ?? item.title,
      category: p.cat ? tripCategoryFor(p.cat, item.category) : item.category,
      location: p.loc ?? item.location,
      address: p.addr ?? item.address,
      status: p.status ?? item.status,
    }));

  const updatePlan = (itemId: string, planId: string, text: string) =>
    updateItem(itemId, (item) => updatePlanText(item, planId, text));

  const deletePlan = async (sid: string, pid: string) => {
    const ok = await confirm({
      title: "删除方案",
      message: "确定删除这条方案吗？删除后无法恢复。",
      confirmLabel: "删除方案",
    });
    if (!ok) return;
    updateItem(sid, (item) => deletePlanFromItem(item, pid));
  };

  const addPlan = (id: string) => updateItem(id, addPlanToItem);

  const cycleStatus = (id: string, cur: ItemStatus) =>
    patch(id, { status: STATUS_CYCLE[(STATUS_CYCLE.indexOf(cur) + 1) % STATUS_CYCLE.length] });
  const cycleCat = (id: string, cur: StopCat) =>
    patch(id, { cat: CAT_CYCLE[(CAT_CYCLE.indexOf(cur) + 1) % CAT_CYCLE.length] });

  const deleteStop = async (id: string) => {
    const stop = stops.find((s) => s.id === id);
    const ok = await confirm({
      title: "删除停靠点",
      message: (
        <>
          确定删除停靠点
          {stop ? <b>「{stop.title}」</b> : null}
          吗？该停靠点下的所有方案也会一并删除，且无法恢复。
        </>
      ),
      confirmLabel: "删除停靠点",
    });
    if (!ok) return;
    send({ type: "deleteItem", itemId: id }, "已删除停靠点");
  };

  const [addDay, setAddDay] = useState<number | null>(null);

  const createStop = (input: NewStopInput) => {
    const item: TripItem = {
      id: uid("s"),
      date: input.date,
      time: input.time,
      category: tripCategoryFor(input.cat),
      status: input.status,
      title: input.title || "新停靠点",
      location: "地点待定",
      address: "",
      durationMinutes: 60,
      priority: "medium",
      notes: [],
      links: [],
    };
    send({ type: "addItem", item }, "已新增停靠点");
    setAddDay(null);
  };

  const dates = itineraryDates(items, startDate, endDate, timezone);
  const dayByDate = new Map(dates.map((date, index) => [date, index + 1]));
  const stops = items.map((item) => itineraryStop(item, dayByDate.get(item.date) ?? 1));

  // Group persisted items by their ISO date; empty dates remain available in
  // the add-stop modal without rendering empty day sections.
  const days: { day: number; date: string; stops: ItineraryStop[] }[] = [];
  stops.forEach((s) => {
    let d = days.find((x) => x.day === s.day);
    if (!d) {
      d = { day: s.day, date: s.date, stops: [] };
      days.push(d);
    }
    d.stops.push(s);
  });

  const first = days[0];
  const dayOpts = dates.map((date, index) => ({
    day: index + 1,
    date,
    label: formatDayDate(date),
  }));

  const locked = stops.filter((s) => s.status === "locked").length;
  const planned = stops.filter((s) => s.status === "planned").length;
  const done = stops.filter((s) => s.status === "done").length;

  return (
    <div>
      <SectionHead
        kicker="01 · Itinerary"
        title="行程停靠点"
        desc="点任意字段直接改 · 增删停靠点与方案 · 切换状态 / 类别"
        actions={
          <button
            className={`${BTN} ${BTN_INK} [&_svg]:size-[15px]`}
            onClick={() => setAddDay(first ? first.day : 1)}
          >
            <Icons.plus sw={2.6} />
            新增停靠点
          </button>
        }
      />

      <Metrics
        items={[
          { k: "停靠点", v: stops.length, sub: `横跨 ${days.length} 天` },
          { k: "已锁定", v: locked, sub: "Locked", color: "#3f6f5b" },
          { k: "计划中", v: planned, sub: "Planned", color: "#5b7a99" },
          { k: "已完成", v: done, sub: "Done", color: "#76726a" },
        ]}
      />

      {stops.length === 0 && (
        <div className="mt-8">
          <AdminEmptyState
            title="还没有停靠点"
            body="新增第一站后，它会立即同步到这个行程的时间线。"
            icon={<Icons.route sw={2.2} />}
          />
        </div>
      )}

      {days.map((d) => (
        <div key={d.day} className="mt-8">
          <div className="flex items-center gap-3.5 mb-4">
            <span className="font-grotesk font-bold text-[13px] tracking-[0.06em]">
              DAY {String(d.day).padStart(2, "0")}
            </span>
            <span className="font-cjk text-[13px] text-[#76726a]">{formatDayDate(d.date)}</span>
            <span className="flex-1 h-px bg-[#e3ded4]" />
            <button
              className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-[13px]`}
              onClick={() => setAddDay(d.day)}
            >
              <Icons.plus sw={2.6} />
              本日加一站
            </button>
          </div>

          {d.stops.map((s) => {
            const cat = CATS[s.cat];
            const st = STATUS_STYLE[s.status];
            const short = s.time.length > 4;
            return (
              <div
                key={s.id}
                className="bg-white border border-[#ebe9e3] rounded-[14px] overflow-hidden mb-3.5"
              >
                <div className="flex max-[640px]:flex-col">
                  {/* time stub */}
                  <div className="w-[112px] shrink-0 p-4 border-r border-[#f0eee8] flex flex-col items-center justify-center gap-3 text-center max-[640px]:w-full max-[640px]:flex-row max-[640px]:justify-start max-[640px]:border-r-0 max-[640px]:border-b">
                    <Editable
                      key={`time-${s.time}`}
                      className={`font-grotesk font-bold tracking-tight ${short ? "text-[18px]" : "text-[24px]"}`}
                      value={s.time}
                      ariaLabel="时间"
                      onCommit={(v) => patch(s.id, { time: v || "00:00" })}
                    />
                    <button
                      className="font-grotesk text-[9.5px] tracking-[0.1em] uppercase rounded-full px-2.5 py-1 border cursor-pointer max-[640px]:ml-auto"
                      style={{
                        color: cat.color,
                        borderColor: `${cat.color}55`,
                        background: `${cat.color}12`,
                      }}
                      title="点击切换类别"
                      onClick={() => cycleCat(s.id, s.cat)}
                    >
                      {cat.label}
                    </button>
                  </div>

                  {/* body */}
                  <div className="flex-1 min-w-0 p-5">
                    <div className="flex items-start gap-3 flex-wrap">
                      <Editable
                        key={`title-${s.title}`}
                        className="font-cjk font-bold text-[18px] flex-1 min-w-[150px]"
                        value={s.title}
                        ariaLabel="标题"
                        onCommit={(v) => patch(s.id, { title: v || "未命名" })}
                      />
                      <button
                        className="shrink-0 font-grotesk font-semibold text-[10.5px] tracking-[0.04em] py-1 px-[11px] rounded-full border whitespace-nowrap cursor-pointer"
                        style={{ color: st.color, borderColor: st.border, background: st.bg }}
                        title="点击切换状态"
                        onClick={() => cycleStatus(s.id, s.status)}
                      >
                        {st.label}
                      </button>
                    </div>

                    <Editable
                      key={`loc-${s.loc}`}
                      className="font-cjk font-semibold text-[13.5px] block mt-2.5"
                      value={s.loc}
                      ariaLabel="地点"
                      onCommit={(v) => patch(s.id, { loc: v })}
                    />
                    <Editable
                      key={`addr-${s.addr}`}
                      className="font-cjk text-[12.5px] text-[#9b988f] block mt-1"
                      value={s.addr}
                      placeholder="地址（可选）"
                      ariaLabel="地址"
                      onCommit={(v) => patch(s.id, { addr: v })}
                    />

                    <div className="grid gap-2 mt-3.5">
                      {s.plans.map((p) => (
                        <div
                          key={p.id}
                          className={`flex gap-2.5 items-start p-2.5 rounded-[10px] border ${p.kind === "main" ? "border-[#ebe9e3] bg-[#fdfdfb]" : "border-dashed border-[#d8d5cb] bg-[#fafaf8]"}`}
                        >
                          <span
                            className="shrink-0 font-grotesk text-[9.5px] font-bold tracking-[0.06em] uppercase mt-0.5"
                            style={{ color: p.kind === "main" ? "#3f6f5b" : "#9b988f" }}
                          >
                            {p.label}
                          </span>
                          <Editable
                            key={`plan-${p.text}`}
                            className="flex-1 font-cjk text-[13px] leading-relaxed min-w-0"
                            value={p.text}
                            placeholder={`${p.label}待补充`}
                            multiline
                            ariaLabel={`${p.label}内容`}
                            onCommit={(v) => updatePlan(s.id, p.id, v)}
                          />
                          {p.id !== "parking:primary" && (
                            <button
                              className="shrink-0 w-[22px] h-[22px] rounded-md border border-[#ebe9e3] text-[#9b988f] grid place-items-center cursor-pointer hover:bg-[#c2553f] hover:text-white hover:border-[#c2553f] transition-colors [&_svg]:size-[13px]"
                              title={`删除该${p.label}`}
                              onClick={() => deletePlan(s.id, p.id)}
                            >
                              <Icons.x sw={2.4} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap mt-3.5 pt-3.5 border-t border-dashed border-[#ebe9e3]">
                      <button
                        className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-[13px]`}
                        onClick={() => addPlan(s.id)}
                      >
                        <Icons.plus sw={2.6} />
                        {s.hasParking ? "加方案" : "加备注"}
                      </button>
                      <span className="ml-auto" />
                      <button
                        className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-[13px]`}
                        onClick={() => deleteStop(s.id)}
                      >
                        <Icons.trash sw={2.2} />
                        删除停靠点
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      <AddStopModal
        isOpen={addDay !== null}
        days={dayOpts}
        initialDay={addDay ?? first?.day ?? 1}
        onClose={() => setAddDay(null)}
        onCreate={createStop}
      />

      {confirmModal}
    </div>
  );
}
