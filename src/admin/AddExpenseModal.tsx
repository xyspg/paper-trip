import { useState } from "react"
import { AdminModal } from "./AdminModal"
import { CATS } from "./adminData"
import type { Expense, StopCat } from "./adminData"
import type { ExpenseItem, ExpenseSplit } from "../trip/types"
import { Icons } from "./AdminIcons"
import { BTN, BTN_GHOST, BTN_INK, FIELD_INPUT, FIELD_LABEL } from "./adminUi"
import { PaymentSplit, defaultSplit, splitFromExpense, splitToExpense } from "./PaymentSplit"
import type { SplitValue } from "./PaymentSplit"

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

const CAT_KEYS = Object.keys(CATS) as StopCat[]

// Reset the form whenever the modal (re)opens or targets a different expense by
// keying the parent; this inner component always starts from fresh defaults.
function Form({ onClose, onSubmit, initial }: Omit<Props, "isOpen">) {
  const editing = Boolean(initial)
  const [name, setName] = useState(initial?.name ?? "")
  const [sub, setSub] = useState(initial?.sub ?? "")
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "")
  const [cat, setCat] = useState<StopCat>(initial?.cat ?? "event")
  const [split, setSplit] = useState<SplitValue>(initial ? splitFromExpense(initial) : defaultSplit)

  const parsed = Math.max(0, parseFloat(amount) || 0)
  const canSubmit = name.trim().length > 0

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit) return
    const { payer, split: splitField } = splitToExpense(split)
    onSubmit({ name: name.trim(), sub: sub.trim(), amount: parsed, cat, payer, split: splitField })
  }

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <div className="flex items-center gap-3 px-[18px] py-4 border-b border-[#ebe9e3]">
        <span className="shrink-0 w-9 h-9 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] grid place-items-center [&_svg]:size-[17px]">
          {editing ? <Icons.pencil sw={2.6} /> : <Icons.plus sw={2.6} />}
        </span>
        <span className="font-sans font-bold text-[16px] tracking-tight">
          {editing ? "编辑花销条目" : "新增花销条目"}
        </span>
        <button type="button" className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border border-[#ebe9e3] bg-white text-[#76726a] cursor-pointer [&_svg]:size-[15px] hover:border-[#1c1b19] hover:text-[#1c1b19] transition-colors" title="关闭" onClick={onClose}>
          <Icons.x sw={2.6} />
        </button>
      </div>

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
          <PaymentSplit value={split} onChange={setSplit} amount={parsed} />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>类别</span>
          <div className="flex flex-wrap gap-[7px]">
            {CAT_KEYS.map((k) => {
              const on = cat === k
              return (
                <button
                  type="button"
                  key={k}
                  className={`inline-flex items-center gap-2 font-grotesk font-semibold text-[11px] tracking-[0.03em] px-3 py-[7px] rounded-full border transition-colors ${on ? "text-white" : "bg-white text-[#3b3833] border-[#ebe9e3] hover:border-[#1c1b19]"}`}
                  style={on ? { background: CATS[k].color, borderColor: CATS[k].color } : undefined}
                  onClick={() => setCat(k)}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: on ? "rgba(255,255,255,0.85)" : CATS[k].color }}
                  />
                  {CATS[k].label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-t border-[#ebe9e3] bg-[#fdfdfb]">
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button type="submit" className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`} disabled={!canSubmit}>
          {editing ? <Icons.check sw={2.6} /> : <Icons.plus sw={2.6} />}
          {editing ? "保存修改" : "添加条目"}
        </button>
      </div>
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
