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
      <div className="flex flex-col">
        <div className="flex items-center gap-3 py-[15px] px-[18px] bg-magenta text-ink border-b-[3px] border-ink">
          <span className="inline-flex items-center gap-[9px] font-display font-black text-[16px] tracking-[0.02em] uppercase [&_svg]:size-[18px]">
            <Icons.trash sw={2.6} />
            {title}
          </span>
          <button type="button" className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border-2 border-ink/30 bg-transparent text-ink cursor-pointer [&_svg]:size-[15px] hover:bg-ink hover:text-paper hover:border-ink" title="关闭" onClick={onClose}>
            <Icons.x sw={2.6} />
          </button>
        </div>

        <div className="py-5 px-[18px] font-cjk font-semibold text-[14px] leading-[1.6] text-ink [&_b]:font-black">
          {message}
          {requirePhrase && (
            <label className="flex flex-col gap-2 mt-4">
              <span className="font-cjk font-bold text-[13px] text-ink-soft [&_code]:font-mono [&_code]:font-extrabold [&_code]:text-[12px] [&_code]:text-ink [&_code]:bg-paper [&_code]:border-2 [&_code]:border-ink [&_code]:rounded-[6px] [&_code]:py-px [&_code]:px-1.5">
                输入 <code>{requirePhrase}</code> 以确认
              </span>
              <input
                className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] py-2.5 px-3 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
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

        <div className="flex items-center gap-2.5 py-3.5 px-[18px] border-t-[3px] border-ink bg-paper">
          <button
            type="button"
            className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:size-[14px] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)]"
            autoFocus
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <span className="ml-auto" />
          <button
            type="button"
            className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-magenta cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:size-[14px] bg-paper-2 text-magenta hover:bg-magenta hover:text-paper disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]"
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
