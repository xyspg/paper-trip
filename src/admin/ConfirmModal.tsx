import type { ReactNode } from "react"
import { Modal, ROLE } from "baseui/modal"
import { Icons } from "./AdminIcons"

export type ConfirmModalProps = {
  isOpen: boolean
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onClose: () => void
}

// Shared destructive-action confirmation. Mirrors AddStopModal's Base Web Modal
// shell (mounted inside `.admin-app` so the neo-brutalist tokens apply) but with a
// danger-accented header so deletes always require a deliberate second tap.
export function ConfirmModal({
  isOpen,
  title = "确认删除",
  message = "此操作无法撤销，确定继续吗？",
  confirmLabel = "删除",
  cancelLabel = "取消",
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const mountNode =
    typeof document === "undefined"
      ? undefined
      : (document.querySelector(".admin-app") as HTMLElement | null) ?? undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role={ROLE.alertdialog}
      animate
      autoFocus
      mountNode={mountNode}
      overrides={{
        Root: { style: { zIndex: 95 } },
        Dialog: {
          style: {
            width: "min(400px, 92vw)",
            backgroundColor: "var(--paper-2)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            padding: "0",
            overflow: "hidden",
          },
        },
        Close: { style: { display: "none" } },
      }}
    >
      <div className="confirm-modal">
        <div className="cm-head">
          <span className="cm-kicker">
            <Icons.trash sw={2.6} />
            {title}
          </span>
          <button type="button" className="am-close" title="关闭" onClick={onClose}>
            <Icons.x sw={2.6} />
          </button>
        </div>

        <div className="cm-body">{message}</div>

        <div className="am-foot">
          <button type="button" className="pbtn dark" autoFocus onClick={onClose}>
            {cancelLabel}
          </button>
          <span className="cm-spacer" />
          <button type="button" className="pbtn danger" onClick={onConfirm}>
            <Icons.trash sw={2.4} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
