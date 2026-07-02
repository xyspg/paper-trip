import { fmtMoney, round2 } from "./adminData"
import type { AdminMember } from "./adminData"
import type { Expense, ExpenseSplit } from "../trip/types"
import { expensePaidBy } from "../trip/expenses"
import { Avatar } from "./Avatar"
import { CHIP_OFF, CHIP_ON } from "./adminUi"

// Editor value for who fronted an expense. `single` is the default 100% case;
// `percent` / `amount` carry per-traveler weights. Kept separate from the stored
// Expense shape (payer + optional split) and converted at the edges so the UI
// can model "single" explicitly.
export type SplitValue =
  | { mode: "single"; payer: string }
  | { mode: "percent"; shares: Record<string, number> }
  | { mode: "amount"; shares: Record<string, number> }

export const defaultSplit = (travelers: AdminMember[]): SplitValue => ({
  mode: "single",
  payer: travelers[0]?.id ?? "",
})

// Convert the editor value into the fields stored on an Expense. For a split we
// also stamp the largest contributor as `payer` so any code that still reads a
// single payer has a sensible fallback label.
export const splitToExpense = (
  v: SplitValue,
  travelerIds: string[],
): { payer: string; split?: ExpenseSplit } => {
  if (v.mode === "single") return { payer: v.payer }
  let top = travelerIds[0] ?? ""
  let topVal = -1
  for (const id of travelerIds) {
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
const evenPercent = (ids: string[]): Record<string, number> => {
  const n = ids.length || 1
  const base = Math.floor(100 / n)
  const out: Record<string, number> = {}
  ids.forEach((id, i) => {
    out[id] = i === n - 1 ? 100 - base * (n - 1) : base
  })
  return out
}

const evenAmount = (ids: string[], amount: number): Record<string, number> => {
  const n = ids.length || 1
  const each = round2(amount / n)
  return Object.fromEntries(ids.map((id) => [id, each]))
}

type Props = {
  value: SplitValue
  onChange: (v: SplitValue) => void
  // Net amount the split is divided over, used only for the live $ preview.
  amount: number
  // The trip's roster the money can be split across.
  travelers: AdminMember[]
}

// Lets an admin record who fronted an expense: a single payer (default 100%) or
// a proportional split by percentage or dollar amount. The numbers are
// normalized, so "80 / 20" and "300 / 10" both just describe proportions.
export function PaymentSplit({ value, onChange, amount, travelers }: Props) {
  const travelerIds = travelers.map((m) => m.id)
  const mode = value.mode
  const shares = mode === "single" ? {} : value.shares

  // Switching between percent and amount must re-express the same proportions in
  // the target unit, not copy the raw numbers across (a $138.25 share is not a
  // 138.25% share). Falls back to an even seed when the source has no weight.
  const reshare = (from: Record<string, number>, next: "percent" | "amount"): Record<string, number> => {
    const total = travelerIds.reduce((s, id) => s + Math.max(0, Number(from[id]) || 0), 0)
    if (total <= 0) return next === "percent" ? evenPercent(travelerIds) : evenAmount(travelerIds, amount)
    if (next === "amount") {
      // Distribute the net amount by the source proportions.
      return Object.fromEntries(
        travelerIds.map((id) => [
          id,
          round2((Math.max(0, Number(from[id]) || 0) / total) * amount),
        ]),
      )
    }
    // Percent: normalize to 100, dropping any rounding remainder on the last traveler.
    const out: Record<string, number> = {}
    let acc = 0
    travelerIds.forEach((id, i) => {
      if (i === travelerIds.length - 1) {
        out[id] = Math.max(0, 100 - acc)
      } else {
        const p = Math.round((Math.max(0, Number(from[id]) || 0) / total) * 100)
        out[id] = p
        acc += p
      }
    })
    return out
  }

  const setMode = (next: SplitValue["mode"]) => {
    if (next === mode) return
    if (next === "single") {
      const payer = mode === "single" ? value.payer : splitToExpense(value, travelerIds).payer
      onChange({ mode: "single", payer })
      return
    }
    const seed =
      mode === "single"
        ? next === "percent"
          ? evenPercent(travelerIds)
          : evenAmount(travelerIds, amount)
        : reshare(value.shares, next)
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
    payer: mode === "single" ? value.payer : splitToExpense(value, travelerIds).payer,
    split: mode === "single" ? undefined : { mode, shares: value.shares },
  }
  const contributions = expensePaidBy(preview, travelerIds)
  const weightSum =
    mode === "single" ? 0 : travelerIds.reduce((s, id) => s + Math.max(0, Number(shares[id]) || 0), 0)

  return (
    <div className="flex flex-col gap-[9px] w-full">
      <div className="inline-flex gap-[5px] flex-wrap">
        {MODES.map((m) => (
          <button
            type="button"
            key={m.key}
            className={`font-grotesk font-semibold text-[10px] tracking-[0.06em] uppercase cursor-pointer border rounded-full py-1 px-[11px] transition-colors ${mode === m.key ? CHIP_ON : CHIP_OFF}`}
            onClick={() => setMode(m.key)}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === "single" ? (
        <div className="inline-flex gap-[5px]">
          {travelers.map((m) => (
            <button
              type="button"
              key={m.id}
              className={`inline-flex items-center gap-1.5 cursor-pointer border rounded-full py-[3px] pr-2.5 pl-1 font-cjk font-semibold text-[12px] transition-colors ${value.payer === m.id ? CHIP_ON : CHIP_OFF}`}
              onClick={() => onChange({ mode: "single", payer: m.id })}
            >
              <Avatar m={m} size="xs" />
              {m.name}
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-[7px]">
          {travelers.map((m) => {
            const cur = Math.max(0, Number(shares[m.id]) || 0)
            return (
              <div className="flex items-center gap-2.5" key={`${m.id}-${mode}`}>
                <span className="inline-flex items-center gap-1.5 font-cjk font-semibold text-[12px] min-w-[92px]">
                  <Avatar m={m} size="xs" />
                  {m.name}
                </span>
                <span className="inline-flex items-center gap-[5px] border border-[#ebe9e3] rounded-[9px] bg-white py-[3px] px-[9px] focus-within:border-[#1c1b19] transition-colors">
                  <input
                    key={`${m.id}-${mode}-${cur}`}
                    className="w-[58px] border-none outline-none bg-transparent font-sans font-bold text-[13px] text-[#1c1b19] text-right [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-0"
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
                  <span className="font-grotesk font-semibold text-[12px] text-[#9b988f]">{mode === "percent" ? "%" : "$"}</span>
                </span>
                <span className="font-grotesk font-semibold text-[12px] text-[#3f6f5b] ml-auto">{fmtMoney(contributions[m.id] ?? 0)}</span>
              </div>
            )
          })}
          <div className={`font-grotesk font-semibold text-[10px] tracking-[0.04em] ${weightSum <= 0 ? "text-[#c2553f]" : "text-[#9b988f]"}`}>
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
