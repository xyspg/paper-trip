import {
  ArrowRight,
  Check,
  ExternalLink,
  HandCoins,
  Link2,
  LoaderCircle,
  Wallet,
} from "lucide-react";
import { useRef, useState } from "react";
import { Avatar } from "../admin/Avatar";
import { ExpenseItems } from "../admin/ExpenseItems";
import { fmtMoney } from "../admin/adminData";
import { useAdminUser } from "../admin/auth";
import { LedgerAutoExport } from "./LedgerAutoExport";
import type { StatementContext } from "../trip/exportLedgerPdf";
import { useTripMeta } from "../trip/hooks";
import { tripTravelers } from "../trip/roster";
import {
  appliedCredit,
  countingPayments,
  expenseBalances,
  expenseFxRate,
  expenseOwedBy,
  expensePaidBy,
  expenseTotals,
  netExpense,
} from "../trip/expenses";
import { currencySymbol, expenseCurrency, fmtCurrencyNumber, tripCurrency } from "../trip/currency";
import type { Trip } from "../trip/types";

// Ledger page driven only by the current trip's expenses and roster. It keeps
// per-person balances, split payers, receipt items, and PDF export. Rows render
// in each expense's own recorded currency; totals and balances are stated in
// the trip's base currency (converted at each row's captured rate).

async function exportPdf(trip: Trip, context: StatementContext) {
  try {
    // Let the loading state paint before PDF generation blocks the main thread,
    // including repeat exports whose module and fonts are already cached.
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => {
        window.setTimeout(resolve, 0);
      });
    });
    const { exportLedgerPdf } = await import("../trip/exportLedgerPdf");
    const statement = await exportLedgerPdf(trip, tripTravelers(trip), context);
    await statement.deliver();
  } catch (err) {
    console.error("导出 PDF 失败", err);
    alert("导出 PDF 失败，请重试");
  }
}

