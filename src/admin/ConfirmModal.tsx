import { useState } from "react";
import type { ReactNode } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { ROLE } from "baseui/modal";
import { AdminModal } from "./AdminModal";
import { Icons } from "./AdminIcons";
import { BTN, BTN_GHOST, FIELD_INPUT, ModalFooter, ModalHeader } from "./adminUi";

export type ConfirmModalProps = {
  isOpen: boolean;
  title?: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  // When set, the confirm button stays disabled until the user types this exact
  // phrase, gating extra-destructive actions (e.g. restoring the whole ledger)
  // behind a deliberate keystroke-by-keystroke acknowledgement.
  requirePhrase?: string;
  onConfirm: () => void;
  onClose: () => void;
};

// Shared destructive-action confirmation. Uses the calm AdminModal shell but with
// an alert-tinted icon header (explicit #c2553f, since the palette's magenta token
// now resolves to accent green) so deletes always read as a deliberate second tap.
export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel,
  requirePhrase,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const { t } = useLingui();
  const [typed, setTyped] = useState("");
  // Trailing/leading whitespace is forgiving; the phrase itself must match exactly.
  const phraseOk = !requirePhrase || typed.trim() === requirePhrase;

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      width="min(400px, 92vw)"
      zIndex={95}
      role={ROLE.alertdialog}
    >
      <div className="flex flex-col">
        <ModalHeader
          icon={<Icons.trash sw={2.4} />}
          title={title ?? t`确认删除`}
          onClose={onClose}
          tone="alert"
        />

        <div className="py-5 px-[18px] font-cjk text-[14px] leading-[1.6] text-[#3b3833] [&_b]:font-bold [&_b]:text-[#1c1b19]">
          {message === undefined ? <Trans>此操作无法撤销，确定继续吗？</Trans> : message}
          {requirePhrase && (
            <label className="flex flex-col gap-2 mt-4">
              <span className="font-cjk font-medium text-[13px] text-[#76726a] [&_code]:font-mono [&_code]:font-bold [&_code]:text-[12px] [&_code]:text-[#1c1b19] [&_code]:bg-[#f3f1ec] [&_code]:border [&_code]:border-[#ebe9e3] [&_code]:rounded-[6px] [&_code]:py-px [&_code]:px-1.5">
                <Trans>
                  输入 <code>{requirePhrase}</code> 以确认
                </Trans>
              </span>
              <input
                className={FIELD_INPUT}
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

        <ModalFooter>
          <button type="button" className={`${BTN} ${BTN_GHOST}`} autoFocus onClick={onClose}>
            {cancelLabel ?? <Trans>取消</Trans>}
          </button>
          <span className="ml-auto" />
          <button
            type="button"
            className={`${BTN} bg-[#c2553f] text-white border border-[#c2553f] hover:brightness-95 [&_svg]:size-3.5`}
            disabled={!phraseOk}
            onClick={onConfirm}
          >
            <Icons.trash sw={2.4} />
            {confirmLabel ?? <Trans>删除</Trans>}
          </button>
        </ModalFooter>
      </div>
    </AdminModal>
  );
}
