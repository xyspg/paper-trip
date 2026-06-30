import { useState } from "react"
import { Modal, ROLE } from "baseui/modal"
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
    <form className="add-modal" onSubmit={submit}>
      <div className="am-head">
        <span className="am-kicker">
          {editing ? <Icons.pencil sw={2.8} /> : <Icons.plus sw={2.8} />}
          {editing ? "编辑花销条目" : "新增花销条目"}
        </span>
        <button type="button" className="am-close" title="关闭" onClick={onClose}>
          <Icons.x sw={2.6} />
        </button>
      </div>

      <div className="am-body">
        <label className="am-field am-field-wide">
          <span className="am-label">名称</span>
          <input
            className="am-input"
            value={name}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 门票 · Anime Expo 3-day"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="am-field am-field-wide">
          <span className="am-label">明细（可选）</span>
          <input
            className="am-input"
            value={sub}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 2 人 / 3 天"
            onChange={(e) => setSub(e.target.value)}
          />
        </label>

        <label className="am-field">
          <span className="am-label">金额 (USD)</span>
          <input
            className="am-input"
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

        <div className="am-field am-field-wide">
          <span className="am-label">谁付的 · 分摊</span>
          <PaymentSplit value={split} onChange={setSplit} amount={parsed} />
        </div>

        <div className="am-field am-field-wide">
          <span className="am-label">类别</span>
          <div className="am-chips">
            {CAT_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`am-chip${cat === k ? " on" : ""}`}
                style={cssVars({ "--chip": CATS[k].color })}
                onClick={() => setCat(k)}
              >
                <span className="am-dot" />
                {CATS[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="am-foot">
        <button type="button" className="pbtn dark" onClick={onClose}>
          取消
        </button>
        <span className="sf-spacer" />
        <button type="submit" className="pbtn solid" disabled={!canSubmit}>
          {editing ? <Icons.check sw={2.6} /> : <Icons.plus sw={2.6} />}
          {editing ? "保存修改" : "添加条目"}
        </button>
      </div>
    </form>
  )
}

export function ExpenseModal({ isOpen, onClose, onSubmit, initial }: Props) {
  // Mount inside `.admin-app` so the dialog inherits the admin CSS tokens /
  // neo-brutalist styling instead of Base Web's default body portal.
  const mountNode =
    typeof document === "undefined"
      ? undefined
      : (document.querySelector(".admin-app") as HTMLElement | null) ?? undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role={ROLE.dialog}
      animate
      autoFocus
      mountNode={mountNode}
      overrides={{
        Root: { style: { zIndex: 90 } },
        Dialog: {
          style: {
            width: "min(480px, 92vw)",
            backgroundColor: "var(--paper-2)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            padding: "0",
            overflow: "hidden",
          },
        },
        Close: { style: { display: "none" } },
      }}
    >
      <Form
        key={`${initial?.id ?? "new"}-${String(isOpen)}`}
        onClose={onClose}
        onSubmit={onSubmit}
        initial={initial}
      />
    </Modal>
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
