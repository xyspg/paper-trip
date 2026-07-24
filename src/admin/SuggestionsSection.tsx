import { useState } from "react";
import { categoryColor } from "../trip/categoryColor";
import { timeAgo } from "../trip/relativeTime";
import type { SuggestionStatus, TripItem, TripSuggestion } from "../trip/types";
import { Icons } from "./AdminIcons";
import {
  AdminEmptyState,
  BTN_ACCENT,
  BTN_DANGER,
  BTN_GHOST,
  BTN_SM,
  CHIP_OFF,
  CHIP_ON,
  Metrics,
  SectionHead,
} from "./adminUi";
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
    .filter(
      (s): s is TripSuggestion => Boolean(s) && s!.status === "pending" && visibleIds.has(s!.id),
    );

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
      <SectionHead
        kicker="02 · Suggestions"
        title="待审建议"
        desc="同行人从行程页提交的评论 · 采纳或忽略后会同步给所有人"
      />

      <Metrics
        items={[
          { k: "待审", v: pending.length, sub: "Pending", color: "#c2553f" },
          { k: "收到", v: suggestions.length, sub: "Total", color: "#7a5c84" },
          {
            k: "已采纳",
            v: suggestions.filter((s) => s.status === "adopted").length,
            sub: "Adopted",
            color: "#3f6f5b",
          },
          {
            k: "已忽略",
            v: suggestions.filter((s) => s.status === "ignored").length,
            sub: "Ignored",
          },
        ]}
      />

      <div className="flex gap-2 flex-wrap items-center mt-7">
        <span className="inline-flex items-center gap-2 font-grotesk font-semibold text-[11.5px] tracking-[0.02em] px-3 py-1.5 rounded-full bg-[#1c1b19] text-[#fafaf8]">
          待审
          <span className="font-mono text-[10px] rounded-full px-1.5 bg-white/[0.12] text-[#fafaf8]">
            {pending.length}
          </span>
        </span>
        <span className="flex-1" />
        <button
          className={`font-grotesk font-semibold text-[11.5px] px-3 py-1.5 rounded-full border transition-colors ${showDone ? CHIP_ON : CHIP_OFF}`}
          onClick={() => setShowDone((v) => !v)}
        >
          {showDone ? "隐藏已处理" : "显示已处理"}
        </button>
      </div>

      <div className="grid gap-3.5 mt-4">
        {visible.length === 0 && (
          <AdminEmptyState title="收件箱已清空" body="没有待审建议了。新建议会出现在这里。" />
        )}

        {visible.map((s) => {
          const item = itemById(s.itemId);
          const dotColor = item ? `var(${categoryColor[item.category]})` : "#9b988f";
          const done = s.status !== "pending";
          return (
            <div
              key={s.id}
              className="bg-white border border-[#ebe9e3] rounded-[14px] overflow-hidden"
              style={{ opacity: s.status === "adopted" ? 0.96 : 1 }}
            >
              {/* head */}
              <div className="flex items-center gap-2.5 px-3.5 py-2.5 border-b border-[#ebe9e3] bg-[#fdfdfb]">
                <span
                  className="font-grotesk text-[10px] font-bold tracking-[0.1em] uppercase rounded-full px-2.5 py-1 border"
                  style={{ color: "#5b7a99", borderColor: "#5b7a9955", background: "#5b7a9912" }}
                >
                  评论
                </span>
                <span className="ml-auto font-grotesk text-[11px] text-[#9b988f] whitespace-nowrap">
                  {timeAgo(s.createdAt)}
                </span>
              </div>

              {/* target */}
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#fafaf8] border-b border-dashed border-[#ebe9e3] font-cjk text-[12px] text-[#76726a]">
                <span>提给</span>
                <span className="inline-flex items-center gap-1.5 font-grotesk text-[10px] font-bold tracking-[0.04em] uppercase border border-[#ebe9e3] rounded-full px-2.5 py-1 text-[#3b3833] min-w-0 truncate">
                  <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: dotColor }} />
                  {item ? item.title : "已删除的停靠点"}
                </span>
                {item && <span className="font-mono text-[11px]">· {item.time}</span>}
              </div>

              {/* body */}
              <div className="p-3.5 font-cjk text-[13.5px] leading-[1.7] text-[#3b3833] [&_b]:font-bold [&_b]:text-[#1c1b19]">
                {s.body}
              </div>

              {/* actions */}
              {done ? (
                <div className="flex items-center gap-2.5 flex-wrap px-3.5 py-3 border-t border-[#ebe9e3] bg-[#fafaf8]">
                  <span
                    className={`inline-flex items-center gap-1.5 font-grotesk text-[10.5px] font-bold tracking-[0.06em] uppercase border rounded-full px-2.5 py-1 [&_svg]:size-[13px] ${s.status === "adopted" ? "text-[#3f6f5b] border-[#cfe0d6] bg-[#eef4f0]" : "text-[#9b988f] border-[#ebe9e3] bg-white"}`}
                  >
                    {s.status === "adopted" ? <Icons.check sw={3} /> : <Icons.x sw={3} />}
                    {s.status === "adopted" ? "已采纳" : "已忽略"}
                  </span>
                  <button className={`ml-auto ${BTN_SM} ${BTN_GHOST}`} onClick={() => undo(s)}>
                    撤销
                  </button>
                  <button
                    className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-[13px]`}
                    onClick={() => remove(s)}
                  >
                    <Icons.trash sw={2.2} />
                    删除
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 flex-wrap px-3.5 py-3 border-t border-[#ebe9e3] bg-[#fafaf8]">
                  <button
                    className={`inline-flex items-center gap-2 rounded-md px-2 py-1 transition-colors border [&_svg]:size-3 ${sel.has(s.id) ? "bg-[#1c1b19] border-[#1c1b19] text-white" : "bg-white border-[#ebe9e3] text-[#76726a]"}`}
                    onClick={() => toggleSel(s.id)}
                    aria-label="选择以批量处理"
                  >
                    <span className="w-4 h-4 grid place-items-center">
                      {sel.has(s.id) && <Icons.check sw={3} />}
                    </span>
                    <span className="font-grotesk text-[10.5px] font-semibold tracking-[0.04em]">
                      批量选择
                    </span>
                  </button>
                  <span className="ml-auto" />
                  <button
                    className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-[13px]`}
                    onClick={() => remove(s)}
                  >
                    <Icons.trash sw={2.2} />
                    删除
                  </button>
                  <button
                    className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-[13px]`}
                    onClick={() => ignore(s)}
                  >
                    <Icons.x sw={2.4} />
                    忽略
                  </button>
                  <button
                    className={`${BTN_SM} ${BTN_ACCENT} [&_svg]:size-[13px]`}
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
        <div
          className="sticky bottom-4 z-20 flex items-center gap-3 flex-wrap mt-5 px-4 py-3 bg-[#1c1b19] text-[#fafaf8] rounded-full"
          style={{ boxShadow: "0 18px 40px -18px rgba(20,20,30,0.6)" }}
        >
          <span className="font-sans font-bold text-[15px] text-white">{selPending.length}</span>
          <span className="font-cjk text-[12.5px] text-white/75">条已选 · 批量处理</span>
          <span className="ml-auto flex gap-2.5">
            <button
              className={`${BTN_SM} border border-white/25 text-[#fafaf8] hover:bg-white/10`}
              onClick={() => setSel(new Set())}
            >
              取消
            </button>
            <button
              className={`${BTN_SM} border border-white/25 text-[#fafaf8] hover:bg-white/10 [&_svg]:size-[13px]`}
              onClick={batchIgnore}
            >
              <Icons.x sw={2.4} />
              全部忽略
            </button>
            <button className={`${BTN_SM} ${BTN_ACCENT} [&_svg]:size-[13px]`} onClick={batchAdopt}>
              <Icons.check sw={2.6} />
              全部采纳
            </button>
          </span>
        </div>
      )}

      {confirmModal}
    </div>
  );
}
