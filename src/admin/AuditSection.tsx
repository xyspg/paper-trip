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
    <span className="aud-actor">
      <span className="aud-dot" style={{ background: isPublic ? "var(--ink-soft)" : "var(--magenta)" }} />
      <span className="aud-actor-name">{isPublic ? "访客" : e.actorLogin}</span>
      <span className="aud-actor-sub">{isPublic ? e.ip || "未知 IP" : e.actorEmail || `#${e.actorId ?? "?"}`}</span>
    </span>
  );
}

export function AuditSection() {
  const { data: entries, isLoading, isError, refetch, isFetching } = useAudit();

  return (
    <div>
      <div className="sec-banner" style={cssVars({ "--accent": "var(--cyan)" })}>
        <span className="sb-num">04</span>
        <div className="sb-meta">
          <div className="sb-t">操作记录</div>
          <div className="sb-d">每一次写操作的审计日志 · 记录操作人、动作、对象与时间 · 仅管理员可见</div>
        </div>
        <span style={{ flex: 1 }} />
        <button className="pbtn ghost" onClick={() => refetch()} disabled={isFetching}>
          <Icons.swap sw={2.2} />
          {isFetching ? "刷新中" : "刷新"}
        </button>
      </div>

      <div className="block">
        {isLoading ? (
          <div className="empty">
            <div className="e-t">加载中…</div>
          </div>
        ) : isError ? (
          <div className="empty">
            <div className="e-ico" style={{ color: "var(--magenta)" }}>
              <Icons.x sw={2.4} />
            </div>
            <div className="e-t">无法加载审计日志</div>
            <div className="e-d">请确认你已登录管理员账号后重试。</div>
          </div>
        ) : !entries || entries.length === 0 ? (
          <div className="empty">
            <div className="e-t">暂无记录</div>
            <div className="e-d">发生写操作后，记录会出现在这里。</div>
          </div>
        ) : (
          <div className="aud-list">
            {entries.map((e) => (
              <details key={e.seq} className="aud-row">
                <summary className="aud-summary">
                  <span className="aud-time">{fmtTime(e.at)}</span>
                  <ActorCell e={e} />
                  <span className="aud-op">{OP_LABEL[e.op as TripOp["type"]] ?? e.op}</span>
                  <span className="aud-target">{e.target ?? "—"}</span>
                  <span className="aud-rev">r{e.rev}</span>
                </summary>
                <pre className="aud-detail">{prettyDetail(e.detail)}</pre>
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
