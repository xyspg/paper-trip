import { useAudit } from "../trip/hooks";
import type { AuditEntry } from "../trip/api";
import type { TripOp } from "../trip/ops";
import { Icons } from "./AdminIcons";
import { cssVars } from "./style";

// Human-readable label per TripOp type, so the log reads as actions rather than
// raw op identifiers. Typed to the TripOp union so adding an op fails the build
// here until it is labeled, matching the exhaustive opTarget() switch in the worker.
const OP_LABEL: Record<TripOp["type"], string> = {
  setItemStatus: "更新停靠点状态",
  updateItem: "编辑停靠点",
  setChecklistItem: "勾选清单项",
  addSuggestion: "提交建议",
  setSuggestionStatus: "处理建议",
  deleteSuggestion: "删除建议",
  clearSuggestions: "清空建议",
  addExpense: "添加花销",
  updateExpense: "编辑花销",
  deleteExpense: "删除花销",
  setExpenseAmount: "修改金额",
  setExpensePayer: "修改付款人",
  setExpenseSplit: "修改分账",
  resetExpenses: "恢复原始账目",
  reset: "重置全部数据",
};

// Absolute local time, plus seconds, so the trail is precise enough to audit.
const fmtTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
};

function ActorCell({ e }: { e: AuditEntry }) {
  const isPublic = e.actorLogin === "public";
  return (
    <span className="grid grid-cols-[auto_1fr] grid-rows-[auto_auto] gap-x-2 items-center min-w-0">
      <span className="row-[1/3] w-[9px] h-[9px] rounded-full border-[1.5px] border-ink" style={{ background: isPublic ? "var(--color-ink-soft)" : "var(--color-magenta)" }} />
      <span className="font-bold whitespace-nowrap overflow-hidden text-ellipsis">{isPublic ? "访客" : e.actorLogin}</span>
      <span className="col-start-2 font-mono text-[10.5px] text-ink-soft whitespace-nowrap overflow-hidden text-ellipsis">{isPublic ? e.ip || "未知 IP" : e.actorEmail || `#${e.actorId ?? "?"}`}</span>
    </span>
  );
}

export function AuditSection() {
  const { data: entries, isLoading, isError, refetch, isFetching } = useAudit();

  return (
    <div>
      <div className="relative bg-ink text-paper border-[3px] border-ink rounded-card shadow-hard-sm py-[18px] px-[clamp(18px,3vw,26px)] overflow-hidden isolate flex items-center gap-4 flex-wrap before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_24px,rgba(255,255,255,0.04)_24px_26px)]" style={cssVars({ "--accent": "var(--color-cyan)" })}>
        <span className="shrink-0 font-display font-black text-[24px] leading-none text-ink bg-[var(--accent,var(--color-yellow))] border-2 border-paper rounded-[10px] w-12 h-12 grid place-items-center">04</span>
        <div className="min-w-0">
          <div className="font-display font-black text-[clamp(19px,3vw,26px)] uppercase tracking-[0.01em] leading-none">操作记录</div>
          <div className="font-cjk font-medium text-[13px] text-paper/72 mt-[7px]">每一次写操作的审计日志 · 记录操作人、动作、对象与时间 · 仅管理员可见</div>
        </div>
        <span style={{ flex: 1 }} />
        <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:w-[14px] [&_svg]:h-[14px] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" onClick={() => refetch()} disabled={isFetching}>
          <Icons.swap sw={2.2} />
          {isFetching ? "刷新中" : "刷新"}
        </button>
      </div>

      <div className="mt-[clamp(20px,4vw,30px)]">
        {isLoading ? (
          <div className="text-center py-12 px-6 border-[3px] border-dashed border-ink rounded-card bg-paper-2">
            <div className="font-display font-extrabold text-[17px] uppercase tracking-[0.04em]">加载中…</div>
          </div>
        ) : isError ? (
          <div className="text-center py-12 px-6 border-[3px] border-dashed border-ink rounded-card bg-paper-2">
            <div className="w-14 h-14 mt-0 mx-auto mb-[14px] rounded-[14px] bg-[color-mix(in_srgb,var(--color-green)_18%,var(--color-paper-2))] border-[3px] border-ink grid place-items-center [&_svg]:w-7 [&_svg]:h-7" style={{ color: "var(--color-magenta)" }}>
              <Icons.x sw={2.4} />
            </div>
            <div className="font-display font-extrabold text-[17px] uppercase tracking-[0.04em]">无法加载审计日志</div>
            <div className="font-cjk font-medium text-[13px] text-ink-soft mt-2">请确认你已登录管理员账号后重试。</div>
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="text-center py-12 px-6 border-[3px] border-dashed border-ink rounded-card bg-paper-2">
            <div className="font-display font-extrabold text-[17px] uppercase tracking-[0.04em]">暂无记录</div>
            <div className="font-cjk font-medium text-[13px] text-ink-soft mt-2">发生写操作后，记录会出现在这里。</div>
          </div>
        ) : (
          <div className="grid gap-2">
            {entries.map((e) => (
              <details key={e.seq} className="bg-paper-2 border-2 border-ink rounded-[12px] shadow-[3px_3px_0_var(--color-ink)] overflow-hidden">
                <summary className="grid grid-cols-[132px_minmax(140px,1fr)_120px_minmax(0,1.2fr)_44px] items-center gap-3 py-[11px] px-[14px] cursor-pointer list-none text-[13px] [&::-webkit-details-marker]:hidden max-[720px]:grid-cols-[1fr_1fr] max-[720px]:gap-y-[6px]">
                  <span className="font-mono text-[12px] text-ink-soft whitespace-nowrap">{fmtTime(e.at)}</span>
                  <ActorCell e={e} />
                  <span className="font-bold whitespace-nowrap">{OP_LABEL[e.op as TripOp["type"]] ?? e.op}</span>
                  <span className="font-mono text-[11.5px] text-ink-soft whitespace-nowrap overflow-hidden text-ellipsis">{e.target ?? "—"}</span>
                  <span className="justify-self-end font-mono text-[11px] text-ink-soft max-[720px]:justify-self-start">r{e.rev}</span>
                </summary>
                <pre className="m-0 py-3 px-[14px] border-t-2 border-dashed border-ink bg-paper font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap [word-break:break-word]">{prettyDetail(e.detail)}</pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// The stored detail is the JSON-stringified op; pretty-print it, falling back to
// the raw string if it ever fails to parse.
function prettyDetail(detail: string): string {
  try {
    return JSON.stringify(JSON.parse(detail), null, 2);
  } catch {
    return detail;
  }
}
