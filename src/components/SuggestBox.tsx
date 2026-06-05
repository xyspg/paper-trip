import { useState } from "react";
import { Dialog } from "@base-ui-components/react/dialog";
import { MessageSquarePlus, X } from "lucide-react";
import { useTrip, useTripOp } from "../trip/hooks";
import { timeAgo } from "../trip/relativeTime";
import type { TripSuggestion } from "../trip/types";

// Public-side composer: any visitor can leave a comment on a stop. No identity is
// collected; submissions land in the live trip and surface in the admin queue for
// review. Existing pending comments are shown so it doesn't feel like a void.
export function SuggestBox({ itemId, itemTitle }: { itemId: string; itemTitle: string }) {
  const { data } = useTrip();
  const op = useTripOp();
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
      <Dialog.Trigger className="suggest-trigger">
        <MessageSquarePlus size={15} strokeWidth={2.2} />
        提建议
        {comments.length > 0 && <span className="suggest-count">{comments.length}</span>}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="suggest-backdrop" />
        <Dialog.Popup className="suggest-pop">
          <div className="suggest-pop-head">
            <Dialog.Title className="suggest-pop-title">提建议</Dialog.Title>
            <Dialog.Close className="suggest-pop-x" aria-label="关闭">
              <X size={16} strokeWidth={2.4} />
            </Dialog.Close>
          </div>
          <div className="suggest-pop-sub">{itemTitle}</div>

          {comments.length > 0 && (
            <div className="suggest-list">
              {comments.map((c) => (
                <div key={c.id} className={`suggest-item${c.status === "adopted" ? " adopted" : ""}`}>
                  <span className="suggest-item-body">{c.body}</span>
                  <span className={`suggest-item-tag ${c.status}`}>
                    {c.status === "adopted" ? "已接受" : "待审"}
                  </span>
                  <span className="suggest-item-when">{timeAgo(c.createdAt)}</span>
                </div>
              ))}
            </div>
          )}

          <textarea
            className="suggest-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="对这个停靠点有想法？停车、时间、备选方案都行…"
            rows={3}
          />
          <div className="suggest-pop-foot">
            <Dialog.Close className="suggest-btn ghost">取消</Dialog.Close>
            <button className="suggest-btn solid" onClick={submit} disabled={!text.trim()}>
              发送建议
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
