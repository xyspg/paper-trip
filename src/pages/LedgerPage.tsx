import { Plane, Hotel, Ticket, Car } from "lucide-react";

type LedgerDef = {
  id: string;
  cat: string;
  name: string;
  sub: string;
  amount: number;
  credit: number;
  icon: React.ReactNode;
};

const ledger: LedgerDef[] = [
  {
    id: "flight",
    cat: "var(--cyan)",
    name: "机票 · JetBlue 往返",
    sub: "JFK ⇄ LAX / ONT · 2 人",
    amount: 993.6,
    credit: 0,
    icon: <Plane size={20} strokeWidth={2} />,
  },
  {
    id: "hotel",
    cat: "var(--violet)",
    name: "酒店 · Holiday Inn Diamond Bar",
    sub: "2 晚 · 2 Queen Standard",
    amount: 356.62,
    credit: 250,
    icon: <Hotel size={20} strokeWidth={2} />,
  },
  {
    id: "tickets",
    cat: "var(--magenta)",
    name: "门票 · Anime Expo 2026",
    sub: "2 × 4-Day General Attendee",
    amount: 382.84,
    credit: 0,
    icon: <Ticket size={20} strokeWidth={2} />,
  },
  {
    id: "car",
    cat: "var(--yellow)",
    name: "租车 · Hertz",
    sub: "3 天",
    amount: 332.24,
    credit: 0,
    icon: <Car size={20} strokeWidth={2} />,
  },
];

const fmt = (n: number) =>
  "$" +
  (Math.round(n * 100) / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export function LedgerPage() {
  const subtotal = ledger.reduce((sum, item) => sum + item.amount, 0);
  const creditTotal = ledger.reduce((sum, item) => sum + item.credit, 0);
  const grand = ledger.reduce(
    (sum, item) => sum + Math.max(0, item.amount - item.credit),
    0,
  );
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
            const net = Math.max(0, item.amount - item.credit);
            return (
              <div className="row" key={item.id}>
                <div className="row-top">
                  <span
                    className="tag"
                    style={{ ["--cat" as string]: item.cat }}
                  >
                    {item.icon}
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
                    <span className="cl-amt">−{fmt(item.credit)}</span>
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
