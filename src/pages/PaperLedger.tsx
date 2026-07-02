import { ExternalLink, Wallet } from "lucide-react"
import type { ReactNode } from "react"
import { Avatar } from "../admin/Avatar"
import { ExpenseItems } from "../admin/ExpenseItems"
import { TRAVELERS, TRAVELER_IDS, fmtMoney } from "../admin/adminData"
import {
  appliedCredit,
  expenseBalances,
  expensePaidBy,
  expenseTotals,
  netExpense,
} from "../trip/expenses"
import type { Trip } from "../trip/types"

// Ledger page: a port of the "分账" Claude Design layout (light masthead,
// bordered summary split, editorial expense rows, totals block). Fed the app's
// real expense data and keeps its richer features (per-person balances, split
// payers, receipt items, PDF export).

const logo = (src: string, alt: string) => (
  <img className="w-full h-full p-1 object-contain" src={src} alt={alt} />
)

// Branded lines show the real vendor logo on a light tag; generic ones fall back
// to a lucide glyph on an accent tag.
const PRESENTATION: Record<string, ReactNode> = {
  flight: logo("/jetblue-logo.png", "JetBlue"),
  hotel: logo("/ihg-logo.png", "IHG"),
  tickets: logo("/anime-expo-logo.jpg", "Anime Expo"),
  car: logo("/hertz-logo.png", "Hertz"),
}

function amountParts(value: number): string {
  return fmtMoney(value).replace(/^\$/, "")
}

async function exportPdf(trip: Trip) {
  // Opened synchronously on click so it isn't blocked as a popup once the async
  // PDF render finishes.
  const previewWindow = window.open("", "_blank")
  try {
    const { exportLedgerPdf } = await import("../trip/exportLedgerPdf")
    await exportLedgerPdf(trip, TRAVELERS, previewWindow)
  } catch (err) {
    previewWindow?.close()
    console.error("导出 PDF 失败", err)
    alert("导出 PDF 失败，请重试")
  }
}

