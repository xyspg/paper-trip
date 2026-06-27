import { useState } from "react";
import { categoryColor } from "../trip/categoryColor";
import { timeAgo } from "../trip/relativeTime";
import type { SuggestionStatus, TripItem, TripSuggestion } from "../trip/types";
import { Icons } from "./AdminIcons";
import { cssVars } from "./style";
import { useConfirm } from "./useConfirm";
import type { ToastFn } from "./useAdminToasts";

type Props = {
  suggestions: TripSuggestion[];
  items: TripItem[];
  onSetStatus: (id: string, status: SuggestionStatus) => void;
  onDelete: (id: string) => void;
  toast: ToastFn;
};

export function SuggestionsSection({ suggestions, items, onSetStatus, onDelete, toast }: Props) {
  const [showDone, setShowDone] = useState(false);
  const [sel, setSel] = useState<Set<string>>(() => new Set());
  const { confirm, confirmModal } = useConfirm();

  const pending = suggestions.filter((s) => s.status === "pending");
  const itemById = (id: string) => items.find((i) => i.id === id);

  const visible = suggestions.filter((s) => showDone || s.status === "pending");

  const clearSel = (id: string) =>
    setSel((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const adopt = (s: TripSuggestion) => {
    onSetStatus(s.id, "adopted");
    toast("已采纳建议");
    clearSel(s.id);
  };
  const ignore = (s: TripSuggestion) => {
    onSetStatus(s.id, "ignored");
    toast("已忽略建议", "warn");
    clearSel(s.id);
  };
  const undo = (s: TripSuggestion) => {
    onSetStatus(s.id, "pending");
    toast("已恢复到待审");
  };
  const remove = async (s: TripSuggestion) => {
    const ok = await confirm({
      title: "删除建议",
      message: "确定删除这条建议吗？删除后无法恢复。",
      confirmLabel: "删除建议",
    });
    if (!ok) return;
    onDelete(s.id);
    toast("已删除建议", "warn");
    clearSel(s.id);
  };

  const toggleSel = (id: string) =>
    setSel((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Batch acts only on currently-visible selections, so the showDone toggle can't
  // silently process rows the user can no longer see.
  const visibleIds = new Set(visible.map((s) => s.id));
  const selPending = [...sel]
    .map((id) => suggestions.find((s) => s.id === id))
    .filter((s): s is TripSuggestion => Boolean(s) && s!.status === "pending" && visibleIds.has(s!.id));

  const dropFromSel = (ids: Set<string>) =>
    setSel((prev) => new Set([...prev].filter((id) => !ids.has(id))));

  const batchAdopt = () => {
    const ids = new Set(selPending.map((s) => s.id));
    selPending.forEach((s) => onSetStatus(s.id, "adopted"));
    toast(`已采纳 ${selPending.length} 条建议`);
    dropFromSel(ids);
  };
  const batchIgnore = () => {
    const ids = new Set(selPending.map((s) => s.id));
    selPending.forEach((s) => onSetStatus(s.id, "ignored"));
    toast(`已忽略 ${selPending.length} 条`, "warn");
    dropFromSel(ids);
  };

  return (
    <div>
      <div className="sec-banner" style={cssVars({ "--accent": "var(--violet)" })}>
        <span className="sb-num">02</span>
        <div className="sb-meta">
          <div className="sb-t">待审建议</div>
          <div className="sb-d">同行人从行程页提交的评论 · 采纳或忽略后会同步给所有人</div>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="mk">待审</div>
          <div className="mv c-magenta">{pending.length}</div>
          <div className="ms">Pending</div>
        </div>
        <div className="metric">
          <div className="mk">收到</div>
          <div className="mv c-violet">{suggestions.length}</div>
          <div className="ms">Total</div>
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
          <span className="filter-pill on">
            待审
            <span className="fp-n">{pending.length}</span>
          </span>
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
            const item = itemById(s.itemId);
            const dotColor = item ? `var(${categoryColor[item.category]})` : "var(--ink)";
            const done = s.status !== "pending";
            const cardClass = [
              "card sug-card",
              s.status === "adopted" && "done",
              s.status === "ignored" && "ignored",
            ]
              .filter(Boolean)
              .join(" ");
            return (
              <div key={s.id} className={cardClass}>
                <div className="sug-head">
                  <span className="sug-flag">评论</span>
                  <span style={{ flex: 1 }} />
                  <span className="sug-when">{timeAgo(s.createdAt)}</span>
                </div>

                <div className="sug-target">
                  <span>提给</span>
                  <span className="tgt-chip">
                    <span className="dot" style={{ background: dotColor }} />
                    {item ? item.title : "已删除的停靠点"}
                  </span>
                  {item && (
                    <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>· {item.time}</span>
                  )}
                </div>

                <div className="sug-body">
                  <span>{s.body}</span>
                </div>

                {done ? (
                  <div className="sug-actions">
                    <span className={`res-badge ${s.status === "adopted" ? "adopt" : "ignore"}`}>
                      <span className="ck">
                        {s.status === "adopted" ? <Icons.check sw={3} /> : <Icons.x sw={3} />}
                      </span>
                      {s.status === "adopted" ? "已采纳" : "已忽略"}
                    </span>
                    <button className="sug-undo" onClick={() => undo(s)}>
                      撤销
                    </button>
                    <button className="pbtn danger tiny" onClick={() => remove(s)}>
                      <Icons.trash sw={2.2} />
                      删除
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
                    <button className="pbtn danger tiny" onClick={() => remove(s)}>
                      <Icons.trash sw={2.2} />
                      删除
                    </button>
                    <button className="pbtn ghost" onClick={() => ignore(s)}>
                      <Icons.x sw={2.4} />
                      忽略
                    </button>
                    <button
                      className="pbtn solid"
                      style={cssVars({ "--accent": "var(--green)" })}
                      onClick={() => adopt(s)}
                    >
                      <Icons.check sw={2.6} />
                      采纳
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

      {confirmModal}
    </div>
  );
}
