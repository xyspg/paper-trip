import { Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { useTrip } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import { appliedCredit, expenseTotals, netExpense } from "../trip/expenses";

const logo = (src: string, alt: string) => (
  <img className="tag-logo" src={src} alt={alt} />
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
const FALLBACK = { color: "var(--green)", icon: <Wallet size={20} strokeWidth={2} /> };
const present = (id: string) => PRESENTATION[id] ?? FALLBACK;

const fmt = (n: number) =>
  "$" +
  (Math.round(n * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function LedgerPage() {
  const { data } = useTrip();
  // Fall back to the seed while the trip loads, matching the timeline page.
  const ledger = (data?.trip ?? tripData).expenses;

  const { subtotal, creditTotal, total: grand } = expenseTotals(ledger);
  const each = grand / 2;

  return (
    <>
      <header className="masthead">
        <span className="mh-kicker k-green">
          <span className="dot" />
          账目明细 · Trip Expenses
        </span>
        <h1 className="mh-title">
          行程<span className="em em-green">花销</span>
        </h1>
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
          <div className="sum-k">Per Person</div>
          <div className="sum-v big">{fmt(each)}</div>
        </div>
      </section>

      <section className="ledger">
        <div className="ledger-head">
          <span className="lh-t">花销明细</span>
        </div>

        <div>
          {ledger.map((item) => {
            const net = netExpense(item);
            const pres = present(item.id);
            return (
              <div className="row" key={item.id}>
                <div className="row-top">
                  <span className="tag" style={{ ["--cat" as string]: pres.color }}>
                    {pres.icon}
                  </span>
                  <span className="row-name">
                    <span className="rn">{item.name}</span>
                    <span className="rs">{item.sub}</span>
                  </span>
                  <span className="amt-box">
                    <span className="amt">{fmt(item.amount)}</span>
                  </span>
                </div>
                {item.credit > 0 && (
                  <div className="credit-line">
                    <span className="cl-tag">Chase IHG credit</span>
                    <span className="cl-amt">−{fmt(appliedCredit(item))}</span>
                  </div>
                )}
                <div className="row-bottom">
                  <span className="rb-left">
                    <b>{fmt(net)}</b>
                  </span>
                  <span className="per">
                    <b>{fmt(net / 2)}</b> per person
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="totals">
          <div className="trow">
            <span>Subtotal</span>
            <span className="tv">{fmt(subtotal)}</span>
          </div>
          <div className="trow credit">
            <span>Chase IHG credit</span>
            <span className="tv">−{fmt(creditTotal)}</span>
          </div>
          <div className="trow grand">
            <span>Net Total</span>
            <span className="tv">{fmt(grand)}</span>
          </div>
          <div className="trow each">
            <span>Per Person</span>
            <span className="tv">{fmt(each)}</span>
          </div>
        </div>
      </section>
    </>
  );
}
