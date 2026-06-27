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
  1: "var(--magenta)",
  2: "var(--cyan)",
  3: "var(--green)",
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
      <div className="sec-banner" style={cssVars({ "--accent": "var(--magenta)" })}>
        <span className="sb-num">01</span>
        <div className="sb-meta">
          <div className="sb-t">行程停靠点</div>
          <div className="sb-d">点任意字段直接改 · 增删停靠点与方案 · 切换状态 / 类别</div>
        </div>
        <div className="sb-actions">
          <button className="pbtn ink" onClick={() => setAddDay(first ? first.day : 1)}>
            <Icons.plus sw={2.6} />
            新增停靠点
          </button>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="mk">停靠点</div>
          <div className="mv">{stops.length}</div>
          <div className="ms">横跨 {days.length} 天</div>
        </div>
        <div className="metric">
          <div className="mk">已预订</div>
          <div className="mv c-green">{stops.filter((s) => s.status === "booked").length}</div>
          <div className="ms">Booked</div>
        </div>
        <div className="metric">
          <div className="mk">计划中</div>
          <div className="mv c-cyan">{stops.filter((s) => s.status === "planned").length}</div>
          <div className="ms">Planned</div>
        </div>
        <div className="metric">
          <div className="mk">需关注</div>
          <div className="mv c-magenta">{stops.filter((s) => s.status === "watch").length}</div>
          <div className="ms">Watch</div>
        </div>
      </div>

      {days.map((d) => (
        <div
          key={d.day}
          className="block"
          style={cssVars({ "--accent": ACCENTS[d.day] ?? "var(--yellow)" })}
        >
          <div className="day-divider">
            <span className="dd-chip">
              <span className="dd-num">{String(d.day).padStart(2, "0")}</span>
              <span className="dd-date">{d.date}</span>
            </span>
            <span className="dd-line" />
            <button className="pbtn ghost tiny" onClick={() => setAddDay(d.day)}>
              <Icons.plus sw={2.6} />
              本日加一站
            </button>
          </div>

          {d.stops.map((s) => {
            const cat = CATS[s.cat];
            const st = STATUS[s.status];
            const short = s.time.length > 4;
            return (
              <div key={s.id} className="card stop-card" style={cssVars({ "--cat": cat.color })}>
                <div className="stop-stub" style={{ background: cat.color }}>
                  <Editable
                    key={`time-${s.time}`}
                    className={`ss-time${short ? " short" : ""}`}
                    value={s.time}
                    ariaLabel="时间"
                    onCommit={(v) => patch(s.id, { time: v || "00:00" })}
                  />
                  <button
                    className="cat-select"
                    title="点击切换类别"
                    onClick={() => cycleCat(s.id, s.cat)}
                  >
                    {cat.label}
                  </button>
                </div>

                <div className="stop-body">
                  <div className="stop-head">
                    <Editable
                      key={`title-${s.title}`}
                      className="stop-title"
                      value={s.title}
                      ariaLabel="标题"
                      onCommit={(v) => patch(s.id, { title: v || "未命名" })}
                    />
                    <button
                      className={`status ${st.cls}`}
                      title="点击切换状态"
                      onClick={() => cycleStatus(s.id, s.status)}
                    >
                      {st.label}
                    </button>
                  </div>

                  <Editable
                    key={`loc-${s.loc}`}
                    className="stop-loc"
                    value={s.loc}
                    ariaLabel="地点"
                    onCommit={(v) => patch(s.id, { loc: v })}
                  />
                  <Editable
                    key={`addr-${s.addr}`}
                    className="stop-addr"
                    value={s.addr}
                    placeholder="地址（可选）"
                    ariaLabel="地址"
                    onCommit={(v) => patch(s.id, { addr: v })}
                  />

                  <div className="plan-list">
                    {s.plans.map((p) => (
                      <div key={p.id} className={`plan-edit ${p.kind}`}>
                        <button
                          className="pk"
                          title="切换 主/备"
                          onClick={() => updatePlanKind(s.id, p.id)}
                        >
                          {p.kind === "main" ? "主方案" : "备用"}
                        </button>
                        <Editable
                          key={`plan-${p.text}`}
                          className="pt"
                          value={p.text}
                          multiline
                          ariaLabel="方案内容"
                          onCommit={(v) => updatePlan(s.id, p.id, v)}
                        />
                        <button
                          className="px"
                          title="删除该方案"
                          onClick={() => deletePlan(s.id, p.id)}
                        >
                          <Icons.x sw={2.4} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="stop-foot">
                    <button className="pbtn ghost tiny" onClick={() => addPlan(s.id)}>
                      <Icons.plus sw={2.6} />
                      加方案
                    </button>
                    <span className="sf-spacer" />
                    <button className="pbtn danger tiny" onClick={() => deleteStop(s.id)}>
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
