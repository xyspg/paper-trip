import { useAudit } from "../trip/hooks";
import type { AuditEntry } from "../trip/api";
import type { TripOp } from "../trip/ops";
import { Icons } from "./AdminIcons";
import { BTN, BTN_GHOST, SectionHead } from "./adminUi";

// Human-readable label per TripOp type, so the log reads as actions rather than
// raw op identifiers. Typed to the TripOp union so adding an op fails the build
// here until it is labeled, matching the exhaustive opTarget() switch in the worker.
const OP_LABEL: Record<TripOp["type"] | "createBackup" | "deleteBackup" | "restoreBackup", string> = {
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
  createBackup: "创建备份",
  deleteBackup: "删除备份",
  restoreBackup: "恢复备份",
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
      <span
        className="row-[1/3] w-[9px] h-[9px] rounded-full"
        style={{ background: isPublic ? "#9b988f" : "#3f6f5b" }}
      />
      <span className="font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
        {isPublic ? "访客" : e.actorLogin}
      </span>
      <span className="col-start-2 font-mono text-[10.5px] text-[#9b988f] whitespace-nowrap overflow-hidden text-ellipsis">
        {isPublic ? e.ip || "未知 IP" : e.actorEmail || `#${e.actorId ?? "?"}`}
      </span>
    </span>
  );
}

export function AuditSection() {
  const { data: entries, isLoading, isError, refetch, isFetching } = useAudit();

  return (
    <div>
      <SectionHead
        kicker="04 · Audit"
        title="操作记录"
        desc="每一次写操作的审计日志 · 记录操作人、动作、对象与时间 · 仅管理员可见"
        actions={
          <button
            className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <Icons.swap sw={2.2} />
            {isFetching ? "刷新中" : "刷新"}
          </button>
        }
      />

      <div className="mt-7">
        {isLoading ? (
          <AuditState title="加载中…" body="正在读取审计日志。" />
        ) : isError ? (
          <AuditState title="无法加载审计日志" body="请确认你已登录管理员账号后重试。" warn />
        ) : !entries || entries.length === 0 ? (
          <AuditState title="暂无记录" body="发生写操作后，记录会出现在这里。" />
        ) : (
          <div className="grid gap-2">
            {entries.map((e) => (
              <details
                key={e.seq}
                className="bg-white border border-[#ebe9e3] rounded-[12px] overflow-hidden"
              >
                <summary className="grid grid-cols-[132px_minmax(140px,1fr)_120px_minmax(0,1.2fr)_44px] items-center gap-3 px-3.5 py-[11px] cursor-pointer list-none text-[13px] hover:bg-[#fdfdfb] transition-colors [&::-webkit-details-marker]:hidden max-[720px]:grid-cols-[1fr_1fr] max-[720px]:gap-y-1.5">
                  <span className="font-mono text-[12px] text-[#76726a] whitespace-nowrap">
                    {fmtTime(e.at)}
                  </span>
                  <ActorCell e={e} />
                  <span className="font-semibold whitespace-nowrap">
                    {OP_LABEL[e.op as keyof typeof OP_LABEL] ?? e.op}
                  </span>
                  <span className="font-mono text-[11.5px] text-[#9b988f] whitespace-nowrap overflow-hidden text-ellipsis">
                    {e.target ?? "—"}
                  </span>
                  <span className="justify-self-end font-mono text-[11px] text-[#9b988f] max-[720px]:justify-self-start">
                    r{e.rev}
                  </span>
                </summary>
                <pre className="m-0 px-3.5 py-3 border-t border-dashed border-[#ebe9e3] bg-[#fdfdfb] font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap [word-break:break-word] text-[#3b3833]">
                  {prettyDetail(e.detail)}
                </pre>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AuditState({ title, body, warn }: { title: string; body: string; warn?: boolean }) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-[#ebe9e3] rounded-[14px] bg-white">
      <div
        className={`w-14 h-14 mx-auto mb-3.5 rounded-[14px] grid place-items-center [&_svg]:size-[26px] ${warn ? "bg-[#f7e9e4] text-[#c2553f]" : "bg-[#eef4f0] text-[#3f6f5b]"}`}
      >
        {warn ? <Icons.x sw={2.4} /> : <Icons.repo sw={2.2} />}
      </div>
      <div className="font-sans font-bold text-[17px]">{title}</div>
      <div className="font-cjk text-[13px] text-[#76726a] mt-2">{body}</div>
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