async function copyPdfLink(tripId: string) {
  const url = new URL(`/t/${encodeURIComponent(tripId)}/ledger`, window.location.origin);
  url.searchParams.set("export", "pdf");
  const text = url.toString();

  // execCommand stays synchronous inside the click gesture, which also works
  // in embedded browsers that leave navigator.clipboard.writeText pending.
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.readOnly = true;
  Object.assign(textarea.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "1px",
    height: "1px",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.append(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) await navigator.clipboard.writeText(text);
}

export function PaperLedger({
  trip,
  rev,
  autoExport,
}: {
  trip: Trip;
  rev?: number;
  autoExport?: boolean;
}) {
  // Registry metadata + the exporting user feed the statement's multi-tenant
  // header (visibility, role, prepared-by). Both are optional: the statement
  // renders placeholders while they load or for anonymous viewers.
  const { data: meta, isPending: metaPending } = useTripMeta(trip.id);
  const { data: adminUser, isLoading: userLoading } = useAdminUser();
  const preparedBy = adminUser
    ? `${adminUser.name?.trim() || adminUser.login} (@${adminUser.login})`
    : undefined;
  // Latch the share-link request at mount: the auto-export strips ?export=pdf
  // from the URL as it starts (so Back from the PDF lands on a clean ledger),
  // and reading the live search here would unmount the progress chip the
  // moment that happens.
  const [autoExportRequested] = useState(() => Boolean(autoExport));
  const [linkCopied, setLinkCopied] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const exportInFlight = useRef(false);

  async function handleExportPdf() {
    if (exportInFlight.current) return;
    exportInFlight.current = true;
    setExportingPdf(true);
    try {
      await exportPdf(trip, { meta, rev, preparedBy });
    } finally {
      exportInFlight.current = false;
      setExportingPdf(false);
    }
  }

  // The export waits for the live snapshot and metadata queries to settle, so
  // the statement carries the full registry context.
  const autoExportReady = autoExportRequested && rev != null && !metaPending && !userLoading;
  const travelers = tripTravelers(trip);
  const travelerIds = travelers.map((m) => m.id);
  const travelerCount = travelerIds.length;
  const baseCurrency = tripCurrency(trip);
  const ledger = trip.expenses;
  // Only the payments that actually move balances are listed, so the public
  // ledger never shows a repayment the settle-up figures below it ignore.
  // Rejected rows stay visible (and deletable) in the admin console.
  const payments = countingPayments(trip.payments ?? [], travelerIds);
  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger, baseCurrency);
  const balances = expenseBalances(ledger, travelerIds, baseCurrency, payments);
  const outstanding = balances.reduce((sum, balance) => sum + Math.max(0, -balance.balance), 0);
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const travelerById = Object.fromEntries(travelers.map((m) => [m.id, m]));

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
          集中记录共同花销、抵扣与垫付；每一笔都能按实际情况分配到同行人。
        </p>
      </header>

      {/* SUMMARY */}
      <section className="grid grid-cols-2 mt-[22px] overflow-hidden border border-[#ebe9e3] rounded-[16px] max-[480px]:grid-cols-1">
        <div className="p-[20px_22px] border-r border-[#ebe9e3] max-[480px]:border-r-0 max-[480px]:border-b">
          <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.12em] text-[#76726a]">
            实付合计 Total ({baseCurrency})
          </div>
          <div className="mt-3 font-sans font-extrabold text-[clamp(26px,6vw,36px)] leading-none tracking-[-0.02em]">
            {fmtMoney(grand, baseCurrency)}
          </div>
          <div className="mt-2.5 font-cjk text-[12px] text-[#76726a]">
            已抵扣 Credit{" "}
            <span className="font-sans font-bold text-[#3f6f5b]">
              −{fmtMoney(creditTotal, baseCurrency)}
            </span>
          </div>
        </div>
        <div className="p-[20px_22px] bg-[#eef4f0]">
          <div className="flex items-center gap-[7px] font-grotesk font-semibold text-[10px] uppercase tracking-[0.12em] text-[#76726a]">
            待结算 Outstanding
          </div>
          <div className="mt-3 font-sans font-extrabold text-[clamp(26px,6vw,36px)] leading-none tracking-[-0.02em] text-[#3f6f5b]">
            {fmtMoney(outstanding, baseCurrency)}
          </div>
          <div className="mt-2.5 font-cjk text-[12px] text-[#76726a]">
            {travelerCount > 0 ? `${travelerCount} 位同行人按明细分别承担` : "邀请同行人后计算"}
          </div>
        </div>
      </section>

      {/* PER-PERSON BALANCES */}
      <section
        className="grid grid-cols-2 gap-3 mt-4 max-[560px]:grid-cols-1"
        aria-label="同行人各自结算金额"
      >
        {travelers.map((m) => {
          const balance = balanceById[m.id];
          const net = balance?.balance ?? 0;
          const owe = net < -0.005;
          const settled = Math.abs(net) < 0.005;
          const label = settled ? "已结清" : owe ? "需补付" : "应收回";
          const tone = settled ? "#76726a" : owe ? "#c2553f" : "#3f6f5b";
          return (
            <div key={m.id} className="p-4 bg-white border border-[#ebe9e3] rounded-[14px]">
              <div className="flex items-center gap-3">
                <Avatar m={m} className="w-[38px] h-[38px] text-[13px] border border-[#ebe9e3]" />
                <div className="min-w-0 flex-1">
                  <div className="font-cjk font-bold text-[15px] leading-[1.2] truncate">
                    {m.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#9b988f] truncate">@{m.handle}</div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a]">
                    {label}
                  </div>
                  <div className="mt-0.5 font-sans font-bold text-[17px]" style={{ color: tone }}>
                    {fmtMoney(Math.abs(net), baseCurrency)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 max-[480px]:grid-cols-1">
                <span className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-[#fdfdfb] border border-[#ebe9e3] rounded-[10px] font-cjk text-[12px] text-[#76726a]">
                  已垫付
                  <b className="font-sans font-bold text-[#1c1b19]">
                    {fmtMoney(balance?.paid ?? 0, baseCurrency)}
                  </b>
                </span>
                <span className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-[#fdfdfb] border border-[#ebe9e3] rounded-[10px] font-cjk text-[12px] text-[#76726a]">
                  应承担
                  <b className="font-sans font-bold text-[#1c1b19]">
                    {fmtMoney(balance?.share ?? 0, baseCurrency)}
                  </b>
                </span>
                {(balance?.repaid ?? 0) > 0.005 && (
                  <span className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-[#eef4f0] border border-[#cfe0d6] rounded-[10px] font-cjk text-[12px] text-[#76726a]">
                    已还款
                    <b className="font-sans font-bold text-[#3f6f5b]">
                      {fmtMoney(balance?.repaid ?? 0, baseCurrency)}
                    </b>
                  </span>
                )}
                {(balance?.received ?? 0) > 0.005 && (
                  <span className="flex items-center justify-between gap-2 py-1.5 px-2.5 bg-[#eef4f0] border border-[#cfe0d6] rounded-[10px] font-cjk text-[12px] text-[#76726a]">
                    已收款
                    <b className="font-sans font-bold text-[#3f6f5b]">
                      {fmtMoney(balance?.received ?? 0, baseCurrency)}
                    </b>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {/* LEDGER */}
      <section className="mt-4 overflow-hidden bg-white border border-[#ebe9e3] rounded-[16px]">
        <div className="flex items-center justify-between gap-3 py-[13px] px-[18px] bg-[#fdfdfb] border-b border-[#ebe9e3]">
          <span className="font-grotesk font-bold text-[12px] uppercase tracking-[0.14em]">
            花销明细 · Ledger
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                void copyPdfLink(trip.id)
                  .then(() => {
                    setLinkCopied(true);
                    window.setTimeout(() => setLinkCopied(false), 1800);
                  })
                  .catch((err) => {
                    console.error("复制 PDF 链接失败", err);
                    alert("复制链接失败，请重试");
                  });
              }}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-transparent py-2 px-2.5 font-grotesk text-[11px] font-semibold uppercase tracking-[0.04em] text-[#76726a] cursor-pointer transition-colors hover:border-[#ebe9e3] hover:bg-white hover:text-[#1c1b19]"
              aria-label="复制 PDF 自动导出链接"
            >
              {linkCopied ? (
                <Check size={13} strokeWidth={2.2} />
              ) : (
                <Link2 size={13} strokeWidth={2.2} />
              )}
              {linkCopied ? "已复制" : "复制链接"}
            </button>
            <button
              type="button"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf}
              aria-busy={exportingPdf}
              className="inline-flex items-center gap-1.5 whitespace-nowrap font-grotesk font-semibold text-[11px] uppercase tracking-[0.06em] text-[#3b3833] bg-white border border-[#ebe9e3] rounded-full py-2 px-3.5 cursor-pointer transition-colors enabled:hover:border-[#1c1b19] disabled:cursor-wait disabled:opacity-60"
            >
              {exportingPdf ? (
                <LoaderCircle size={13} strokeWidth={2.2} className="animate-spin" />
              ) : (
                <ExternalLink size={13} strokeWidth={2.2} />
              )}
              <span aria-live="polite">{exportingPdf ? "正在导出…" : "导出 PDF"}</span>
            </button>
          </div>
        </div>

        <div>
          {ledger.map((item) => {
            const net = netExpense(item);
            const paidBy = expensePaidBy(item, travelerIds);
            const payers = travelers.filter((m) => (paidBy[m.id] ?? 0) > 0.005);
            const isSplit = payers.length > 1;
            const owedBy = expenseOwedBy(item, travelerIds);
            const responsible = travelers.filter((m) => (owedBy[m.id] ?? 0) > 0.005);
            const rowCurrency = expenseCurrency(item, baseCurrency);
            const foreign = rowCurrency !== baseCurrency;
            return (
              <div
                key={item.id}
                className="py-4 px-[18px] border-b border-dashed border-[#ebe9e3] last:border-b-0"
              >
                <div className="flex gap-[13px] items-start max-[480px]:flex-wrap">
                  <span className="grid shrink-0 w-[38px] h-[38px] place-items-center overflow-hidden rounded-[10px] border border-[#ebe9e3] bg-white">
                    <Wallet size={19} strokeWidth={2} className="text-[#3f6f5b]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-cjk font-bold text-[15.5px] leading-[1.25]">
                      {item.name}
                    </span>
                    <span className="block mt-[3px] font-cjk text-[12px] text-[#9b988f]">
                      {item.sub}
                    </span>
                  </span>
                  <span className="shrink-0 max-[480px]:w-full max-[480px]:pl-[51px] max-[480px]:mt-1.5">
                    <span className="inline-flex items-center gap-1 py-[5px] pr-[11px] pl-[9px] bg-[#fafaf8] border border-[#ebe9e3] rounded-[10px]">
                      <span className="font-sans text-[14px] text-[#9b988f]">
                        {currencySymbol(rowCurrency)}
                      </span>
                      <span className="font-sans font-bold text-[15px] text-[#1c1b19]">
                        {fmtCurrencyNumber(item.amount, rowCurrency)}
                      </span>
                    </span>
                    {foreign && (
                      <span className="block mt-1 text-right font-sans text-[11px] text-[#9b988f] max-[480px]:text-left">
                        ≈ {fmtMoney(item.amount * expenseFxRate(item), baseCurrency)}
                      </span>
                    )}
                  </span>
                </div>

                <ExpenseItems items={item.items} travelers={travelers} currency={rowCurrency} />

                {item.credit > 0 && (
                  <div className="flex flex-wrap gap-2 items-center justify-end mt-2.5 max-[480px]:justify-start max-[480px]:pl-[51px]">
                    <span className="font-grotesk font-semibold text-[9.5px] uppercase tracking-[0.06em] whitespace-nowrap text-[#3f6f5b] bg-[#eef4f0] border border-[#cfe0d6] rounded-full py-[3px] px-2.5">
                      Credit
                    </span>
                    {item.creditDescription && (
                      <span className="font-sans text-[11px] text-[#3f6f5b]">
                        {item.creditDescription}
                      </span>
                    )}
                    <span className="font-sans font-bold text-[13px] text-[#3f6f5b]">
                      −{fmtMoney(appliedCredit(item), rowCurrency)}
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
                        const amt = paidBy[m.id] ?? 0;
                        const pct = net > 0 ? Math.round((amt / net) * 100) : 0;
                        return (
                          <span
                            key={m.id}
                            className="inline-flex gap-[7px] items-center py-1 pr-2.5 pl-1 bg-[#fdfdfb] border border-[#ebe9e3] rounded-full"
                          >
                            <Avatar
                              m={m}
                              className="w-[22px] h-[22px] text-[9px] border border-[#ebe9e3]"
                            />
                            <span className="font-cjk font-semibold text-[12px]">{m.name}</span>
                            {isSplit && (
                              <span className="font-mono font-bold text-[10.5px] text-[#76726a] bg-[#f0eee8] rounded-full px-1.5 py-px">
                                {pct}%
                              </span>
                            )}
                            <b className="font-sans font-bold text-[12.5px] text-[#1c1b19]">
                              {fmtMoney(amt, rowCurrency)}
                            </b>
                          </span>
                        );
                      })}
                    </span>
                  </div>
                )}

                {responsible.length > 0 && (
                  <div className="flex flex-wrap gap-x-2.5 gap-y-2 items-center mt-2.5 max-[480px]:pl-[51px]">
                    <span className="font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a]">
                      承担 Owed by
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {responsible.map((m) => (
                        <span
                          key={m.id}
                          className="inline-flex gap-[7px] items-center py-1 pr-2.5 pl-1 bg-[#fdfdfb] border border-[#ebe9e3] rounded-full"
                        >
                          <Avatar
                            m={m}
                            className="w-[22px] h-[22px] text-[9px] border border-[#ebe9e3]"
                          />
                          <span className="font-cjk font-semibold text-[12px]">{m.name}</span>
                          <b className="font-sans font-bold text-[12.5px] text-[#1c1b19]">
                            {fmtMoney(owedBy[m.id] ?? 0, rowCurrency)}
                          </b>
                        </span>
                      ))}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 mt-3 flex-wrap">
                  <span className="font-cjk font-semibold text-[12.5px] text-[#76726a]">
                    实付{" "}
                    <b className="font-sans font-bold text-[#1c1b19] text-[13.5px]">
                      {fmtMoney(net, rowCurrency)}
                    </b>
                  </span>
                  <span className="font-cjk font-semibold text-[12.5px] text-[#76726a]">
                    已分配{" "}
                    <b className="font-sans font-bold text-[#1c1b19] text-[13.5px]">
                      {fmtMoney(
                        travelerIds.reduce((sum, id) => sum + (owedBy[id] ?? 0), 0),
                        rowCurrency,
                      )}
                    </b>
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* TOTALS */}
        <div className="bg-[#eef4f0] border-t border-[#ebe9e3]">
          <div className="flex items-center justify-between py-[11px] px-[18px] font-cjk font-semibold text-[13.5px]">
            <span>小计 Subtotal ({baseCurrency})</span>
            <span className="font-sans font-bold">{fmtMoney(subtotal, baseCurrency)}</span>
          </div>
          <div className="flex items-center justify-between py-[11px] px-[18px] font-cjk font-semibold text-[13.5px] text-[#3f6f5b]">
            <span>抵扣 Credit</span>
            <span className="font-sans font-bold">−{fmtMoney(creditTotal, baseCurrency)}</span>
          </div>
          <div className="flex items-center justify-between py-[15px] px-[18px] bg-[#1c1b19] text-[#fafaf8] font-sans font-extrabold tracking-[0.01em] text-[clamp(15px,3vw,17px)]">
            <span>实付合计 Net Total</span>
            <span className="font-sans text-white text-[clamp(18px,4vw,22px)]">
              {fmtMoney(grand, baseCurrency)}
            </span>
          </div>
          <div className="flex items-center justify-between py-[11px] px-[18px] bg-white border-t border-dashed border-[#ebe9e3] font-cjk font-bold text-[14px]">
            <span>承担合计 Allocated</span>
            <span className="font-sans font-bold text-[#3f6f5b] text-[16px]">
              {fmtMoney(grand, baseCurrency)}
            </span>
          </div>
        </div>
      </section>

      {/* PAYMENTS */}
      {payments.length > 0 && (
        <section className="mt-4 overflow-hidden bg-white border border-[#ebe9e3] rounded-[16px]">
          <div className="flex items-center justify-between gap-3 py-[13px] px-[18px] bg-[#fdfdfb] border-b border-[#ebe9e3]">
            <span className="font-grotesk font-bold text-[12px] uppercase tracking-[0.14em]">
              还款记录 · Payments
            </span>
            <span className="font-grotesk text-[10px] uppercase tracking-[0.04em] text-[#9b988f]">
              成员间转账，只影响待结算
            </span>
          </div>
          {payments.map((p) => {
            const from = travelerById[p.from];
            const to = travelerById[p.to];
            const rowCurrency = expenseCurrency(p, baseCurrency);
            const foreign = rowCurrency !== baseCurrency;
            return (
              <div
                key={p.id}
                className="py-4 px-[18px] border-b border-dashed border-[#ebe9e3] last:border-b-0"
              >
                <div className="flex gap-[13px] items-center flex-wrap">
                  <span className="grid shrink-0 w-[38px] h-[38px] place-items-center overflow-hidden rounded-[10px] border border-[#ebe9e3] bg-white">
                    <HandCoins size={19} strokeWidth={2} className="text-[#3f6f5b]" />
                  </span>
                  <span className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                    <span className="inline-flex gap-[7px] items-center py-1 pr-2.5 pl-1 bg-[#fdfdfb] border border-[#ebe9e3] rounded-full">
                      {from && (
                        <Avatar
                          m={from}
                          className="w-[22px] h-[22px] text-[9px] border border-[#ebe9e3]"
                        />
                      )}
                      <span className="font-cjk font-semibold text-[12px]">
                        {from?.name ?? p.from}
                      </span>
                    </span>
                    <ArrowRight size={15} strokeWidth={2.4} className="text-[#9b988f]" />
                    <span className="inline-flex gap-[7px] items-center py-1 pr-2.5 pl-1 bg-[#fdfdfb] border border-[#ebe9e3] rounded-full">
                      {to && (
                        <Avatar
                          m={to}
                          className="w-[22px] h-[22px] text-[9px] border border-[#ebe9e3]"
                        />
                      )}
                      <span className="font-cjk font-semibold text-[12px]">{to?.name ?? p.to}</span>
                    </span>
                    {(p.date || p.note) && (
                      <span className="font-cjk text-[12px] text-[#9b988f]">
                        {[p.date, p.note].filter(Boolean).join(" · ")}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="inline-flex items-center gap-1 py-[5px] pr-[11px] pl-[9px] bg-[#eef4f0] border border-[#cfe0d6] rounded-[10px]">
                      <span className="font-sans text-[14px] text-[#9b988f]">
                        {currencySymbol(rowCurrency)}
                      </span>
                      <span className="font-sans font-bold text-[15px] text-[#3f6f5b]">
                        {fmtCurrencyNumber(p.amount, rowCurrency)}
                      </span>
                    </span>
                    {foreign && (
                      <span className="block mt-1 font-sans text-[11px] text-[#9b988f]">
                        ≈ {fmtMoney(p.amount * expenseFxRate(p), baseCurrency)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </section>
      )}

      <p className="flex gap-3.5 items-center mt-[26px] pt-[22px] border-t border-[#ebe9e3] font-grotesk text-[11px] uppercase tracking-[0.12em] text-[#9b988f]">
        <span className="flex-1 h-px bg-[#cfccc2]" />
        {ledger.length} 笔花销{payments.length > 0 ? ` · ${payments.length} 笔还款` : ""} ·{" "}
        {travelerCount} 位同行人
        <span className="flex-1 h-px bg-[#cfccc2]" />
      </p>

      {autoExportReady && <LedgerAutoExport trip={trip} context={{ meta, rev, preparedBy }} />}
    </div>
  );
}
