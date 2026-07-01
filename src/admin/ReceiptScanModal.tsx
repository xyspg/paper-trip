import { useRef, useState } from "react"
import { AdminModal } from "./AdminModal"
import { fmtMoney, round2, TRAVELER_IDS, TRAVELERS, uid } from "./adminData"
import { Avatar } from "./Avatar"
import { Icons } from "./AdminIcons"
import { splitToExpense } from "./PaymentSplit"
import type { NewExpenseInput } from "./AddExpenseModal"
import { deriveShares, parseReceipt } from "./receipt"
import type { ExpenseItem } from "../trip/types"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: NewExpenseInput) => void
}

// One editable line in the review list. `who` is the set of travelers sharing
// this dish (empty/all = AA). The stable `id` keys the row so editing a name or
// adding/removing rows never remounts the inputs mid-keystroke. Assignment lives
// on the row itself (no parallel array), so add/delete stay trivially in sync.
type Row = { id: string; name: string; quantity: number; price: number; who: string[] }

const sumPrices = (rows: { price: number }[]) => rows.reduce((s, r) => s + r.price, 0)

// Everyone selected (or nobody, which falls back to everyone) means an even AA
// split, stored as `who: undefined` so the renderers skip redundant chips.
const isAA = (who: string[]) => who.length === 0 || who.length === TRAVELER_IDS.length

// "pick" waits for a photo, "loading" is the OCR round-trip, "review" is the
// editable split, "error" shows a retry. One inner component per open keeps the
// state fresh without effects (the parent remounts it via a key).
type Phase = "pick" | "loading" | "review" | "error"

