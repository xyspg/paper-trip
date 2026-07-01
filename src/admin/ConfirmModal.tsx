import { useState } from "react"
import type { ReactNode } from "react"
import { ROLE } from "baseui/modal"
import { AdminModal } from "./AdminModal"
import { Icons } from "./AdminIcons"
import { BTN, BTN_GHOST } from "./adminUi"

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

// Shared destructive-action confirmation. Uses the calm AdminModal shell but with
// an alert-tinted icon header (explicit #c2553f, since the palette's magenta token
// now resolves to accent green) so deletes always read as a deliberate second tap.
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
        <div className="flex items-center gap-3 py-4 px-[18px] border-b border-[#ebe9e3]">
          <span className="shrink-0 w-9 h-9 rounded-[10px] bg-[#f7e9e4] text-[#c2553f] grid place-items-center [&_svg]:size-[18px]">
            <Icons.trash sw={2.4} />
          </span>
          <span className="font-sans font-bold text-[16px] tracking-tight">{title}</span>
          <button type="button" className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border border-[#ebe9e3] bg-white text-[#76726a] cursor-pointer [&_svg]:size-[15px] hover:border-[#1c1b19] hover:text-[#1c1b19] transition-colors" title="关闭" onClick={onClose}>
            <Icons.x sw={2.6} />
          </button>
        </div>

        <div className="py-5 px-[18px] font-cjk text-[14px] leading-[1.6] text-[#3b3833] [&_b]:font-bold [&_b]:text-[#1c1b19]">
          {message}
          {requirePhrase && (
            <label className="flex flex-col gap-2 mt-4">
              <span className="font-cjk font-medium text-[13px] text-[#76726a] [&_code]:font-mono [&_code]:font-bold [&_code]:text-[12px] [&_code]:text-[#1c1b19] [&_code]:bg-[#f3f1ec] [&_code]:border [&_code]:border-[#ebe9e3] [&_code]:rounded-[6px] [&_code]:py-px [&_code]:px-1.5">
                输入 <code>{requirePhrase}</code> 以确认
              </span>
              <input
                className="font-cjk font-medium text-[14px] text-[#1c1b19] bg-white border border-[#ebe9e3] rounded-[10px] py-2.5 px-3 outline-none w-full transition-colors focus:border-[#1c1b19] placeholder:text-[#9b988f]"
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

        <div className="flex items-center gap-2.5 py-3.5 px-[18px] border-t border-[#ebe9e3] bg-[#fdfdfb]">
          <button type="button" className={`${BTN} ${BTN_GHOST}`} autoFocus onClick={onClose}>
            {cancelLabel}
          </button>
          <span className="ml-auto" />
          <button
            type="button"
            className={`${BTN} bg-[#c2553f] text-white border border-[#c2553f] hover:brightness-95 [&_svg]:size-3.5`}
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