export function PaperLedger({ trip }: { trip: Trip }) {
  const ledger = trip.expenses
  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger)
  const balances = expenseBalances(ledger, TRAVELER_IDS)
  const each = balances[0]?.share ?? 0
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]))

  return (
    <div className="font-sans text-[#1c1b19]">
      {/* MASTHEAD */}
      <header className="pb-[28px] border-b border-[#ebe9e3]">
        <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#b08648]">
          <span className="w-[7px] h-[7px] rounded-full bg-[#b08648]" />
          账目明细 · Trip Expenses
        </span>
        <h1 className="mt-3.5 font-sans font-extrabold tracking-[-0.03em] leading-[0.98] text-[clamp(34px,7vw,54px)]">
          行程<span className="text-[#b08648]">花销</span>
        </h1>
        <p className="mt-3.5 max-w-[46ch] font-cjk text-[14px] leading-[1.75] text-[#76726a]">
          机票 · 酒店 · 门票 · 租车,全部已支付,两人均摊。
        </p>
      </header>

      {/* SUMMARY */}
      <section className="grid grid-cols-2 mt-[22px] overflow-hidden border border-[#ebe9e3] rounded-[16px] max-[480px]:grid-cols-1">
        <div className="p-[20px_22px] border-r border-[#ebe9e3] max-[480px]:border-r-0 max-[480px]:border-b">
          <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.12em] text-[#76726a]">
            实付合计 Total
          </div>
          <div className="mt-3 font-sans font-extrabold text-[clamp(26px,6vw,36px)] leading-none tracking-[-0.02em]">
            {fmtMoney(grand)}
          </div>
          <div className="mt-2.5 font-cjk text-[12px] text-[#76726a]">
            已抵扣 Chase IHG credit{" "}
            <span className="font-sans font-bold text-[#3f6f5b]">−{fmtMoney(creditTotal)}</span>
          </div>
        </div>
        <div className="p-[20px_22px] bg-[#eef4f0]">
          <div className="flex items-center gap-[7px] font-grotesk font-semibold text-[10px] uppercase tracking-[0.12em] text-[#76726a]">
            每人均摊 Per Person
            <span className="font-mono font-bold text-[10px] tracking-normal text-[#3f6f5b] bg-white border border-[#cfe0d6] rounded-[5px] px-1.5 py-px">
              ÷2
            </span>
          </div>
          <div className="mt-3 font-sans font-extrabold text-[clamp(26px,6vw,36px)] leading-none tracking-[-0.02em] text-[#3f6f5b]">
            {fmtMoney(each)}
          </div>
          <div className="mt-2.5 font-cjk text-[12px] text-[#76726a]">两人各承担一半</div>
        </div>
      </section>

      {/* PER-PERSON BALANCES */}
      <section className="grid grid-cols-2 gap-3 mt-4 max-[560px]:grid-cols-1" aria-label="两人各自结算金额">
        {TRAVELERS.map((m) => {
          const balance = balanceById[m.id]
          const net = balance?.balance ?? 0
          const owe = net < -0.005
          const settled = Math.abs(net) < 0.005
          const label = settled ? "已结清" : owe ? "需补付" : "应收回"
          const tone = settled ? "#76726a" : owe ? "#c2553f" : "#3f6f5b"
          return (
            <div key={m.id} className="p-4 bg-white border border-[#ebe9e3] rounded-[14px]">
              <div className="flex items-center gap-3">
                <Avatar m={m} className="w-[38px] h-[38px] text-[13px] border border-[#ebe9e3]" />
                <div className="min-w-0 flex-1">
                  <div className="font-cjk font-bold text-[15px] leading-[1.2] truncate">{m.name}</div>
                  <div className="font-mono text-[11px] text-[#9b988f] truncate">@{m.handle}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a]">
                    {label}
                  </div>
                  <div className="mt-0.5 font-sans font-bold text-[17px]" style={{ color: tone }}>
                    {fmtMoney(Math.abs(net))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 max-[480px]:grid-cols-1">
                <span className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-[#fdfdfb] border border-[#ebe9e3] rounded-[10px] font-cjk text-[12px] text-[#76726a]">
                  已垫付
                  <b className="font-sans font-bold text-[#1c1b19]">{fmtMoney(balance?.paid ?? 0)}</b>
                </span>
                <span className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-[#fdfdfb] border border-[#ebe9e3] rounded-[10px] font-cjk text-[12px] text-[#76726a]">
                  应承担
                  <b className="font-sans font-bold text-[#1c1b19]">{fmtMoney(balance?.share ?? each)}</b>
                </span>
              </div>
            </div>
          )
        })}
      </section>

      {/* LEDGER */}
      <section className="mt-4 overflow-hidden bg-white border border-[#ebe9e3] rounded-[16px]">
        <div className="flex items-center justify-between py-[13px] px-[18px] bg-[#fdfdfb] border-b border-[#ebe9e3]">
          <span className="font-grotesk font-bold text-[12px] uppercase tracking-[0.14em]">
            花销明细 · Ledger
          </span>
          <button
            type="button"
            onClick={() => exportPdf(trip)}
            className="inline-flex items-center gap-1.5 font-grotesk font-semibold text-[11px] uppercase tracking-[0.06em] text-[#3b3833] bg-white border border-[#ebe9e3] rounded-full py-2 px-3.5 cursor-pointer transition-colors hover:border-[#1c1b19]"
          >
            <ExternalLink size={13} strokeWidth={2.2} />
            导出 PDF
          </button>
        </div>

        <div>
          {ledger.map((item) => {
            const net = netExpense(item)
            const brand = PRESENTATION[item.id]
            const paidBy = expensePaidBy(item, TRAVELER_IDS)
            const payers = TRAVELERS.filter((m) => (paidBy[m.id] ?? 0) > 0.005)
            const isSplit = payers.length > 1
            return (
              <div key={item.id} className="py-4 px-[18px] border-b border-dashed border-[#ebe9e3] last:border-b-0">
                <div className="flex gap-[13px] items-start max-[480px]:flex-wrap">
                  <span className="grid shrink-0 w-[38px] h-[38px] place-items-center overflow-hidden rounded-[10px] border border-[#ebe9e3] bg-white">
                    {brand ?? <Wallet size={19} strokeWidth={2} className="text-[#3f6f5b]" />}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-cjk font-bold text-[15.5px] leading-[1.25]">{item.name}</span>
                    <span className="block mt-[3px] font-cjk text-[12px] text-[#9b988f]">{item.sub}</span>
                  </span>
                  <span className="shrink-0 max-[480px]:w-full max-[480px]:pl-[51px] max-[480px]:mt-1.5">
                    <span className="inline-flex items-center gap-1 py-[5px] pr-[11px] pl-[9px] bg-[#fafaf8] border border-[#ebe9e3] rounded-[10px]">
                      <span className="font-sans text-[14px] text-[#9b988f]">$</span>
                      <span className="font-sans font-bold text-[15px] text-[#1c1b19]">
                        {amountParts(item.amount)}
                      </span>
                    </span>
                  </span>
                </div>

                <ExpenseItems items={item.items} />

                {item.credit > 0 && (
                  <div className="flex gap-2 items-center justify-end mt-2.5 max-[480px]:justify-start max-[480px]:pl-[51px]">
                    <span className="font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.06em] whitespace-nowrap text-[#3f6f5b] bg-[#eef4f0] border border-[#cfe0d6] rounded-full py-[3px] px-2.5">
                      Chase IHG credit
                    </span>
                    <span className="font-sans font-bold text-[13px] text-[#3f6f5b]">
                      −{fmtMoney(appliedCredit(item))}
                    </span>
                  </div>
                )}

                {payers.length > 0 && (
                  <div className="flex flex-wrap gap-x-2.5 gap-y-2 items-center mt-2.5 max-[480px]:pl-[51px]">
                    <span className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a]">
                      {isSplit ? "分摊垫付 Split" : "垫付 Paid by"}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {payers.map((m) => {
                        const amt = paidBy[m.id] ?? 0
                        const pct = net > 0 ? Math.round((amt / net) * 100) : 0
                        return (
                          <span
                            key={m.id}
                            className="inline-flex gap-[7px] items-center py-1 pr-2.5 pl-1 bg-[#fdfdfb] border border-[#ebe9e3] rounded-full"
                          >
                            <Avatar m={m} className="w-[22px] h-[22px] text-[9px] border border-[#ebe9e3]" />
                            <span className="font-cjk font-semibold text-[12px]">{m.name}</span>
                            {isSplit && (
                              <span className="font-mono font-bold text-[10.5px] text-[#76726a] bg-[#f0eee8] rounded-full px-1.5 py-px">
                                {pct}%
                              </span>
                            )}
                            <b className="font-sans font-bold text-[12.5px] text-[#1c1b19]">{fmtMoney(amt)}</b>
                          </span>
                        )
                      })}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                  <span className="font-cjk font-semibold text-[12.5px] text-[#76726a]">
                    实付 <b className="font-sans font-bold text-[#1c1b19] text-[13.5px]">{fmtMoney(net)}</b>
                  </span>
                  <span className="font-cjk font-semibold text-[12.5px] text-[#76726a]">
                    每人 <b className="font-sans font-bold text-[#1c1b19] text-[13.5px]">{fmtMoney(net / 2)}</b>
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        {/* TOTALS */}
        <div className="bg-[#eef4f0] border-t border-[#ebe9e3]">
          <div className="flex items-center justify-between py-[11px] px-[18px] font-cjk font-semibold text-[13.5px]">
            <span>小计 Subtotal</span>
            <span className="font-sans font-bold">{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between py-[11px] px-[18px] font-cjk font-semibold text-[13.5px] text-[#3f6f5b]">
            <span>Chase IHG credit</span>
            <span className="font-sans font-bold">−{fmtMoney(creditTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-[15px] px-[18px] bg-[#1c1b19] text-[#fafaf8] font-sans font-extrabold tracking-[0.01em] text-[clamp(15px,3vw,17px)]">
            <span>实付合计 Net Total</span>
            <span className="font-sans text-white text-[clamp(18px,4vw,22px)]">{fmtMoney(grand)}</span>
          </div>
          <div className="flex items-center justify-between py-[11px] px-[18px] bg-white border-t border-dashed border-[#ebe9e3] font-cjk font-bold text-[14px]">
            <span>每人均摊 Per Person</span>
            <span className="font-sans font-bold text-[#3f6f5b] text-[16px]">{fmtMoney(each)}</span>
          </div>
        </div>
      </section>

      <p className="flex gap-3.5 items-center mt-[26px] pt-[22px] border-t border-[#ebe9e3] font-grotesk text-[11px] uppercase tracking-[0.12em] text-[#9b988f]">
        <span className="flex-1 h-px bg-[#cfccc2]" />
        全部已付 · 两人均摊
        <span className="flex-1 h-px bg-[#cfccc2]" />
      </p>
    </div>
  )
}
