import { useCallback, useState } from "react"
import type { ReactNode } from "react"
import { ConfirmModal } from "./ConfirmModal"

type ConfirmOptions = {
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
}

type Pending = { opts: ConfirmOptions; resolve: (ok: boolean) => void }

// Promise-based confirmation: call `await confirm({...})` inside any handler and
// render `confirmModal` once in the component. Resolves true on confirm, false on
// cancel/dismiss, so a delete only runs after a deliberate second tap.
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions = {}) =>
      new Promise<boolean>((resolve) => setPending({ opts, resolve })),
    [],
  )

  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  const confirmModal = (
    <ConfirmModal
      isOpen={pending !== null}
      title={pending?.opts.title}
      message={pending?.opts.message}
      confirmLabel={pending?.opts.confirmLabel}
      cancelLabel={pending?.opts.cancelLabel}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    />
  )

  return { confirm, confirmModal }
}
