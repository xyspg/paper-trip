import { ExternalLink, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { Avatar } from "../admin/Avatar";
import { ExpenseItems } from "../admin/ExpenseItems";
import { TRAVELERS, TRAVELER_IDS, fmtMoney } from "../admin/adminData";
import {
  appliedCredit,
  expenseBalances,
  expensePaidBy,
  expenseTotals,
  netExpense,
} from "../trip/expenses";
import { useTrip } from "../trip/hooks";
import { tripData } from "../trip/tripData";

const logo = (src: string, alt: string) => (
  <img className="w-full h-full p-1 object-contain" src={src} alt={alt} />
);

// The public ledger keeps its own icon + accent per line; only the figures come
// from the synced trip now. Keyed by expense id (the seed set is fixed; unknown
// ids fall back to a neutral wallet). Branded lines show the real vendor logo;
// generic ones keep a lucide glyph on a colored tag.
const PRESENTATION: Record<string, { color: string; icon: ReactNode }> = {
  flight: { color: "#fff", icon: logo("/jetblue-logo.png", "JetBlue") },
  hotel: { color: "#fff", icon: logo("/ihg-logo.png", "IHG") },
  tickets: { color: "#fff", icon: logo("/anime-expo-logo.jpg", "Anime Expo") },
  car: { color: "#fff", icon: logo("/hertz-logo.png", "Hertz") },
};
const FALLBACK = { color: "var(--color-green)", icon: <Wallet size={20} strokeWidth={2} /> };
const present = (id: string) => PRESENTATION[id] ?? FALLBACK;

export function LedgerPage() {
  const { data } = useTrip();
  // Fall back to the seed while the trip loads, matching the timeline page.
  const trip = data?.trip ?? tripData;
  const ledger = trip.expenses;

  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger);
  const balances = expenseBalances(ledger, TRAVELER_IDS);
  const each = balances[0]?.share ?? 0;
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));

  return (
    <>
      <header className="relative isolate overflow-hidden p-[clamp(22px,4vw,40px)] text-paper bg-ink border-[3px] border-ink rounded-card shadow-hard before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_26px,rgb(255_45_107_/_10%)_26px_28px),radial-gradient(circle_at_88%_12%,rgb(0_191_212_/_22%),transparent_42%),radial-gradient(circle_at_8%_96%,rgb(255_196_0_/_16%),transparent_40%)]">
        <span className="inline-flex gap-2.5 items-center py-1.5 px-3 mb-4.5 text-ink uppercase tracking-[0.28em] bg-green border-2 border-paper rounded-full font-grotesk text-xs font-extrabold">
          <span className="w-[7px] h-[7px] bg-magenta rounded-full" />
          账目明细 · Trip Expenses
        </span>
        <h1 className="m-0 uppercase tracking-[0] font-display text-[clamp(38px,9vw,92px)] font-black leading-[0.92]">
          行程
          <span className="[-webkit-text-stroke:2px_var(--color-paper)] [paint-order:stroke_fill] text-green">
            花销
          </span>
        </h1>
      </header>

      <section className="flex items-stretch mt-4.5 overflow-hidden bg-paper-2 border-[3px] border-ink rounded-card shadow-hard max-[480px]:flex-col">
        <div className="flex-1 min-w-0 p-[clamp(16px,3vw,22px)]">
          <div className="flex gap-[7px] items-center text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[11px] font-extrabold">
            实付合计 Total
          </div>
          <div className="mt-2.5 tracking-[-0.01em] font-mono text-[clamp(26px,6vw,38px)] font-bold leading-none">
            {fmtMoney(grand)}
          </div>
          <div className="mt-[9px] text-ink-soft font-cjk text-xs font-medium">
            已抵扣 Chase IHG credit{" "}
            <span className="text-green font-mono font-bold">−{fmtMoney(creditTotal)}</span>
          </div>
        </div>
        <div className="shrink-0 w-[3px] bg-ink max-[480px]:w-auto max-[480px]:h-[3px]" />
        <div className="flex-1 min-w-0 p-[clamp(16px,3vw,22px)] bg-[color-mix(in_srgb,var(--color-yellow)_16%,var(--color-paper-2))]">
          <div className="flex gap-[7px] items-center text-ink-soft uppercase tracking-[0.12em] font-grotesk text-[11px] font-extrabold">
            Per Person
          </div>
          <div className="mt-2.5 tracking-[-0.01em] font-mono font-bold leading-none text-magenta text-[clamp(30px,7vw,44px)]">
            {fmtMoney(each)}
          </div>
        </div>
      </section>

      <section
        className="grid grid-cols-2 gap-3 mt-3.5 max-[760px]:grid-cols-1"
        aria-label="两人各自结算金额"
      >
        {TRAVELERS.map((m) => {
          const balance = balanceById[m.id];
          const net = balance?.balance ?? 0;
          const owe = net < -0.005;
          const settled = Math.abs(net) < 0.005;
          return (
            <div
              className="grid grid-cols-[minmax(0,1.2fr)_minmax(120px,0.8fr)] gap-3 items-center p-3.5 bg-paper-2 border-[3px] border-ink rounded-card shadow-hard-sm max-[480px]:grid-cols-[minmax(0,1fr)_minmax(106px,auto)] max-[480px]:gap-2.5 max-[480px]:p-3"
              key={m.id}
            >
              <div className="flex col-start-1 row-start-1 gap-2.5 items-center min-w-0">
                <Avatar m={m} className="w-[38px] h-[38px] text-[13px] border-2 border-ink" />
                <div>
                  <div className="overflow-hidden font-cjk text-[15px] font-black leading-[1.2] text-ellipsis whitespace-nowrap">
                    {m.name}
                  </div>
                  <div className="overflow-hidden text-ink-soft font-mono text-[11px] text-ellipsis whitespace-nowrap">
                    @{m.handle}
                  </div>
                </div>
              </div>
              <div className="grid col-span-full grid-cols-2 gap-[7px] max-[480px]:grid-cols-1">
                <span className="flex items-center justify-between min-w-0 py-1.5 px-2 text-ink-soft bg-[color-mix(in_srgb,var(--color-yellow)_11%,var(--color-paper))] border-2 border-dashed border-[#e4ddcd] rounded-[10px] font-cjk text-xs font-bold">
                  已垫付 <b className="text-ink font-mono font-bold">{fmtMoney(balance?.paid ?? 0)}</b>
                </span>
                <span className="flex items-center justify-between min-w-0 py-1.5 px-2 text-ink-soft bg-[color-mix(in_srgb,var(--color-yellow)_11%,var(--color-paper))] border-2 border-dashed border-[#e4ddcd] rounded-[10px] font-cjk text-xs font-bold">
                  应承担{" "}
                  <b className="text-ink font-mono font-bold">{fmtMoney(balance?.share ?? each)}</b>
                </span>
              </div>
              <div className="grid col-start-2 row-start-1 justify-items-end py-2 px-2.5 text-ink bg-paper border-2 border-ink rounded-[10px] shadow-[2px_2px_0_var(--color-ink)] font-cjk text-xs font-black leading-[1.2] max-[480px]:px-2">
                <span>{settled ? "已结清" : owe ? "需补付" : "应收回"}</span>
                <b
                  className={`mt-[3px] text-base max-[480px]:text-sm font-mono font-bold ${settled ? "" : owe ? "text-magenta" : "text-green"}`}
                >
                  {fmtMoney(Math.abs(net))}
                </b>
              </div>
            </div>
          );
        })}
      </section>

      <section className="mt-4.5 overflow-hidden bg-paper-2 border-[3px] border-ink rounded-card shadow-hard">
        <div className="flex items-center justify-between py-3.5 px-4.5 text-paper bg-ink">
          <span className="uppercase tracking-[0.16em] font-display text-sm font-extrabold">
            花销明细
          </span>
          <button
            type="button"
            className="flex items-center gap-1.5 py-[7px] px-3 text-paper font-display text-xs font-bold tracking-[0.04em] cursor-pointer bg-transparent border-2 border-paper rounded-lg transition-[background,color] duration-150 ease-[ease] hover:text-ink hover:bg-paper"
            onClick={async () => {
              // Opened synchronously on click so it isn't blocked as a
              // popup once the async PDF render below finishes.
              const previewWindow = window.open("", "_blank");
              try {
                const { exportLedgerPdf } = await import("../trip/exportLedgerPdf");
                await exportLedgerPdf(trip, TRAVELERS, previewWindow);
              } catch (err) {
                // Render failed (canvas/import/runtime error): close the blank
                // tab we opened up front so it isn't left orphaned, and surface
                // the failure instead of swallowing the rejection.
                previewWindow?.close();
                console.error("导出 PDF 失败", err);
                alert("导出 PDF 失败，请重试");
              }
            }}
          >
            <ExternalLink size={14} strokeWidth={2.4} />
            导出 PDF
          </button>
        </div>

        <div>
          {ledger.map((item) => {
            const net = netExpense(item);
            const pres = present(item.id);
            // Who actually fronted this line, mirrored read-only from the admin
            // split. Reuses the same normalization the balances use, so the
            // per-person figures here always reconcile with the net.
            const paidBy = expensePaidBy(item, TRAVELER_IDS);
            const payers = TRAVELERS.filter((m) => (paidBy[m.id] ?? 0) > 0.005);
            const isSplit = payers.length > 1;
            return (
              <div
                className="py-4 px-4.5 border-b-2 border-dashed border-[#e4ddcd] last:border-b-0"
                key={item.id}
              >
                <div className="flex gap-3 items-start max-[480px]:flex-wrap">
                  <span
                    className="grid shrink-0 w-9.5 h-9.5 place-items-center overflow-hidden text-ink bg-[var(--cat,var(--color-cyan))] border-2 border-ink rounded-[10px]"
                    style={{ ["--cat" as string]: pres.color }}
                  >
                    {pres.icon}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-cjk text-[clamp(15px,2.6vw,17px)] font-black leading-[1.2]">
                      {item.name}
                    </span>
                    <span className="block mt-[3px] text-ink-soft font-cjk text-[12.5px] font-medium">
                      {item.sub}
                    </span>
                  </span>
                  <span className="shrink-0 text-right max-[480px]:w-full max-[480px]:pl-[50px] max-[480px]:mt-1 max-[480px]:text-left">
                    <span className="inline-flex items-center py-1 px-2.5 text-ink bg-paper border-2 border-ink rounded-[10px] shadow-[2px_2px_0_var(--color-ink)] font-mono text-base font-bold">
                      {fmtMoney(item.amount)}
                    </span>
                  </span>
                </div>
                <ExpenseItems items={item.items} />
                {item.credit > 0 && (
                  <div className="flex gap-2 items-center justify-end mt-2 max-[480px]:justify-start max-[480px]:pl-[50px]">
                    <span className="py-[3px] px-[9px] text-green whitespace-nowrap uppercase tracking-[0.08em] bg-[color-mix(in_srgb,var(--color-green)_16%,#fff)] border-2 border-green rounded-full font-grotesk text-[10px] font-extrabold">
                      Chase IHG credit
                    </span>
                    <span className="text-green font-mono text-sm font-bold">
                      −{fmtMoney(appliedCredit(item))}
                    </span>
                  </div>
                )}
                {payers.length > 0 && (
                  <div className="flex flex-wrap gap-x-2.5 gap-y-2 items-center mt-2.5 max-[480px]:pl-[50px]">
                    <span className="text-ink-soft uppercase tracking-[0.08em] font-grotesk text-[10px] font-extrabold">
                      {isSplit ? "分摊垫付 Split" : "垫付 Paid by"}
                    </span>
                    <span className="flex flex-wrap gap-1.5">
                      {payers.map((m) => {
                        const amt = paidBy[m.id] ?? 0;
                        const pct = net > 0 ? Math.round((amt / net) * 100) : 0;
                        return (
                          <span
                            className="inline-flex gap-[7px] items-center py-1 pr-[9px] pl-1 bg-paper border-2 border-ink rounded-full shadow-[2px_2px_0_var(--color-ink)]"
                            key={m.id}
                          >
                            <Avatar m={m} className="w-[22px] h-[22px] text-[9px] border-2 border-ink" />
                            <span className="font-cjk text-xs font-extrabold">{m.name}</span>
                            {isSplit && (
                              <span className="py-px px-1.5 text-ink-soft bg-[color-mix(in_srgb,var(--color-yellow)_22%,var(--color-paper))] rounded-full font-mono text-[10.5px] font-bold">
                                {pct}%
                              </span>
                            )}
                            <b className="text-ink font-mono text-[12.5px] font-bold">
                              {fmtMoney(amt)}
                            </b>
                          </span>
                        );
                      })}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 items-center justify-between mt-3">
                  <span className="text-ink-soft font-cjk text-[12.5px] font-bold">
                    <b className="text-ink font-mono text-[13.5px] font-bold">{fmtMoney(net)}</b>
                  </span>
                  <span className="text-ink-soft font-cjk text-[12.5px] font-bold">
                    <b className="text-ink font-mono text-[13.5px] font-bold">{fmtMoney(net / 2)}</b>{" "}
                    per person
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-[color-mix(in_srgb,var(--color-yellow)_14%,var(--color-paper-2))] border-t-[3px] border-ink">
          <div className="flex items-center justify-between py-[11px] px-4.5 font-cjk text-sm font-bold">
            <span>Subtotal</span>
            <span className="font-mono font-bold">{fmtMoney(subtotal)}</span>
          </div>
          <div className="flex items-center justify-between py-[11px] px-4.5 font-cjk text-sm font-bold text-green">
            <span>Chase IHG credit</span>
            <span className="font-mono font-bold text-green">−{fmtMoney(creditTotal)}</span>
          </div>
          <div className="flex items-center justify-between py-[15px] px-4.5 text-paper uppercase tracking-[0.04em] bg-ink font-display text-[clamp(15px,3vw,18px)] font-black">
            <span>Net Total</span>
            <span className="font-mono font-bold text-yellow text-[clamp(18px,4vw,24px)]">
              {fmtMoney(grand)}
            </span>
          </div>
          <div className="flex items-center justify-between py-[11px] px-4.5 font-cjk text-[15px] font-black bg-paper-2 border-t-2 border-dashed border-ink">
            <span>Per Person</span>
            <span className="font-mono font-bold text-magenta text-[17px]">{fmtMoney(each)}</span>
          </div>
        </div>
      </section>
    </>
  );
}
