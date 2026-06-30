import { useRef, useState } from "react"
import { Modal, ROLE } from "baseui/modal"
import { fmtMoney, TRAVELERS } from "./adminData"
import { Avatar } from "./Avatar"
import { Icons } from "./AdminIcons"
import { splitToExpense } from "./PaymentSplit"
import type { NewExpenseInput } from "./AddExpenseModal"
import { deriveShares, parseReceipt } from "./receipt"
import type { ReceiptItem } from "./receipt"

type Props = {
  isOpen: boolean
  onClose: () => void
  onSubmit: (input: NewExpenseInput) => void
}

const TRAVELER_IDS = TRAVELERS.map((m) => m.id)

const round2 = (n: number) => Math.round(n * 100) / 100
const sumPrices = (items: ReceiptItem[]) => items.reduce((s, it) => s + it.price, 0)

// "pick" waits for a photo, "loading" is the OCR round-trip, "review" is the
// editable split, "error" shows a retry. One inner component per open keeps the
// state fresh without effects (the parent remounts it via a key).
type Phase = "pick" | "loading" | "review" | "error"

function Scanner({ onClose, onSubmit }: Omit<Props, "isOpen">) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [phase, setPhase] = useState<Phase>("pick")
  const [error, setError] = useState("")

  const [merchant, setMerchant] = useState("")
  const [items, setItems] = useState<ReceiptItem[]>([])
  // Tax + tip + any gap between the line items and the printed total, applied on
  // top of the per-dish split and spread proportionally.
  const [extra, setExtra] = useState(0)
  // Per-dish assignment: which travelers share each row (equal split among them).
  const [assign, setAssign] = useState<string[][]>([])
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
      const gap = typeof r.total === "number" ? r.total - sumPrices(r.items) : (r.tax ?? 0) + (r.tip ?? 0)
      setMerchant(r.merchant || "餐厅收据")
      setItems(r.items)
      setExtra(round2(gap))
      setAssign(r.items.map(() => [...TRAVELER_IDS])) // default AA
      setManual({})
      setPhase("review")
    } catch (err) {
      setError(err instanceof Error ? err.message : "识别失败，请重试")
      setPhase("error")
    }
  }

  const toggle = (idx: number, id: string) =>
    setAssign((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row
        return row.includes(id) ? row.filter((x) => x !== id) : [...row, id]
      }),
    )

  const auto = deriveShares(items, assign, TRAVELER_IDS, extra)
  const finalOf = (id: string) => manual[id] ?? auto[id] ?? 0
  const grandTotal = round2(TRAVELER_IDS.reduce((s, id) => s + finalOf(id), 0))
  const lineSubtotal = round2(sumPrices(items))
  const hasOverride = Object.keys(manual).length > 0

  const setManualAmount = (id: string, raw: string) => {
    const n = parseFloat(raw)
    setManual((prev) => {
      const next = { ...prev }
      if (!Number.isFinite(n) || n < 0) delete next[id]
      else next[id] = round2(n)
      return next
    })
  }

  const clearOverrides = () => {
    setManual({})
    setRecalc((n) => n + 1)
  }

  const canSubmit = items.length > 0 && grandTotal > 0

  const submit = () => {
    if (!canSubmit) return
    const shares = Object.fromEntries(TRAVELER_IDS.map((id) => [id, finalOf(id)]))
    const { payer, split } = splitToExpense({ mode: "amount", shares })
    onSubmit({
      name: merchant.trim() || "餐厅收据",
      sub: `${items.length} 项 · 扫描收据`,
      amount: grandTotal,
      cat: "food",
      payer,
      split,
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
              <span className="am-label">菜品 · 选择谁分摊（默认 AA 均摊）</span>
              <div className="rcpt-items">
                {items.map((it, i) => {
                  const picked = assign[i] ?? []
                  const isAA = picked.length === TRAVELER_IDS.length
                  return (
                    <div className="rcpt-item" key={`${it.name}-${i}`}>
                      <div className="rcpt-item-top">
                        <span className="rcpt-item-name">
                          {it.quantity > 1 && <b className="rcpt-qty">{it.quantity}×</b>}
                          {it.name}
                        </span>
                        <span className="rcpt-item-price">{fmtMoney(it.price)}</span>
                      </div>
                      <div className="rcpt-item-who">
                        {TRAVELERS.map((m) => (
                          <button
                            type="button"
                            key={m.id}
                            className={`payer-chip${picked.includes(m.id) ? " on" : ""}`}
                            onClick={() => toggle(i, m.id)}
                          >
                            <Avatar m={m} size="xs" />
                            {m.name}
                          </button>
                        ))}
                        <span className="rcpt-item-tag">
                          {picked.length === 0
                            ? "未选 → 全员"
                            : isAA
                              ? "AA 均摊"
                              : `${picked.length} 人分`}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
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
                    setExtra(Number.isFinite(n) ? round2(n) : 0)
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
      autoFocus={false}
      mountNode={mountNode}
      overrides={{
        Root: { style: { zIndex: 90 } },
        Dialog: {
          style: {
            width: "min(520px, 94vw)",
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
      <Scanner key={String(isOpen)} onClose={onClose} onSubmit={onSubmit} />
    </Modal>
  )
}
