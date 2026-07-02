import { useState } from "react"
import { AdminModal } from "./AdminModal"
import type { Expense, StopCat } from "./adminData"
import type { ExpenseItem, ExpenseSplit } from "../trip/types"
import { Icons } from "./AdminIcons"
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  CategoryChips,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "./adminUi"
import { PaymentSplit, defaultSplit, splitFromExpense, splitToExpense } from "./PaymentSplit"
import type { SplitValue } from "./PaymentSplit"
import { useAdmin } from "./AdminContext"

export type NewExpenseInput = {
  name: string
  sub: string
  amount: number
  cat: StopCat
  payer: string
  split?: ExpenseSplit
  // Scanned-receipt breakdown, set only by the receipt scanner. The manual
  // add/edit form below never produces items.
  items?: ExpenseItem[]
}

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: NewExpenseInput) => void
  // When set the modal opens in edit mode, pre-filled from the expense.
  initial?: Expense | null
}

// Reset the form whenever the modal (re)opens or targets a different expense by
// keying the parent; this inner component always starts from fresh defaults.
function Form({ onClose, onSubmit, initial }: Omit<Props, "isOpen">) {
  const { travelers } = useAdmin()
  const editing = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [sub, setSub] = useState(initial?.sub ?? "")
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "")
  const [cat, setCat] = useState<StopCat>(initial?.cat ?? "event")
  const [split, setSplit] = useState<SplitValue>(() =>
    initial ? splitFromExpense(initial) : defaultSplit(travelers),
  )

  const parsed = Math.max(0, parseFloat(amount) || 0)
  const canSubmit = name.trim().length > 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const { payer, split: splitField } = splitToExpense(
      split,
      travelers.map((m) => m.id),
    )
    onSubmit({ name: name.trim(), sub: sub.trim(), amount: parsed, cat, payer, split: splitField })
  }

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <ModalHeader
        icon={editing ? <Icons.pencil sw={2.6} /> : <Icons.plus sw={2.6} />}
        title={editing ? "编辑花销条目" : "新增花销条目"}
        onClose={onClose}
      />

      <div className="grid grid-cols-2 gap-y-[15px] gap-x-[14px] p-[18px] max-[440px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>名称</span>
          <input
            className={FIELD_INPUT}
            value={name}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 门票 · Anime Expo 3-day"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>明细（可选）</span>
          <input
            className={FIELD_INPUT}
            value={sub}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 2 人 / 3 天"
            onChange={(e) => setSub(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>金额 (USD)</span>
          <input
            className={FIELD_INPUT}
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="0.00"
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>谁付的 · 分摊</span>
          <PaymentSplit value={split} onChange={setSplit} amount={parsed} travelers={travelers} />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>类别</span>
          <CategoryChips value={cat} onChange={setCat} />
        </div>
      </div>

      <ModalFooter>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button type="submit" className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`} disabled={!canSubmit}>
          {editing ? <Icons.check sw={2.6} /> : <Icons.plus sw={2.6} />}
          {editing ? "保存修改" : "添加条目"}
        </button>
      </ModalFooter>
    </form>
  )
}

export function ExpenseModal({ isOpen, onClose, onSubmit, initial }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose}>
      <Form
        key={`${initial?.id ?? "new"}-${String(isOpen)}`}
        onClose={onClose}
        onSubmit={onSubmit}
        initial={initial}
      />
    </AdminModal>
  )
}

export function buildExpense(input: NewExpenseInput, id: string): Expense {
  return {
    id,
    cat: input.cat,
    name: input.name,
    sub: input.sub,
    amount: input.amount,
    credit: 0,
    payer: input.payer,
    split: input.split,
    items: input.items,
  }
}
