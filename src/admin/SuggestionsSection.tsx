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
      <div
        className="relative bg-ink text-paper border-[3px] border-ink rounded-card shadow-hard-sm py-[18px] px-[clamp(18px,3vw,26px)] overflow-hidden isolate flex items-center gap-4 flex-wrap before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_24px,rgba(255,255,255,0.04)_24px_26px)]"
        style={cssVars({ "--accent": "var(--color-violet)" })}
      >
        <span className="shrink-0 font-display font-black text-[24px] leading-none text-ink bg-[var(--accent,var(--color-yellow))] border-2 border-paper rounded-[10px] w-12 h-12 grid place-items-center">02</span>
        <div className="min-w-0">
          <div className="font-display font-black text-[clamp(19px,3vw,26px)] uppercase tracking-[0.01em] leading-none">待审建议</div>
          <div className="font-cjk font-medium text-[13px] text-paper/72 mt-[7px]">同行人从行程页提交的评论 · 采纳或忽略后会同步给所有人</div>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-0 mt-4 bg-paper-2 border-[3px] border-ink rounded-card shadow-hard-sm overflow-hidden">
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">待审</div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] text-magenta">{pending.length}</div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Pending</div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">收到</div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] text-violet">{suggestions.length}</div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Total</div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">已采纳</div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] text-green">
            {suggestions.filter((s) => s.status === "adopted").length}
          </div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Adopted</div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">已忽略</div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px]">{suggestions.filter((s) => s.status === "ignored").length}</div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Ignored</div>
        </div>
      </div>

      <div className="mt-[clamp(20px,4vw,30px)]">
        <div className="flex gap-2 flex-wrap items-center mb-1">
          <span className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11.5px] tracking-[0.04em] py-[7px] px-[13px] rounded-full border-2 border-ink cursor-pointer bg-ink text-paper">
            待审
            <span className="font-mono font-bold text-[10px] border-[1.5px] border-ink rounded-full px-1.5 bg-yellow text-ink">{pending.length}</span>
          </span>
          <span style={{ flex: 1 }} />
          <button
            className={`inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11.5px] tracking-[0.04em] py-[7px] px-[13px] rounded-full border-2 border-ink cursor-pointer ${showDone ? "bg-ink text-paper" : "bg-paper-2 text-ink"}`}
            onClick={() => setShowDone((v) => !v)}
          >
            {showDone ? "隐藏已处理" : "显示已处理"}
          </button>
        </div>

        <div style={{ marginTop: 14, display: "grid", gap: 14 }}>
          {visible.length === 0 && (
            <div className="text-center py-12 px-6 border-[3px] border-dashed border-ink rounded-card bg-paper-2">
              <div className="w-14 h-14 mx-auto mb-3.5 rounded-[14px] bg-[color-mix(in_srgb,var(--color-green)_18%,var(--color-paper-2))] border-[3px] border-ink grid place-items-center [&_svg]:w-7 [&_svg]:h-7" style={{ color: "var(--color-green)" }}>
                <Icons.check sw={2.4} />
              </div>
              <div className="font-display font-extrabold text-[17px] uppercase tracking-[0.04em]">收件箱已清空</div>
              <div className="font-cjk font-medium text-[13px] text-ink-soft mt-2">没有待审建议了。新建议会出现在这里。</div>
            </div>
          )}

          {visible.map((s) => {
            const item = itemById(s.itemId);
            const dotColor = item ? `var(${categoryColor[item.category]})` : "var(--color-ink)";
            const done = s.status !== "pending";
            const cardClass =
              "bg-paper-2 border-[3px] border-ink rounded-card shadow-hard overflow-hidden [&:not(:first-child)]:mt-4" +
              (s.status === "adopted" ? " opacity-[0.96]" : "");
            const headBg =
              s.status === "adopted"
                ? "bg-[color-mix(in_srgb,var(--color-green)_14%,var(--color-paper))]"
                : s.status === "ignored"
                  ? "bg-paper"
                  : "bg-[color-mix(in_srgb,var(--color-violet)_10%,var(--color-paper))]";
            return (
              <div key={s.id} className={cardClass}>
                <div className={`flex items-center gap-2.5 py-[11px] px-3.5 border-b-2 border-ink ${headBg}`}>
                  <span className="font-grotesk font-extrabold text-[10.5px] tracking-[0.1em] uppercase bg-violet text-ink border-2 border-ink py-[3px] px-[9px] rounded-full">评论</span>
                  <span style={{ flex: 1 }} />
                  <span className="ml-auto font-grotesk font-bold text-[11px] text-ink-soft tracking-[0.02em] whitespace-nowrap">{timeAgo(s.createdAt)}</span>
                </div>

                <div className="flex items-center gap-2 py-[9px] px-3.5 bg-paper border-b-2 border-dashed border-[#e4ddcd] font-cjk font-semibold text-[12px] text-ink-soft">
                  <span>提给</span>
                  <span className="inline-flex items-center gap-1.5 font-grotesk font-extrabold text-[10px] tracking-[0.06em] uppercase border-2 border-ink rounded-full py-[3px] px-[9px] text-ink whitespace-nowrap min-w-0 max-w-full overflow-hidden text-ellipsis">
                    <span className="w-2 h-2 shrink-0 rounded-[3px] border-[1.5px] border-ink" style={{ background: dotColor }} />
                    {item ? item.title : "已删除的停靠点"}
                  </span>
                  {item && (
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>· {item.time}</span>
                  )}
                </div>

                <div className="p-3.5 font-cjk font-medium text-[13.5px] leading-[1.6] [&_b]:font-extrabold">
                  <span>{s.body}</span>
                </div>

                {done ? (
                  <div className="flex items-center gap-[9px] flex-wrap py-[11px] px-3.5 border-t-2 border-ink bg-paper">
                    <span className={`shrink-0 inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[10.5px] tracking-[0.08em] uppercase border-2 border-ink rounded-full py-1 px-2.5 ${s.status === "adopted" ? "bg-green text-ink" : "bg-paper-2 text-ink-soft"}`}>
                      <span className="w-4 h-4 grid place-items-center">
                        {s.status === "adopted" ? <Icons.check sw={3} /> : <Icons.x sw={3} />}
                      </span>
                      {s.status === "adopted" ? "已采纳" : "已忽略"}
                    </span>
                    <button className="ml-auto font-grotesk font-extrabold text-[11px] tracking-[0.04em] py-1.5 px-3 rounded-full border-2 border-ink bg-paper-2 text-ink cursor-pointer hover:bg-ink hover:text-paper" onClick={() => undo(s)}>
                      撤销
                    </button>
                    <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-1.5 px-[11px] rounded-full border-2 border-magenta text-magenta bg-paper-2 cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] hover:bg-magenta hover:text-paper disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5" onClick={() => remove(s)}>
                      <Icons.trash sw={2.2} />
                      删除
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-[9px] flex-wrap py-[11px] px-3.5 border-t-2 border-ink bg-paper">
                    <span className="flex items-center gap-[7px] mr-auto">
                      <button
                        className={`w-[22px] h-[22px] rounded-md cursor-pointer border-2 border-ink grid place-items-center font-black text-[12px] ${sel.has(s.id) ? "bg-ink text-yellow" : "bg-paper-2 text-ink"}`}
                        onClick={() => toggleSel(s.id)}
                        aria-label="选择以批量处理"
                      >
                        {sel.has(s.id) && <Icons.check sw={3} />}
                      </button>
                      <span className="font-grotesk font-bold text-[11px] text-ink-soft tracking-[0.04em]">批量选择</span>
                    </span>
                    <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-1.5 px-[11px] rounded-full border-2 border-magenta text-magenta bg-paper-2 cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] hover:bg-magenta hover:text-paper disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5" onClick={() => remove(s)}>
                      <Icons.trash sw={2.2} />
                      删除
                    </button>
                    <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink text-ink bg-paper-2 cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] hover:[transform:translate(-1px,-1px)] hover:shadow-[4px_4px_0_var(--color-ink)] active:[transform:translate(3px,3px)] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5" onClick={() => ignore(s)}>
                      <Icons.x sw={2.4} />
                      忽略
                    </button>
                    <button
                      className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink text-ink bg-[var(--accent,var(--color-yellow))] cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] hover:[transform:translate(-1px,-1px)] hover:shadow-[4px_4px_0_var(--color-ink)] active:[transform:translate(3px,3px)] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5"
                      style={cssVars({ "--accent": "var(--color-green)" })}
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
          <div className="sticky bottom-4 z-20 flex items-center gap-3 flex-wrap mt-[18px] py-[13px] px-4 bg-ink text-paper border-[3px] border-ink rounded-full shadow-hard">
            <span className="font-display font-black text-[15px] text-yellow">{selPending.length}</span>
            <span className="font-cjk font-semibold text-[12.5px] text-paper/80">条已选 · 批量处理</span>
            <span className="ml-auto flex gap-[9px]">
              <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink text-ink bg-paper-2 cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] hover:[transform:translate(-1px,-1px)] hover:shadow-[4px_4px_0_var(--color-ink)] active:[transform:translate(3px,3px)] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5" onClick={() => setSel(new Set())}>
                取消
              </button>
              <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink text-ink bg-paper-2 cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5" onClick={batchIgnore}>
                <Icons.x sw={2.4} />
                全部忽略
              </button>
              <button
                className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink text-ink bg-[var(--accent,var(--color-yellow))] cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] hover:[transform:translate(-1px,-1px)] hover:shadow-[4px_4px_0_var(--color-ink)] active:[transform:translate(3px,3px)] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)] [&_svg]:w-3.5 [&_svg]:h-3.5"
                style={cssVars({ "--accent": "var(--color-green)" })}
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