function Scanner({ onClose, onSubmit }: Omit<Props, "isOpen">) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("pick")
  const [error, setError] = useState("")

  const [merchant, setMerchant] = useState("")
  const [rows, setRows] = useState<Row[]>([])
  // Tax + tip + any gap between the line items and the printed total, applied on
  // top of the per-dish split and spread proportionally.
  const [extra, setExtra] = useState(0)
  // Manual per-traveler overrides; absent id = use the computed amount.
  const [manual, setManual] = useState<Record<string, number>>({})
  // Bumped on "recompute" so the uncontrolled amount inputs remount fresh.
  const [recalc, setRecalc] = useState(0)

  const pickFile = () => fileRef.current?.click()

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-picking the same file
    if (!file) return
    setPhase("loading")
    setError("")
    try {
      const r = await parseReceipt(file)
      // Clamp to >= 0: this row is tax/tip/service fee, never negative. A model
      // misread where the printed total comes in under the line-item sum would
      // otherwise yield a negative "tax" and an amount below the dishes shown.
      const gap = typeof r.total === "number"
        ? Math.max(0, r.total - sumPrices(r.items))
        : (r.tax ?? 0) + (r.tip ?? 0)
      setMerchant(r.merchant || "餐厅收据")
      setRows(
        r.items.map((it) => ({
          id: uid("ri"),
          name: it.name,
          quantity: it.quantity,
          price: it.price,
          who: [...TRAVELER_IDS], // default AA
        })),
      )
      setExtra(round2(gap))
      setManual({})
      setPhase("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败，请重试")
      setPhase("error")
    }
  }

  const toggle = (id: string, who: string) =>
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row
        const next = row.who.includes(who)
          ? row.who.filter((x) => x !== who)
          : [...row.who, who]
        return { ...row, who: next }
      }),
    )

  const patchRow = (id: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  const removeRow = (id: string) => setRows((prev) => prev.filter((row) => row.id !== id))

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { id: uid("ri"), name: "", quantity: 1, price: 0, who: [...TRAVELER_IDS] },
    ])

  const auto = deriveShares(rows, TRAVELER_IDS, extra)
  const finalOf = (id: string) => manual[id] ?? auto[id] ?? 0
  const grandTotal = round2(TRAVELER_IDS.reduce((s, id) => s + finalOf(id), 0))
  const lineSubtotal = round2(sumPrices(rows))
  const hasOverride = Object.keys(manual).length > 0

  const setManualAmount = (id: string, raw: string) => {
    const n = parseFloat(raw)
    if (!Number.isFinite(n) || n < 0) {
      // Blank/invalid/negative: drop any override and bump `recalc` so the
      // uncontrolled input remounts showing the auto amount. Without the remount
      // the box stays visually blank while grandTotal and submit still count and
      // charge the auto value, so the displayed number diverges from the saved one.
      setManual((prev) => {
        if (prev[id] == null) return prev
        const next = { ...prev }
        delete next[id]
        return next
      })
      setRecalc((k) => k + 1)
      return
    }
    setManual((prev) => ({ ...prev, [id]: round2(n) }))
  }

  const clearOverrides = () => {
    setManual({})
    setRecalc((n) => n + 1)
  }

  // Drop blank scratch rows (no name, no price) before persisting / counting.
  const cleanRows = rows.filter((r) => r.name.trim() !== "" || r.price > 0)
  const canSubmit = cleanRows.length > 0 && grandTotal > 0

  const submit = () => {
    if (!canSubmit) return
    const shares = Object.fromEntries(TRAVELER_IDS.map((id) => [id, finalOf(id)]))
    const { payer, split } = splitToExpense({ mode: "amount", shares })
    const items: ExpenseItem[] = cleanRows.map((r) => {
      const who = r.who.filter((id) => TRAVELER_IDS.includes(id))
      return {
        name: r.name.trim() || "未命名",
        quantity: r.quantity,
        price: round2(r.price),
        who: isAA(who) ? undefined : who,
      }
    })
    onSubmit({
      name: merchant.trim() || "餐厅收据",
      sub: `${items.length} 项 · 扫描收据`,
      amount: grandTotal,
      cat: "food",
      payer,
      split,
      items,
    })
  }

  return (
    <div className="flex flex-col max-h-[88vh]">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />

      <div className="flex items-center gap-3 px-[18px] py-[15px] bg-ink text-paper border-b-[3px] border-ink">
        <span className="inline-flex items-center gap-[9px] font-display font-black text-base tracking-[0.02em] uppercase [&_svg]:size-[18px]">
          <Icons.camera sw={2.6} />
          扫描收据分账
        </span>
        <button type="button" className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border-2 border-paper/30 bg-transparent text-paper cursor-pointer hover:bg-magenta hover:text-ink hover:border-paper [&_svg]:size-[15px]" title="关闭" onClick={onClose}>
          <Icons.x sw={2.6} />
        </button>
      </div>

      {phase === "pick" && (
        <div className="flex flex-col items-center text-center gap-3 px-7 py-10">
          <div className="w-16 h-16 grid place-items-center rounded-card border-[3px] border-ink bg-yellow shadow-[3px_3px_0_var(--color-ink)] [&_svg]:size-[34px] [&_svg]:text-ink">
            <Icons.camera sw={1.8} />
          </div>
          <div className="font-display font-black text-[19px] text-ink">拍下餐厅小票</div>
          <div className="font-cjk font-semibold text-[13px] leading-[1.6] text-ink-soft max-w-[320px]">
            iOS 27 同款 AI 识别
          </div>
          <button type="button" className="mt-1.5 inline-flex items-center gap-[7px] font-grotesk font-extrabold text-xs tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap transition-[transform,box-shadow] duration-[80ms] ease-[ease] [&_svg]:size-[14px] bg-[var(--accent,var(--color-yellow))] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" onClick={pickFile}>
            <Icons.camera sw={2.4} />
            拍照 / 选择照片
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="flex flex-col items-center text-center gap-3 px-7 py-10">
          <div className="w-[38px] h-[38px] border-4 border-ink border-t-transparent rounded-full animate-[spin_0.8s_linear_infinite]" />
          <div className="font-display font-black text-[19px] text-ink">正在识别收据…</div>
          <div className="font-cjk font-semibold text-[13px] leading-[1.6] text-ink-soft max-w-[320px]">Claude Fable 5 is currently unavailable.</div>
        </div>
      )}

      {phase === "error" && (
        <div className="flex flex-col items-center text-center gap-3 px-7 py-10">
          <div className="font-display font-black text-[19px] text-ink">识别失败</div>
          <div className="font-cjk font-semibold text-[13px] leading-[1.6] text-ink-soft max-w-[320px]">{error}</div>
          <button type="button" className="mt-1.5 inline-flex items-center gap-[7px] font-grotesk font-extrabold text-xs tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap transition-[transform,box-shadow] duration-[80ms] ease-[ease] [&_svg]:size-[14px] bg-[var(--accent,var(--color-yellow))] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" onClick={pickFile}>
            <Icons.camera sw={2.4} />
            重新拍照
          </button>
        </div>
      )}

      {phase === "review" && (
        <>
          <div className="flex flex-col gap-4 p-[18px] overflow-y-auto">
            <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">商家名称</span>
              <input
                className="font-cjk font-bold text-sm text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
                value={merchant}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                placeholder="餐厅名"
                onChange={(e) => setMerchant(e.target.value)}
              />
            </label>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">菜品 · 可改名/改价/增删 · 选择谁分摊（默认 AA 均摊）</span>
              <div className="flex flex-col gap-[9px]">
                {rows.map((row) => {
                  const rowIsAA = isAA(row.who)
                  return (
                    <div className="border-2 border-ink rounded-xl bg-paper shadow-[3px_3px_0_var(--color-ink)] px-3 py-2.5" key={row.id}>
                      <div className="flex items-center gap-[7px]">
                        <input
                          className="w-[38px] shrink-0 px-[3px] py-[5px] border-2 border-ink rounded-lg bg-paper font-grotesk font-extrabold text-[13px] text-center text-ink [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                          type="number"
                          inputMode="numeric"
                          min="1"
                          step="1"
                          defaultValue={row.quantity}
                          aria-label="数量"
                          onBlur={(e) => {
                            const n = parseInt(e.target.value, 10)
                            patchRow(row.id, { quantity: Number.isFinite(n) && n > 0 ? n : 1 })
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur()
                          }}
                        />
                        <span className="shrink-0 -ml-[3px] font-black text-magenta">×</span>
                        <input
                          className="flex-1 min-w-0 px-[9px] py-1.5 border-2 border-ink rounded-lg bg-paper font-cjk font-bold text-sm text-ink"
                          value={row.name}
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          placeholder="菜名"
                          aria-label="菜名"
                          onChange={(e) => patchRow(row.id, { name: e.target.value })}
                        />
                        <span className="inline-flex items-center gap-[2px] shrink-0 w-[92px] px-2 py-[5px] border-2 border-ink rounded-lg bg-paper">
                          <span className="font-grotesk font-extrabold text-ink-soft">$</span>
                          <input
                            className="w-full border-none bg-transparent outline-none font-grotesk font-extrabold text-sm text-ink text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                            type="number"
                            inputMode="decimal"
                            step="0.01"
                            min="0"
                            defaultValue={row.price || ""}
                            aria-label="价格"
                            placeholder="0.00"
                            onBlur={(e) => {
                              const n = parseFloat(e.target.value)
                              patchRow(row.id, { price: Number.isFinite(n) && n >= 0 ? round2(n) : 0 })
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") e.currentTarget.blur()
                            }}
                          />
                        </span>
                        <button
                          type="button"
                          className="grid place-items-center shrink-0 w-[30px] h-[30px] border-2 border-ink rounded-lg bg-paper-2 text-red cursor-pointer [&_svg]:size-[15px]"
                          title="删除这一项"
                          aria-label="删除这一项"
                          onClick={() => removeRow(row.id)}
                        >
                          <Icons.trash sw={2.2} />
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 mt-[9px]">
                        {TRAVELERS.map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            className={`inline-flex items-center gap-1.5 cursor-pointer border-2 border-ink rounded-full py-[3px] pr-2.5 pl-1 font-cjk font-bold text-xs ${row.who.includes(m.id) ? "bg-ink text-paper" : "bg-paper-2"}`}
                            onClick={() => toggle(row.id, m.id)}
                          >
                            <Avatar m={m} size="xs" />
                            {m.name}
                          </button>
                        ))}
                        <span className="ml-auto font-grotesk font-extrabold text-[10px] tracking-[0.06em] uppercase text-ink-soft">
                          {row.who.length === 0
                            ? "未选 → 全员"
                            : rowIsAA
                              ? "AA 均摊"
                              : `${row.who.length} 人分`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
              <button type="button" className="inline-flex items-center gap-1.5 mt-[9px] px-3 py-[7px] border-2 border-dashed border-ink rounded-[10px] bg-paper font-grotesk font-extrabold text-xs text-ink cursor-pointer [&_svg]:size-[15px]" onClick={addRow}>
                <Icons.plus sw={2.4} />
                添加一项
              </button>
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">税费 / 小费 / 服务费（按比例分摊）</span>
              <div className="inline-flex items-center gap-1 max-w-[180px]">
                <span className="font-grotesk font-extrabold text-ink-soft">$</span>
                <input
                  key={`extra-${recalc}`}
                  className="font-cjk font-bold text-sm text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  defaultValue={extra || ""}
                  autoComplete="off"
                  data-1p-ignore
                  data-lpignore="true"
                  placeholder="0.00"
                  onBlur={(e) => {
                    const n = parseFloat(e.target.value)
                    setExtra(Number.isFinite(n) ? Math.max(0, round2(n)) : 0)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur()
                  }}
                />
              </div>
            </div>

            <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
              <div className="flex items-center justify-between gap-2.5 mb-2">
                <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">每人应付（可手动修改）</span>
                {hasOverride && (
                  <button type="button" className="inline-flex items-center gap-[5px] border-2 border-ink rounded-full bg-paper-2 px-2.5 py-[3px] font-grotesk font-extrabold text-[11px] cursor-pointer text-ink [&_svg]:size-[13px]" onClick={clearOverrides}>
                    <Icons.swap sw={2.2} />
                    恢复自动
                  </button>
                )}
              </div>
              <div className="flex flex-col gap-2">
                {TRAVELERS.map((m) => (
                  <div className="flex items-center justify-between gap-2.5 px-3 py-2 border-2 border-ink rounded-xl bg-paper" key={m.id}>
                    <span className="inline-flex items-center gap-2 font-cjk font-bold text-sm text-ink">
                      <Avatar m={m} size="xs" />
                      {m.name}
                    </span>
                    <span className={`inline-flex items-center gap-[3px] border-2 border-ink rounded-[10px] px-2.5 py-[5px] shadow-[3px_3px_0_var(--color-ink)] ${manual[m.id] != null ? "bg-[color-mix(in_srgb,var(--color-cyan)_22%,var(--color-paper-2))]" : "bg-paper-2"}`}>
                      <span className="font-grotesk font-extrabold text-[13px] text-ink-soft">$</span>
                      <input
                        key={`${m.id}-${recalc}-${round2(auto[m.id] ?? 0)}`}
                        className="w-[74px] border-none bg-transparent outline-none font-grotesk font-extrabold text-[15px] text-ink text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        defaultValue={round2(finalOf(m.id))}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        aria-label={`${m.name} 应付`}
                        onBlur={(e) => setManualAmount(m.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur()
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-[5px] px-3.5 py-3 border-2 border-ink rounded-xl bg-paper-2 col-span-full">
              <div className="flex items-center justify-between font-cjk font-bold text-[13px] text-ink-soft">
                <span>菜品小计</span>
                <span className="font-grotesk font-extrabold">{fmtMoney(lineSubtotal)}</span>
              </div>
              <div className="flex items-center justify-between font-cjk font-bold text-[13px] text-ink-soft">
                <span>税费 / 小费</span>
                <span className="font-grotesk font-extrabold">{fmtMoney(extra)}</span>
              </div>
              <div className="flex items-center justify-between font-cjk font-bold text-base text-ink mt-1 pt-2 border-t-2 border-dashed border-ink">
                <span>合计</span>
                <span className="font-grotesk font-black">{fmtMoney(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-t-[3px] border-ink bg-paper">
            <button type="button" className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-xs tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap transition-[transform,box-shadow] duration-[80ms] ease-[ease] [&_svg]:size-[14px] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" onClick={pickFile}>
              <Icons.camera sw={2.4} />
              重新拍照
            </button>
            <span />
            <button type="button" className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-xs tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap transition-[transform,box-shadow] duration-[80ms] ease-[ease] [&_svg]:size-[14px] bg-[var(--accent,var(--color-yellow))] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]" disabled={!canSubmit} onClick={submit}>
              <Icons.plus sw={2.6} />
              添加为花销
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export function ReceiptScanModal({ isOpen, onClose, onSubmit }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose} width="min(520px, 94vw)" autoFocus={false}>
      <Scanner key={String(isOpen)} onClose={onClose} onSubmit={onSubmit} />
    </AdminModal>
  )
}
