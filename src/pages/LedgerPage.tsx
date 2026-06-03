import { useState } from 'react'
import { Plane, Hotel, Ticket, Car, RotateCcw } from 'lucide-react'
import { readLocal, writeLocal } from '../localStore'

type LedgerDef = {
  id: string
  cat: string
  name: string
  sub: string
  amount: number
  credit: number
  icon: React.ReactNode
}

const ledger: LedgerDef[] = [
  {
    id: 'flight',
    cat: 'var(--cyan)',
    name: '机票 · JetBlue 往返',
    sub: 'JFK ⇄ LAX / ONT · 2 人',
    amount: 993.6,
    credit: 0,
    icon: <Plane size={20} strokeWidth={2} />,
  },
  {
    id: 'hotel',
    cat: 'var(--violet)',
    name: '酒店 · Holiday Inn Diamond Bar',
    sub: '2 晚 · 2 Queen Standard',
    amount: 356.62,
    credit: 250,
    icon: <Hotel size={20} strokeWidth={2} />,
  },
  {
    id: 'tickets',
    cat: 'var(--magenta)',
    name: '门票 · Anime Expo 2026',
    sub: '2 × 4-Day General Attendee',
    amount: 382.84,
    credit: 0,
    icon: <Ticket size={20} strokeWidth={2} />,
  },
  {
    id: 'car',
    cat: 'var(--yellow)',
    name: '租车 · Hertz',
    sub: '3 天 · Kia K5 或同级',
    amount: 293.11,
    credit: 0,
    icon: <Car size={20} strokeWidth={2} />,
  },
]

const STORE = 'ax2026-ledger-v1'

// The raw input text is the source of truth so a field can be cleared/edited
// freely; numbers are derived via toNumber for the math.
type Amounts = Record<string, string>

const defaults = (): Amounts =>
  Object.fromEntries(ledger.map((item) => [item.id, String(item.amount)]))

// A field's non-negative numeric value; blank, negative, or garbage → 0.
const toNumber = (raw: string | undefined): number => {
  const n = parseFloat(raw ?? '')
  return Number.isFinite(n) && n > 0 ? n : 0
}

const loadAmounts = (): Amounts => {
  const stored = readLocal(STORE)
  if (stored) {
    try {
      const parsed = JSON.parse(stored) as Record<string, unknown>
      const valid: Amounts = {}
      for (const item of ledger) {
        const v = parsed[item.id]
        // Only adopt a value that's a finite number or a numeric/blank string;
        // anything else (corrupt/hand-edited payload) keeps the default.
        if (typeof v === 'number' && Number.isFinite(v)) valid[item.id] = String(v)
        else if (typeof v === 'string' && (v === '' || Number.isFinite(parseFloat(v))))
          valid[item.id] = v
      }
      return { ...defaults(), ...valid }
    } catch {
      // corrupt payload — fall through to defaults
    }
  }
  return defaults()
}

const fmt = (n: number) =>
  '$' +
  (Math.round(n * 100) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

export function LedgerPage() {
  const [amounts, setAmounts] = useState<Amounts>(loadAmounts)

  const persist = (next: Amounts) => {
    setAmounts(next)
    writeLocal(STORE, JSON.stringify(next))
  }

  const subtotal = ledger.reduce((sum, item) => sum + toNumber(amounts[item.id]), 0)
  const creditTotal = ledger.reduce((sum, item) => sum + item.credit, 0)
  const grand = ledger.reduce(
    (sum, item) => sum + Math.max(0, toNumber(amounts[item.id]) - item.credit),
    0,
  )
  const each = grand / 2

  return (
    <>
      <header className="masthead">
        <span className="mh-kicker k-green">
          <span className="dot" />账目明细 · Trip Expenses
        </span>
        <h1 className="mh-title">
          行程<span className="em em-green">花销</span>
        </h1>
        <p className="mh-tagline">机票 · 酒店 · 门票 · 租车 — 全部已支付，两人均摊。</p>
      </header>

      <section className="summary">
        <div className="sum-cell">
          <div className="sum-k">实付合计 Total</div>
          <div className="sum-v">{fmt(grand)}</div>
          <div className="sum-note">
            已抵扣 Chase IHG credit <span>−{fmt(creditTotal)}</span>
          </div>
        </div>
        <div className="sum-div" />
        <div className="sum-cell accent">
          <div className="sum-k">
            每人均摊 Per Person <span className="x2">÷2</span>
          </div>
          <div className="sum-v big">{fmt(each)}</div>
          <div className="sum-note">两人各承担一半</div>
        </div>
      </section>

      <section className="ledger">
        <div className="ledger-head">
          <span className="lh-t">花销明细 · Ledger</span>
          <span className="lh-r">点金额可改</span>
        </div>

        <div>
          {ledger.map((item) => {
            const net = Math.max(0, toNumber(amounts[item.id]) - item.credit)
            return (
              <div className="row" key={item.id}>
                <div className="row-top">
                  <span className="tag" style={{ ['--cat' as string]: item.cat }}>
                    {item.icon}
                  </span>
                  <span className="row-name">
                    <span className="rn">{item.name}</span>
                    <span className="rs">{item.sub}</span>
                  </span>
                  <span className="amt-box">
                    <span className="amt-input">
                      <span className="cur">$</span>
                      <input
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        value={amounts[item.id] ?? ''}
                        aria-label={`${item.name} 金额`}
                        onChange={(event) =>
                          persist({ ...amounts, [item.id]: event.target.value })
                        }
                      />
                    </span>
                  </span>
                </div>
                {item.credit > 0 && (
                  <div className="credit-line">
                    <span className="cl-tag">Chase IHG credit</span>
                    <span className="cl-amt">−{fmt(item.credit)}</span>
                  </div>
                )}
                <div className="row-bottom">
                  <span className="rb-left">
                    实付 <b>{fmt(net)}</b>
                  </span>
                  <span className="per">
                    每人 <b>{fmt(net / 2)}</b>
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="totals">
          <div className="trow">
            <span>小计 Subtotal</span>
            <span className="tv">{fmt(subtotal)}</span>
          </div>
          <div className="trow credit">
            <span>Chase IHG credit</span>
            <span className="tv">−{fmt(creditTotal)}</span>
          </div>
          <div className="trow grand">
            <span>实付合计 Net Total</span>
            <span className="tv">{fmt(grand)}</span>
          </div>
          <div className="trow each">
            <span>每人均摊 Per Person</span>
            <span className="tv">{fmt(each)}</span>
          </div>
        </div>
      </section>

      <div className="reset-wrap">
        <button type="button" className="reset" onClick={() => persist(defaults())}>
          <RotateCcw size={13} strokeWidth={2.5} />
          恢复原始金额
        </button>
      </div>

      <p className="foot">机票 · 酒店 · 门票 · 租车 — 全部已付 · 两人均摊</p>
    </>
  )
}
