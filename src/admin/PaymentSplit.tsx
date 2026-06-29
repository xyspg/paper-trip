import { fmtMoney, TRAVELERS } from "./adminData"
import type { Expense, ExpenseSplit } from "../trip/types"
import { expensePaidBy } from "../trip/expenses"
import { Avatar } from "./Avatar"

// Editor value for who fronted an expense. `single` is the default 100% case;
// `percent` / `amount` carry per-traveler weights. Kept separate from the stored
// Expense shape (payer + optional split) and converted at the edges so the UI
// can model "single" explicitly.
export type SplitValue =
  | { mode: "single"; payer: string }
  | { mode: "percent"; shares: Record<string, number> }
  | { mode: "amount"; shares: Record<string, number> }

const TRAVELER_IDS = TRAVELERS.map((m) => m.id)

export const defaultSplit = (): SplitValue => ({ mode: "single", payer: TRAVELERS[0]?.id ?? "" })

// Convert the editor value into the fields stored on an Expense. For a split we
// also stamp the largest contributor as `payer` so any code that still reads a
// single payer has a sensible fallback label.
export const splitToExpense = (v: SplitValue): { payer: string; split?: ExpenseSplit } => {
  if (v.mode === "single") return { payer: v.payer }
  let top = TRAVELER_IDS[0] ?? ""
  let topVal = -1
  for (const id of TRAVELER_IDS) {
    const val = Math.max(0, Number(v.shares[id]) || 0)
    if (val > topVal) {
      topVal = val
      top = id
    }
  }
  return { payer: top, split: { mode: v.mode, shares: v.shares } }
}

export const splitFromExpense = (e: { payer: string; split?: ExpenseSplit }): SplitValue =>
  e.split ? { mode: e.split.mode, shares: { ...e.split.shares } } : { mode: "single", payer: e.payer }

const MODES: { key: SplitValue["mode"]; label: string }[] = [
  { key: "single", label: "单人付款" },
  { key: "percent", label: "按比例 %" },
  { key: "amount", label: "按金额 $" },
]

// Even percentage seed (e.g. 50 / 50 for two travelers), remainder on the last.
const evenPercent = (): Record<string, number> => {
  const n = TRAVELER_IDS.length || 1
  const base = Math.floor(100 / n)
  const out: Record<string, number> = {}
  TRAVELER_IDS.forEach((id, i) => {
    out[id] = i === n - 1 ? 100 - base * (n - 1) : base
  })
  return out
}

const evenAmount = (amount: number): Record<string, number> => {
  const n = TRAVELER_IDS.length || 1
  const each = Math.round((amount / n) * 100) / 100
  return Object.fromEntries(TRAVELER_IDS.map((id) => [id, each]))
}

type Props = {
  value: SplitValue
  onChange: (v: SplitValue) => void
  // Net amount the split is divided over, used only for the live $ preview.
  amount: number
}

// Lets an admin record who fronted an expense: a single payer (default 100%) or
// a proportional split by percentage or dollar amount. The numbers are
// normalized, so "80 / 20" and "300 / 10" both just describe proportions.
export function PaymentSplit({ value, onChange, amount }: Props) {
  const mode = value.mode
  const shares = mode === "single" ? {} : value.shares

  const setMode = (next: SplitValue["mode"]) => {
    if (next === mode) return
    if (next === "single") {
      const payer = mode === "single" ? value.payer : splitToExpense(value).payer
      onChange({ mode: "single", payer })
      return
    }
    const seed =
      mode === "single"
        ? next === "percent"
          ? evenPercent()
          : evenAmount(amount)
        : { ...value.shares }
    onChange({ mode: next, shares: seed })
  }

  const updShare = (id: string, raw: string) => {
    if (mode === "single") return
    const n = Math.max(0, parseFloat(raw) || 0)
    onChange({ mode, shares: { ...value.shares, [id]: n } })
  }

  // Live per-traveler dollar preview via the same normalization the ledger uses.
  const preview: Expense = {
    id: "",
    cat: "misc",
    name: "",
    sub: "",
    amount,
    credit: 0,
    payer: mode === "single" ? value.payer : splitToExpense(value).payer,
    split: mode === "single" ? undefined : { mode, shares: value.shares },
  }
  const contributions = expensePaidBy(preview, TRAVELER_IDS)
  const weightSum =
    mode === "single" ? 0 : TRAVELER_IDS.reduce((s, id) => s + Math.max(0, Number(shares[id]) || 0), 0)

  return (
    <div className="psplit">
      <div className="psplit-tabs">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.key}
            className={`psplit-tab${mode === m.key ? " on" : ""}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <div className="payer-chips">
          {TRAVELERS.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`payer-chip${value.payer === m.id ? " on" : ""}`}
              onClick={() => onChange({ mode: "single", payer: m.id })}
            >
              <Avatar m={m} size="xs" />
              {m.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="psplit-rows">
          {TRAVELERS.map((m) => {
            const cur = Math.max(0, Number(shares[m.id]) || 0)
            return (
              <div className="psplit-row" key={`${m.id}-${mode}`}>
                <span className="psplit-who">
                  <Avatar m={m} size="xs" />
                  {m.name}
                </span>
                <span className="psplit-entry">
                  <input
                    key={`${m.id}-${mode}-${cur}`}
                    className="psplit-input"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step={mode === "percent" ? "1" : "0.01"}
                    defaultValue={cur || ""}
                    autoComplete="off"
                    data-1p-ignore
                    data-lpignore="true"
                    placeholder="0"
                    aria-label={`${m.name} ${mode === "percent" ? "比例" : "金额"}`}
                    onBlur={(e) => updShare(m.id, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur()
                    }}
                  />
                  <span className="psplit-unit">{mode === "percent" ? "%" : "$"}</span>
                </span>
                <span className="psplit-prev">{fmtMoney(contributions[m.id] ?? 0)}</span>
              </div>
            )
          })}
          <div className={`psplit-hint${weightSum <= 0 ? " warn" : ""}`}>
            {weightSum <= 0
              ? "请为至少一人填写分摊"
              : mode === "percent"
                ? `合计 ${weightSum}%（按比例折算）`
                : `输入合计 ${fmtMoney(weightSum)}（按比例折算到实付）`}
          </div>
        </div>
      )}
    </div>
  )
}
