import type { ReactNode } from "react"
import { Modal, ROLE } from "baseui/modal"

type Role = (typeof ROLE)[keyof typeof ROLE]

type Props = {
  isOpen: boolean
  onClose: () => void
  // Dialog width varies per modal (the receipt scanner is the widest).
  width?: string
  // Stacking order; the destructive-confirm sits above the form modals.
  zIndex?: number
  // alertdialog for destructive confirmations, dialog otherwise.
  role?: Role
  // The receipt scanner manages its own focus, so it opts out.
  autoFocus?: boolean
  children: ReactNode
}

// Shared Base Web Modal shell for every admin dialog: calm editorial chrome
// (hairline border, soft lift shadow, no padding), the built-in close button
// hidden in favor of each body's own header X, and the `.admin-app` scope so the
// design tokens resolve. Each modal renders only its body as children.
export function AdminModal({
  isOpen,
  onClose,
  width = "min(480px, 92vw)",
  zIndex = 90,
  role = ROLE.dialog,
  autoFocus = true,
  children,
}: Props) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role={role}
      animate
      autoFocus={autoFocus}
      overrides={{
        Root: { style: { zIndex } },
        Dialog: {
          style: {
            width,
            backgroundColor: "var(--color-paper-2)",
            border: "1px solid var(--color-line)",
            borderRadius: "16px",
            boxShadow: "0 24px 60px -20px rgba(20, 20, 30, 0.35)",
            padding: "0",
            overflow: "hidden",
          },
        },
        Close: { style: { display: "none" } },
      }}
    >
      <div className="admin-app text-ink font-grotesk leading-normal min-h-0! [background:transparent]!">
        {children}
      </div>
    </Modal>
  )
}
