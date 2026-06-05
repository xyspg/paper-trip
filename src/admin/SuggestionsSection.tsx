import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CATS, memberById } from "./adminData";
import type { Stop, Suggestion, SuggestionStatus } from "./adminData";
import { Avatar } from "./Avatar";
import { Icons } from "./AdminIcons";
import { cssVars } from "./style";
import type { ToastFn } from "./useAdminToasts";

type Props = {
  suggestions: Suggestion[];
  setSuggestions: Dispatch<SetStateAction<Suggestion[]>>;
  stops: Stop[];
  applyRewrite: (stopId: string, planId: string, toText: string) => void;
  toast: ToastFn;
};

type TypeFilter = "all" | "comment" | "rewrite";
const FILTERS: [TypeFilter, string][] = [
  ["all", "全部"],
  ["comment", "评论"],
  ["rewrite", "建议改写"],
];

export function SuggestionsSection({
  suggestions,
  setSuggestions,
  stops,
  applyRewrite,
  toast,
}: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [showDone, setShowDone] = useState(false);
  const [sel, setSel] = useState<Set<string>>(() => new Set());

  const pending = suggestions.filter((s) => s.status === "pending");
  const stopById = (id: string) => stops.find((s) => s.id === id);

  const visible = suggestions.filter((s) => {
    if (!showDone && s.status !== "pending") return false;
    if (typeFilter !== "all" && s.type !== typeFilter) return false;
    return true;
  });

  const setStatus = (id: string, status: SuggestionStatus) =>
    setSuggestions(suggestions.map((s) => (s.id === id ? { ...s, status } : s)));

  const clearSel = (id: string) =>
    setSel((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const adopt = (s: Suggestion) => {
    if (s.type === "rewrite") applyRewrite(s.stopId, s.planId, s.to);
    setStatus(s.id, "adopted");
    toast(s.type === "rewrite" ? "已采用改写，已写入行程" : "已采纳建议");
    clearSel(s.id);
  };
  const ignore = (s: Suggestion) => {
    setStatus(s.id, "ignored");
    toast("已忽略建议", "warn");
    clearSel(s.id);
  };
  const undo = (s: Suggestion) => {
    // Adopting a rewrite wrote s.to into the itinerary; un-adopting must restore s.from.
    if (s.type === "rewrite" && s.status === "adopted") {
      applyRewrite(s.stopId, s.planId, s.from);
    }
    setStatus(s.id, "pending");
    toast("已恢复到待审");
  };

  const toggleSel = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Batch acts only on currently-visible selections, so a type-filter change can't
  // silently process rows the user can no longer see.
  const visibleIds = new Set(visible.map((s) => s.id));
  const selPending = [...sel]
    .map((id) => suggestions.find((s) => s.id === id))
    .filter((s): s is Suggestion => Boolean(s) && s!.status === "pending" && visibleIds.has(s!.id));

  const dropFromSel = (ids: Set<string>) =>
    setSel((prev) => new Set([...prev].filter((id) => !ids.has(id))));

  const batchAdopt = () => {
    const ids = new Set(selPending.map((s) => s.id));
    selPending.forEach((s) => {
      if (s.type === "rewrite") applyRewrite(s.stopId, s.planId, s.to);
    });
    setSuggestions(suggestions.map((s) => (ids.has(s.id) ? { ...s, status: "adopted" } : s)));
    toast(`已采纳 ${selPending.length} 条建议`);
    dropFromSel(ids);
  };
  const batchIgnore = () => {
    const ids = new Set(selPending.map((s) => s.id));
    setSuggestions(suggestions.map((s) => (ids.has(s.id) ? { ...s, status: "ignored" } : s)));
    toast(`已忽略 ${selPending.length} 条`, "warn");
    dropFromSel(ids);
  };

  return (
    <div>
      <div className="sec-banner" style={cssVars({ "--accent": "var(--violet)" })}>
        <span className="sb-num">02</span>
        <div className="sb-meta">
          <div className="sb-t">待审建议</div>
          <div className="sb-d">同行人提的评论与改写 · 采用改写会直接写入行程对应方案</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="mk">待审</div>
          <div className="mv c-magenta">{pending.length}</div>
          <div className="ms">Pending</div>
        </div>
        <div className="metric">
          <div className="mk">建议改写</div>
          <div className="mv c-violet">{pending.filter((s) => s.type === "rewrite").length}</div>
          <div className="ms">Rewrites</div>
        </div>
        <div className="metric">
          <div className="mk">已采纳</div>
          <div className="mv c-green">
            {suggestions.filter((s) => s.status === "adopted").length}
          </div>
          <div className="ms">Adopted</div>
        </div>
        <div className="metric">
          <div className="mk">已忽略</div>
          <div className="mv">{suggestions.filter((s) => s.status === "ignored").length}</div>
          <div className="ms">Ignored</div>
        </div>
      </div>

      <div className="block">
        <div className="sug-filters">
          {FILTERS.map(([k, lbl]) => {
            const n = pending.filter((s) => (k === "all" ? true : s.type === k)).length;
            return (
              <button
                key={k}
                className={`filter-pill${typeFilter === k ? " on" : ""}`}
                onClick={() => setTypeFilter(k)}
              >
                {lbl}
                <span className="fp-n">{n}</span>
              </button>
            );
          })}
          <span style={{ flex: 1 }} />
          <button
            className={`filter-pill${showDone ? " on" : ""}`}
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? "隐藏已处理" : "显示已处理"}
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {visible.length === 0 && (
            <div className="empty">
              <div className="e-ico" style={{ color: "var(--green)" }}>
                <Icons.check sw={2.4} />
              </div>
              <div className="e-t">收件箱已清空</div>
              <div className="e-d">没有待审建议了。新建议会出现在这里。</div>
            </div>
          )}

          {visible.map((s) => {
            const author = memberById(s.author);
            const stop = stopById(s.stopId);
            const cat = stop ? CATS[stop.cat] : CATS.misc;
            const done = s.status !== "pending";
            const cardClass = [
              "card sug-card",
              s.type === "rewrite" && "is-rewrite",
              s.status === "adopted" && "done",
              s.status === "ignored" && "ignored",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={s.id} className={cardClass}>
                <div className="sug-head">
                  <span className={`sug-flag${s.type === "rewrite" ? " rewrite" : ""}`}>
                    {s.type === "rewrite" ? "建议改写" : "评论"}
                  </span>
                  <span className="sug-who">
                    <Avatar m={author} size="xs" />
                    <span className="nm">{author.name}</span>
                    <span className="hd">@{author.handle}</span>
                  </span>
                  <span className="sug-when">{s.when}</span>
                </div>

                <div className="sug-target">
                  <span>提给</span>
                  <span className="tgt-chip">
                    <span className="dot" style={{ background: cat.color }} />
                    {stop ? stop.title : "已删除的停靠点"}
                  </span>
                  {stop && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>· {stop.time}</span>
                  )}
                </div>

                <div className="sug-body">
                  {s.type === "comment" ? (
                    <span>{s.body}</span>
                  ) : (
                    <>
                      <div className="diff">
                        <div className="diff-row del">
                          <span className="dk">−</span>
                          <span className="dt">{s.from}</span>
                        </div>
                        <div className="diff-row add">
                          <span className="dk">+</span>
                          <span className="dt">{s.to}</span>
                        </div>
                      </div>
                      {s.reason && (
                        <div className="sug-reason">
                          <span className="rk">理由</span>
                          <span>{s.reason}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {done ? (
                  <div className="sug-actions">
                    <span className={`res-badge ${s.status === "adopted" ? "adopt" : "ignore"}`}>
                      <span className="ck">
                        {s.status === "adopted" ? <Icons.check sw={3} /> : <Icons.x sw={3} />}
                      </span>
                      {s.status === "adopted"
                        ? s.type === "rewrite"
                          ? "已采用改写"
                          : "已采纳"
                        : "已忽略"}
                    </span>
                    <button className="sug-undo" onClick={() => undo(s)}>
                      撤销
                    </button>
                  </div>
                ) : (
                  <div className="sug-actions">
                    <span className="sel-wrap">
                      <button
                        className={`sug-check${sel.has(s.id) ? " on" : ""}`}
                        onClick={() => toggleSel(s.id)}
                        aria-label="选择以批量处理"
                      >
                        {sel.has(s.id) && <Icons.check sw={3} />}
                      </button>
                      <span className="sug-check-lbl">批量选择</span>
                    </span>
                    <button className="pbtn ghost" onClick={() => ignore(s)}>
                      <Icons.x sw={2.4} />
                      忽略
                    </button>
                    <button
                      className="pbtn solid"
                      style={cssVars({ "--accent": "var(--green)" })}
                      onClick={() => adopt(s)}
                    >
                      {s.type === "rewrite" ? <Icons.swap sw={2.2} /> : <Icons.check sw={2.6} />}
                      {s.type === "rewrite" ? "采用改写" : "采纳"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {selPending.length > 0 && (
          <div className="batch-bar">
            <span className="bb-n">{selPending.length}</span>
            <span className="bb-t">条已选 · 批量处理</span>
            <span className="bb-acts">
              <button className="pbtn ghost" onClick={() => setSel(new Set())}>
                取消
              </button>
              <button className="pbtn dark" onClick={batchIgnore}>
                <Icons.x sw={2.4} />
                全部忽略
              </button>
              <button
                className="pbtn solid"
                style={cssVars({ "--accent": "var(--green)" })}
                onClick={batchAdopt}
              >
                <Icons.check sw={2.6} />
                全部采纳
              </button>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
