import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CATS, STATUS, uid } from "./adminData";
import type { Stop, StopCat, StopStatus } from "./adminData";
import { AddStopModal } from "./AddStopModal";
import type { NewStopInput } from "./AddStopModal";
import { Icons } from "./AdminIcons";
import { Editable } from "./Editable";
import { cssVars } from "./style";
import { useConfirm } from "./useConfirm";
import type { ToastFn } from "./useAdminToasts";

type Props = {
  stops: Stop[];
  setStops: Dispatch<SetStateAction<Stop[]>>;
  toast: ToastFn;
};

const STATUS_CYCLE: StopStatus[] = ["booked", "planned", "watch"];
const CAT_CYCLE: StopCat[] = ["transit", "food", "event", "stay", "misc"];
const ACCENTS: Record<number, string> = {
  1: "var(--color-magenta)",
  2: "var(--color-cyan)",
  3: "var(--color-green)",
};

export function ItinerarySection({ stops, setStops, toast }: Props) {
  const { confirm, confirmModal } = useConfirm();

  const patch = (id: string, p: Partial<Stop>) =>
    setStops(stops.map((s) => (s.id === id ? { ...s, ...p } : s)));

  const updatePlan = (sid: string, pid: string, text: string) =>
    setStops(
      stops.map((s) =>
        s.id === sid ? { ...s, plans: s.plans.map((p) => (p.id === pid ? { ...p, text } : p)) } : s,
      ),
    );

  const updatePlanKind = (sid: string, pid: string) =>
    setStops(
      stops.map((s) =>
        s.id === sid
          ? {
              ...s,
              plans: s.plans.map((p) =>
                p.id === pid ? { ...p, kind: p.kind === "main" ? "alt" : "main" } : p,
              ),
            }
          : s,
      ),
    );

  const deletePlan = async (sid: string, pid: string) => {
    const ok = await confirm({
      title: "删除方案",
      message: "确定删除这条方案吗？删除后无法恢复。",
      confirmLabel: "删除方案",
    });
    if (!ok) return;
    setStops(
      stops.map((s) => (s.id === sid ? { ...s, plans: s.plans.filter((p) => p.id !== pid) } : s)),
    );
  };

  const addPlan = (sid: string) =>
    setStops(
      stops.map((s) =>
        s.id === sid
          ? {
              ...s,
              plans: [
                ...s.plans,
                {
                  id: uid("p"),
                  kind: s.plans.some((p) => p.kind === "main") ? "alt" : "main",
                  text: "",
                },
              ],
            }
          : s,
      ),
    );

  const cycleStatus = (id: string, cur: StopStatus) =>
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
    setStops(stops.filter((s) => s.id !== id));
    toast("已删除停靠点", "warn");
  };

  const [addDay, setAddDay] = useState<number | null>(null);

  const createStop = (input: NewStopInput) => {
    const newStop: Stop = {
      id: uid("s"),
      day: input.day,
      date: input.date,
      time: input.time,
      cat: input.cat,
      status: input.status,
      title: input.title || "新停靠点",
      loc: "地点待定",
      addr: "",
      plans: [{ id: uid("p"), kind: "main", text: "主方案待补充。" }],
    };
    setStops((prev) => {
      // Insert within the chosen day, kept in ascending time order so the new
      // stop lands where the user expects instead of being appended out of view.
      let at = prev.findIndex((s) => s.day === input.day && s.time > input.time);
      if (at === -1) {
        const lastInDay = prev.map((s) => s.day).lastIndexOf(input.day);
        at = lastInDay === -1 ? prev.length : lastInDay + 1;
      }
      const arr = [...prev];
      arr.splice(at, 0, newStop);
      return arr;
    });
    setAddDay(null);
    toast("已新增停靠点");
  };

  // group by day, keep order
  const days: { day: number; date: string; stops: Stop[] }[] = [];
  stops.forEach((s) => {
    let d = days.find((x) => x.day === s.day);
    if (!d) {
      d = { day: s.day, date: s.date, stops: [] };
      days.push(d);
    }
    d.stops.push(s);
  });

  const first = days[0];
  const dayOpts = days.length
    ? days.map((d) => ({ day: d.day, date: d.date }))
    : [{ day: 1, date: "7/3 · FRI" }];

  return (
    <div>
      <div
        className="relative bg-ink text-paper border-[3px] border-ink rounded-card shadow-hard-sm py-[18px] px-[clamp(18px,3vw,26px)] overflow-hidden isolate flex items-center gap-4 flex-wrap before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_24px,rgba(255,255,255,0.04)_24px_26px)]"
        style={cssVars({ "--accent": "var(--color-magenta)" })}
      >
        <span className="shrink-0 font-display font-black text-[24px] leading-none text-ink bg-[var(--accent,var(--color-yellow))] border-2 border-paper rounded-[10px] w-12 h-12 grid place-items-center">
          01
        </span>
        <div className="min-w-0">
          <div className="font-display font-black text-[clamp(19px,3vw,26px)] uppercase tracking-[0.01em] leading-none">
            行程停靠点
          </div>
          <div className="font-cjk font-medium text-[13px] text-paper/72 mt-[7px]">
            点任意字段直接改 · 增删停靠点与方案 · 切换状态 / 类别
          </div>
        </div>
        <div className="ml-auto flex gap-[9px] flex-wrap">
          <button
            className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] bg-ink text-paper shadow-[3px_3px_0_rgba(0,0,0,0.25)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:size-[14px]"
            onClick={() => setAddDay(first ? first.day : 1)}
          >
            <Icons.plus sw={2.6} />
            新增停靠点
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-0 mt-4 bg-paper-2 border-[3px] border-ink rounded-card shadow-hard-sm overflow-hidden">
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">
            停靠点
          </div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px]">
            {stops.length}
          </div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">
            横跨 {days.length} 天
          </div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">
            已预订
          </div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] text-green">
            {stops.filter((s) => s.status === "booked").length}
          </div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Booked</div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">
            计划中
          </div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] text-cyan">
            {stops.filter((s) => s.status === "planned").length}
          </div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Planned</div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">
            需关注
          </div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] text-magenta">
            {stops.filter((s) => s.status === "watch").length}
          </div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Watch</div>
        </div>
      </div>

      {days.map((d) => (
        <div
          key={d.day}
          className="mt-[clamp(20px,4vw,30px)]"
          style={cssVars({ "--accent": ACCENTS[d.day] ?? "var(--color-yellow)" })}
        >
          <div className="flex items-center gap-3 mt-[26px] mb-[14px] first:mt-1">
            <span className="inline-flex items-center gap-2.5 bg-ink text-paper border-2 border-ink rounded-full py-[7px] pr-[14px] pl-2 shadow-[3px_3px_0_var(--color-ink)]">
              <span className="w-[26px] h-[26px] rounded-full bg-[var(--accent,var(--color-yellow))] text-ink border-2 border-paper grid place-items-center font-display font-black text-[12px]">
                {String(d.day).padStart(2, "0")}
              </span>
              <span className="font-display font-extrabold text-[13px] tracking-[0.04em] uppercase">
                {d.date}
              </span>
            </span>
            <span className="flex-1 h-[3px] bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_8px,transparent_8px_15px)]" />
            <button
              className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-[6px] px-[11px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:size-[14px]"
              onClick={() => setAddDay(d.day)}
            >
              <Icons.plus sw={2.6} />
              本日加一站
            </button>
          </div>

          {d.stops.map((s) => {
            const cat = CATS[s.cat];
            const st = STATUS[s.status];
            const short = s.time.length > 4;
            return (
              <div
                key={s.id}
                className="bg-paper-2 border-[3px] border-ink rounded-card shadow-hard overflow-hidden [&:nth-child(n+3)]:mt-4 flex max-[760px]:flex-col"
                style={cssVars({ "--cat": cat.color })}
              >
                <div
                  className="relative shrink-0 w-[120px] py-4 px-3 flex flex-col items-center justify-center text-center gap-2 after:content-[''] after:absolute after:top-0 after:bottom-0 after:right-0 after:w-[3px] after:bg-[repeating-linear-gradient(var(--color-ink)_0_7px,transparent_7px_14px)] max-[760px]:w-full max-[760px]:flex-row max-[760px]:justify-start max-[760px]:gap-[14px] max-[760px]:after:top-auto max-[760px]:after:left-0 max-[760px]:after:w-auto max-[760px]:after:h-[3px] max-[760px]:after:bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_7px,transparent_7px_14px)]"
                  style={{ background: cat.color }}
                >
                  <Editable
                    key={`time-${s.time}`}
                    className={`font-display font-black leading-[0.95] w-full max-[760px]:w-auto ${short ? "text-[20px]" : "text-[26px]"}`}
                    value={s.time}
                    ariaLabel="时间"
                    onCommit={(v) => patch(s.id, { time: v || "00:00" })}
                  />
                  <button
                    className="font-grotesk font-extrabold text-[9.5px] tracking-[0.08em] uppercase bg-ink text-paper border-2 border-ink rounded-full py-1 px-2 cursor-pointer max-w-full max-[760px]:ml-auto"
                    title="点击切换类别"
                    onClick={() => cycleCat(s.id, s.cat)}
                  >
                    {cat.label}
                  </button>
                </div>

                <div className="flex-1 min-w-0 py-[15px] px-[17px]">
                  <div className="flex items-start gap-2.5 flex-wrap">
                    <Editable
                      key={`title-${s.title}`}
                      className="flex-1 min-w-[150px] font-cjk font-black text-[18px] leading-[1.25]"
                      value={s.title}
                      ariaLabel="标题"
                      onCommit={(v) => patch(s.id, { title: v || "未命名" })}
                    />
                    <button
                      className={`shrink-0 font-grotesk font-extrabold text-[11px] tracking-[0.06em] uppercase py-[5px] px-[11px] rounded-full border-2 border-ink whitespace-nowrap cursor-pointer ${st.cls === "booked" ? "bg-green text-ink" : st.cls === "planned" ? "bg-cyan text-ink" : "bg-amber text-ink"}`}
                      title="点击切换状态"
                      onClick={() => cycleStatus(s.id, s.status)}
                    >
                      {st.label}
                    </button>
                  </div>

                  <Editable
                    key={`loc-${s.loc}`}
                    className="font-cjk font-bold text-[13.5px] mt-[9px]"
                    value={s.loc}
                    ariaLabel="地点"
                    onCommit={(v) => patch(s.id, { loc: v })}
                  />
                  <Editable
                    key={`addr-${s.addr}`}
                    className="font-grotesk font-medium text-[12.5px] text-ink-soft mt-0.5"
                    value={s.addr}
                    placeholder="地址（可选）"
                    ariaLabel="地址"
                    onCommit={(v) => patch(s.id, { addr: v })}
                  />

                  <div className="grid gap-2 mt-[13px]">
                    {s.plans.map((p) => (
                      <div
                        key={p.id}
                        className={`flex gap-2.5 items-start py-2.5 px-[11px] rounded-[10px] border-2 border-ink ${p.kind === "main" ? "bg-[color-mix(in_srgb,var(--cat,var(--color-cyan))_14%,var(--color-paper-2))]" : "bg-paper border-dashed"}`}
                      >
                        <button
                          className={`shrink-0 font-grotesk font-extrabold text-[10px] tracking-[0.08em] uppercase py-1 px-2 rounded-md mt-px ${p.kind === "main" ? "bg-ink text-paper" : "bg-paper-2 text-ink border-2 border-ink"}`}
                          title="切换 主/备"
                          onClick={() => updatePlanKind(s.id, p.id)}
                        >
                          {p.kind === "main" ? "主方案" : "备用"}
                        </button>
                        <Editable
                          key={`plan-${p.text}`}
                          className="flex-1 font-cjk font-medium text-[13px] leading-[1.5] min-w-0"
                          value={p.text}
                          multiline
                          ariaLabel="方案内容"
                          onCommit={(v) => updatePlan(s.id, p.id, v)}
                        />
                        <button
                          className="shrink-0 w-[22px] h-[22px] rounded-md border-2 border-ink bg-paper-2 text-ink-soft cursor-pointer grid place-items-center text-[13px] leading-none hover:bg-magenta hover:text-paper hover:border-magenta"
                          title="删除该方案"
                          onClick={() => deletePlan(s.id, p.id)}
                        >
                          <Icons.x sw={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap mt-[13px] pt-[13px] border-t-2 border-dashed border-[#e4ddcd]">
                    <button
                      className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-[6px] px-[11px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:size-[14px]"
                      onClick={() => addPlan(s.id)}
                    >
                      <Icons.plus sw={2.6} />
                      加方案
                    </button>
                    <span className="ml-auto" />
                    <button
                      className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-[6px] px-[11px] rounded-full border-2 border-magenta cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] bg-paper-2 text-magenta hover:bg-magenta hover:text-paper disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:size-[14px]"
                      onClick={() => deleteStop(s.id)}
                    >
                      <Icons.trash sw={2.2} />
                      删除停靠点
                    </button>
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
