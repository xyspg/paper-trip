import { useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { MessageSquarePlus, X } from "lucide-react";
import { useTrip, useTripOp } from "../trip/hooks";
import { timeAgo } from "../trip/relativeTime";
import type { TripSuggestion } from "../trip/types";

// Public-side composer: any visitor can leave a comment on a stop. No identity is
// collected; submissions land in the live trip and surface in the admin queue for
// review. Existing pending comments are shown so it doesn't feel like a void.
export function SuggestBox({
  tripId,
  itemId,
  itemTitle,
}: {
  tripId: string;
  itemId: string;
  itemTitle: string;
}) {
  const { data } = useTrip(tripId);
  const op = useTripOp(tripId);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");

  // Show this stop's live comments. Ignored ones are hidden; adopted ones stay
  // visible with an "已接受" badge so a submitter sees their suggestion landed.
  const comments = (data?.trip.suggestions ?? []).filter(
    (s) => s.itemId === itemId && s.status !== "ignored",
  );

  const submit = () => {
    const body = text.trim();
    if (!body) return;
    const suggestion: TripSuggestion = {
      id: crypto.randomUUID(),
      itemId,
      body,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    op.mutate({ type: "addSuggestion", suggestion });
    setText("");
    setOpen(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger className="appearance-none inline-flex items-center gap-1.5 py-1.5 px-3 border-2 border-ink rounded-full bg-paper-2 text-ink font-cjk text-[13px] font-bold cursor-pointer transition-[transform,translate,box-shadow,background] duration-100 ease-[ease] hover:bg-[color-mix(in_srgb,var(--color-violet)_14%,var(--color-paper-2))] hover:-translate-x-px hover:-translate-y-px hover:shadow-[3px_3px_0_var(--color-ink)] active:translate-x-0 active:translate-y-0 active:shadow-[1px_1px_0_var(--color-ink)]">
        <MessageSquarePlus size={15} strokeWidth={2.2} />
        提建议
        {comments.length > 0 && <span className="inline-grid place-items-center min-w-4.5 h-4.5 px-[5px] rounded-full bg-violet text-white font-mono text-[11px] font-bold">{comments.length}</span>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-[1000] bg-ink/38 transition-opacity duration-[180ms] ease-[ease] data-[starting-style]:opacity-0 data-[ending-style]:opacity-0" />
        <Dialog.Popup className="box-border fixed z-[1001] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(420px,calc(100vw-32px))] max-h-[calc(100vh-48px)] overflow-y-auto p-[18px] bg-paper-2 border-[3px] border-ink rounded-card shadow-hard outline-none transition-[opacity,transform,scale] duration-[180ms] ease-[ease] data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.96] data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.96]">
          <div className="flex items-center gap-2.5">
            <Dialog.Title className="flex-1 m-0 font-grotesk text-[18px] font-extrabold text-ink">提建议</Dialog.Title>
            <Dialog.Close className="appearance-none grid place-items-center w-[30px] h-[30px] border-2 border-ink rounded-lg bg-paper-2 text-ink cursor-pointer hover:bg-magenta hover:text-white" aria-label="关闭">
              <X size={16} strokeWidth={2.4} />
            </Dialog.Close>
          </div>
          <div className="mt-1 mb-3.5 font-cjk text-[13px] font-semibold text-ink-soft">{itemTitle}</div>

          {comments.length > 0 && (
            <div className="grid gap-2 mb-3.5 max-h-[180px] overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className={`flex items-baseline gap-2 py-2 px-2.5 border-2 rounded-[10px] ${c.status === "adopted" ? "border-green bg-[color-mix(in_srgb,var(--color-green)_12%,var(--color-paper))]" : "border-ink bg-paper"}`}>
                  <span className="flex-1 font-cjk text-[13px] leading-[1.4] text-ink">{c.body}</span>
                  <span className={`shrink-0 py-px px-2 border-2 border-ink rounded-full font-cjk text-[11px] font-bold leading-[1.6] ${c.status === "adopted" ? "bg-green text-white" : "bg-paper-2 text-ink-soft"}`}>
                    {c.status === "adopted" ? "已接受" : "待审"}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-ink-soft">{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="box-border w-full py-2.5 px-3 border-2 border-ink rounded-[10px] bg-paper-2 text-ink font-cjk text-[14px] leading-normal resize-y outline-none focus:shadow-[3px_3px_0_var(--color-ink)] placeholder:text-ink-soft/70"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="对这个停靠点有想法？停车、时间、备选方案都行…"
            rows={3}
          />
          <div className="flex justify-end gap-2.5 mt-3.5">
            <Dialog.Close className="appearance-none py-[9px] px-4 border-2 border-ink rounded-[10px] font-cjk text-[14px] font-bold cursor-pointer transition-[transform,translate,box-shadow] duration-100 ease-[ease] bg-paper-2 text-ink hover:not-disabled:-translate-x-px hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[3px_3px_0_var(--color-ink)] active:not-disabled:translate-x-0 active:not-disabled:translate-y-0 active:not-disabled:shadow-[1px_1px_0_var(--color-ink)] disabled:opacity-45 disabled:cursor-not-allowed">取消</Dialog.Close>
            <button className="appearance-none py-[9px] px-4 border-2 border-ink rounded-[10px] font-cjk text-[14px] font-bold cursor-pointer transition-[transform,translate,box-shadow] duration-100 ease-[ease] bg-magenta text-white hover:not-disabled:-translate-x-px hover:not-disabled:-translate-y-px hover:not-disabled:shadow-[3px_3px_0_var(--color-ink)] active:not-disabled:translate-x-0 active:not-disabled:translate-y-0 active:not-disabled:shadow-[1px_1px_0_var(--color-ink)] disabled:opacity-45 disabled:cursor-not-allowed" onClick={submit} disabled={!text.trim()}>
              发送建议
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
