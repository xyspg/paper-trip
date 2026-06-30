import { useCallback, useState } from "react"
import type { ReactNode } from "react"
import { ConfirmModal } from "./ConfirmModal"

type ConfirmOptions = {
  title?: string
  message?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // Gate the confirm button behind typing this exact phrase (type-to-confirm).
  requirePhrase?: string
}

type Pending = { id: number; opts: ConfirmOptions; resolve: (ok: boolean) => void }

// Promise-based confirmation: call `await confirm({...})` inside any handler and
// render `confirmModal` once in the component. Resolves true on confirm, false on
// cancel/dismiss, so a delete only runs after a deliberate second tap.
export function useConfirm() {
  const [pending, setPending] = useState<Pending | null>(null)

  const confirm = useCallback(
    (opts: ConfirmOptions = {}) =>
      new Promise<boolean>((resolve) =>
        // Bump the id each call so the modal remounts with a cleared type-to-confirm
        // input instead of reusing the previously typed phrase.
        setPending((prev) => ({ id: (prev?.id ?? 0) + 1, opts, resolve })),
      ),
    [],
  )

  const settle = (ok: boolean) => {
    pending?.resolve(ok)
    setPending(null)
  }

  const confirmModal = (
    <ConfirmModal
      key={pending?.id}
      isOpen={pending !== null}
      title={pending?.opts.title}
      message={pending?.opts.message}
      confirmLabel={pending?.opts.confirmLabel}
      cancelLabel={pending?.opts.cancelLabel}
      requirePhrase={pending?.opts.requirePhrase}
      onConfirm={() => settle(true)}
      onClose={() => settle(false)}
    />
  )

  return { confirm, confirmModal }
}
