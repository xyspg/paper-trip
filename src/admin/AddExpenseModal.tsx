import { useState } from "react"
import { AdminModal } from "./AdminModal"
import { CATS } from "./adminData"
import type { Expense, StopCat } from "./adminData"
import type { ExpenseItem, ExpenseSplit } from "../trip/types"
import { Icons } from "./AdminIcons"
import { cssVars } from "./style"
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
      <div className="flex items-center gap-3 px-[18px] py-[15px] bg-ink text-paper border-b-[3px] border-ink">
        <span className="inline-flex items-center gap-[9px] font-display font-black text-[16px] tracking-[0.02em] uppercase [&_svg]:w-4.5 [&_svg]:h-4.5">
          {editing ? <Icons.pencil sw={2.8} /> : <Icons.plus sw={2.8} />}
          {editing ? "编辑花销条目" : "新增花销条目"}
        </span>
        <button type="button" className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border-2 border-paper/30 bg-transparent text-paper cursor-pointer hover:bg-magenta hover:text-ink hover:border-paper [&_svg]:w-[15px] [&_svg]:h-[15px]" title="关闭" onClick={onClose}>
          <Icons.x sw={2.6} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-y-[15px] gap-x-[14px] p-[18px] max-[440px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">名称</span>
          <input
            className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
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
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">明细（可选）</span>
          <input
            className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
            value={sub}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 2 人 / 3 天"
            onChange={(e) => setSub(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">金额 (USD)</span>
          <input
            className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
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
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">谁付的 · 分摊</span>
          <PaymentSplit value={split} onChange={setSplit} amount={parsed} />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">类别</span>
          <div className="flex flex-wrap gap-[7px]">
            {CAT_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.04em] px-3 py-[7px] rounded-full border-2 border-ink text-ink cursor-pointer ${cat === k ? "bg-[var(--chip,var(--color-ink))] shadow-[3px_3px_0_var(--color-ink)] [&>span]:bg-ink" : "bg-paper-2"}`}
                style={cssVars({ "--chip": CATS[k].color })}
                onClick={() => setCat(k)}
              >
                <span className="w-2.5 h-2.5 rounded-[3px] border-[1.5px] border-ink bg-[var(--chip,var(--color-cyan))]" />
                {CATS[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-t-[3px] border-ink bg-paper">
        <button type="button" className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap transition-[transform,box-shadow] duration-[0.08s] ease-[ease] [&_svg]:w-3.5 [&_svg]:h-3.5 bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" onClick={onClose}>
          取消
        </button>
        <span />
        <button type="submit" className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap transition-[transform,box-shadow] duration-[0.08s] ease-[ease] [&_svg]:w-3.5 [&_svg]:h-3.5 bg-[var(--accent,var(--color-yellow))] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" disabled={!canSubmit}>
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
