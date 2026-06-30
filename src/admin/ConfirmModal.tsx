import { useState } from "react"
import type { ReactNode } from "react"
import { ROLE } from "baseui/modal"
import { AdminModal } from "./AdminModal"
import { Icons } from "./AdminIcons"

export type ConfirmModalProps = {
  isOpen: boolean
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // When set, the confirm button stays disabled until the user types this exact
  // phrase, gating extra-destructive actions (e.g. restoring the whole ledger)
  // behind a deliberate keystroke-by-keystroke acknowledgement.
  requirePhrase?: string
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
  requirePhrase,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState("")
  // Trailing/leading whitespace is forgiving; the phrase itself must match exactly.
  const phraseOk = !requirePhrase || typed.trim() === requirePhrase

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      width="min(400px, 92vw)"
      zIndex={95}
      role={ROLE.alertdialog}
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

        <div className="cm-body">
          {message}
          {requirePhrase && (
            <label className="cm-phrase">
              <span className="cm-phrase-hint">
                输入 <code>{requirePhrase}</code> 以确认
              </span>
              <input
                className="am-input"
                type="text"
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={requirePhrase}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </label>
          )}
        </div>

        <div className="am-foot">
          <button type="button" className="pbtn dark" autoFocus onClick={onClose}>
            {cancelLabel}
          </button>
          <span className="cm-spacer" />
          <button
            type="button"
            className="pbtn danger"
            disabled={!phraseOk}
            onClick={onConfirm}
          >
            <Icons.trash sw={2.4} />
            {confirmLabel}
          </button>
        </div>
      </div>
    </AdminModal>
  )
}
