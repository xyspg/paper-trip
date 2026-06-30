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
    <div className="rcpt">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onFile}
      />

      <div className="am-head">
        <span className="am-kicker">
          <Icons.camera sw={2.6} />
          扫描收据分账
        </span>
        <button type="button" className="am-close" title="关闭" onClick={onClose}>
          <Icons.x sw={2.6} />
        </button>
      </div>

      {phase === "pick" && (
        <div className="rcpt-pick">
          <div className="rcpt-pick-ico">
            <Icons.camera sw={1.8} />
          </div>
          <div className="rcpt-pick-t">拍下餐厅小票</div>
          <div className="rcpt-pick-d">
            iOS 27 同款 AI 识别
          </div>
          <button type="button" className="pbtn solid" onClick={pickFile}>
            <Icons.camera sw={2.4} />
            拍照 / 选择照片
          </button>
        </div>
      )}

      {phase === "loading" && (
        <div className="rcpt-pick">
          <div className="rcpt-spin" />
          <div className="rcpt-pick-t">正在识别收据…</div>
          <div className="rcpt-pick-d">Claude Fable 5 is currently unavailable.</div>
        </div>
      )}

      {phase === "error" && (
        <div className="rcpt-pick">
          <div className="rcpt-pick-t">识别失败</div>
          <div className="rcpt-pick-d">{error}</div>
          <button type="button" className="pbtn solid" onClick={pickFile}>
            <Icons.camera sw={2.4} />
            重新拍照
          </button>
        </div>
      )}

      {phase === "review" && (
        <>
          <div className="rcpt-body">
            <label className="am-field am-field-wide">
              <span className="am-label">商家名称</span>
              <input
                className="am-input"
                value={merchant}
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                placeholder="餐厅名"
                onChange={(e) => setMerchant(e.target.value)}
              />
            </label>

            <div className="am-field am-field-wide">
              <span className="am-label">菜品 · 可改名/改价/增删 · 选择谁分摊（默认 AA 均摊）</span>
              <div className="rcpt-items">
                {rows.map((row) => {
                  const rowIsAA = isAA(row.who)
                  return (
                    <div className="rcpt-item" key={row.id}>
                      <div className="rcpt-item-edit">
                        <input
                          className="rcpt-qty-input"
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
                        <span className="rcpt-qty-x">×</span>
                        <input
                          className="rcpt-name-input"
                          value={row.name}
                          autoComplete="off"
                          data-1p-ignore
                          data-lpignore="true"
                          placeholder="菜名"
                          aria-label="菜名"
                          onChange={(e) => patchRow(row.id, { name: e.target.value })}
                        />
                        <span className="rcpt-price-input">
                          <span className="cur">$</span>
                          <input
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
                          className="rcpt-item-del"
                          title="删除这一项"
                          aria-label="删除这一项"
                          onClick={() => removeRow(row.id)}
                        >
                          <Icons.trash sw={2.2} />
                        </button>
                      </div>
                      <div className="rcpt-item-who">
                        {TRAVELERS.map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            className={`payer-chip${row.who.includes(m.id) ? " on" : ""}`}
                            onClick={() => toggle(row.id, m.id)}
                          >
                            <Avatar m={m} size="xs" />
                            {m.name}
                          </button>
                        ))}
                        <span className="rcpt-item-tag">
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
              <button type="button" className="rcpt-add" onClick={addRow}>
                <Icons.plus sw={2.4} />
                添加一项
              </button>
            </div>

            <div className="rcpt-extra am-field am-field-wide">
              <span className="am-label">税费 / 小费 / 服务费（按比例分摊）</span>
              <div className="rcpt-extra-row">
                <span className="cur">$</span>
                <input
                  key={`extra-${recalc}`}
                  className="am-input"
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

            <div className="am-field am-field-wide">
              <div className="rcpt-people-head">
                <span className="am-label">每人应付（可手动修改）</span>
                {hasOverride && (
                  <button type="button" className="rcpt-reset" onClick={clearOverrides}>
                    <Icons.swap sw={2.2} />
                    恢复自动
                  </button>
                )}
              </div>
              <div className="rcpt-people">
                {TRAVELERS.map((m) => (
                  <div className="rcpt-person" key={m.id}>
                    <span className="rcpt-person-who">
                      <Avatar m={m} size="xs" />
                      {m.name}
                    </span>
                    <span className={`rcpt-person-amt${manual[m.id] != null ? " edited" : ""}`}>
                      <span className="cur">$</span>
                      <input
                        key={`${m.id}-${recalc}-${round2(auto[m.id] ?? 0)}`}
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

            <div className="rcpt-totals am-field-wide">
              <div className="rcpt-trow">
                <span>菜品小计</span>
                <span className="tv">{fmtMoney(lineSubtotal)}</span>
              </div>
              <div className="rcpt-trow">
                <span>税费 / 小费</span>
                <span className="tv">{fmtMoney(extra)}</span>
              </div>
              <div className="rcpt-trow grand">
                <span>合计</span>
                <span className="tv">{fmtMoney(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="am-foot">
            <button type="button" className="pbtn dark" onClick={pickFile}>
              <Icons.camera sw={2.4} />
              重新拍照
            </button>
            <span className="sf-spacer" />
            <button type="button" className="pbtn solid" disabled={!canSubmit} onClick={submit}>
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
