import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { CATS, EXPENSES_SEED, fmtMoney, TRAVELERS } from "./adminData";
import type { Expense } from "./adminData";
import { Avatar } from "./Avatar";
import { EXP_ICON, Icons } from "./AdminIcons";
import { cssVars } from "./style";
import type { ToastFn } from "./useAdminToasts";

type Props = {
  expenses: Expense[];
  setExpenses: Dispatch<SetStateAction<Expense[]>>;
  toast: ToastFn;
};

export function SplitSection({ expenses, setExpenses, toast }: Props) {
  // The amount fields are uncontrolled so native decimal entry works; bump this to
  // remount them (and pick up fresh defaultValue) when the ledger is reset.
  const [amtResetKey, setAmtResetKey] = useState(0);

  const setAmount = (id: string, v: string) => {
    const n = parseFloat(v);
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, amount: Number.isFinite(n) ? n : 0 } : e)),
    );
  };
  const setPayer = (id: string, payer: string) =>
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, payer } : e)));

  // A line's credit can only offset up to its own amount, so the displayed totals
  // always reconcile: subtotal - creditTotal === net total.
  const appliedCredit = (e: Expense) => Math.min(e.credit || 0, Number(e.amount) || 0);
  const net = (e: Expense) => Math.max(0, (Number(e.amount) || 0) - (e.credit || 0));
  const subtotal = expenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const creditTotal = expenses.reduce((a, e) => a + appliedCredit(e), 0);
  const total = expenses.reduce((a, e) => a + net(e), 0);
  const share = total / TRAVELERS.length;

  const paid: Record<string, number> = Object.fromEntries(TRAVELERS.map((m) => [m.id, 0]));
  for (const e of expenses) {
    const cur = paid[e.payer];
    if (cur !== undefined) paid[e.payer] = cur + net(e);
  }

  // settlement between the two travelers
  const balances = TRAVELERS.map((m) => ({ m, bal: (paid[m.id] || 0) - share }));
  const ower = balances.find((b) => b.bal < -0.005);
  const receiver = balances.find((b) => b.bal > 0.005);
  const settleAmt = ower ? Math.abs(ower.bal) : 0;

  const reset = () => {
    setExpenses(EXPENSES_SEED.map((e) => ({ ...e })));
    setAmtResetKey((k) => k + 1);
    toast("已恢复原始账目");
  };

  return (
    <div>
      <div className="sec-banner" style={cssVars({ "--accent": "var(--yellow)" })}>
        <span className="sb-num">03</span>
        <div className="sb-meta">
          <div className="sb-t">分账金额</div>
          <div className="sb-d">点金额直接改 · 选「谁付的」· 合计与结算实时刷新</div>
        </div>
        <div className="sb-actions">
          <button className="pbtn ghost" onClick={reset}>
            <Icons.swap sw={2.2} />
            恢复原始
          </button>
        </div>
      </div>

      <div className="metrics">
        <div className="metric">
          <div className="mk">实付合计</div>
          <div className="mv mono">{fmtMoney(total)}</div>
          <div className="ms">已抵扣 credit {fmtMoney(creditTotal)}</div>
        </div>
        <div className="metric">
          <div className="mk">每人均摊 ÷{TRAVELERS.length}</div>
          <div className="mv mono c-magenta">{fmtMoney(share)}</div>
          <div className="ms">两人各承担一半</div>
        </div>
        <div className="metric">
          <div className="mk">条目</div>
          <div className="mv">{expenses.length}</div>
          <div className="ms">Line items</div>
        </div>
      </div>

      <div className="block">
        <div className="card ledger-card">
          <div className="ledger-head">
            <span className="lh-t">花销明细 · Ledger</span>
            <span className="lh-hint">点金额可改 · 点头像换付款人</span>
          </div>

          {expenses.map((e) => {
            const cat = CATS[e.cat];
            const IconCmp = Icons[EXP_ICON[e.id] ?? "wallet"];
            return (
              <div key={e.id} className="exp-row">
                <div className="exp-top">
                  <span className="exp-tag" style={{ background: cat.color }}>
                    <IconCmp />
                  </span>
                  <span className="exp-name">
                    <span className="en">{e.name}</span>
                    <span className="es">{e.sub}</span>
                  </span>
                  <span className="amt-box">
                    <span className="amt-input">
                      <span className="cur">$</span>
                      <input
                        key={`${e.id}-${amtResetKey}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        defaultValue={e.amount}
                        aria-label={`${e.name} 金额`}
                        onChange={(ev) => setAmount(e.id, ev.target.value)}
                      />
                    </span>
                  </span>
                </div>
                <div className="exp-bottom">
                  <span className="payer-pick">
                    <span className="pp-lbl">谁付的</span>
                    <span className="payer-chips">
                      {TRAVELERS.map((m) => (
                        <button
                          key={m.id}
                          className={`payer-chip${e.payer === m.id ? " on" : ""}`}
                          onClick={() => setPayer(e.id, m.id)}
                        >
                          <Avatar m={m} size="xs" />
                          {m.name}
                        </button>
                      ))}
                    </span>
                  </span>
                  {e.credit ? (
                    <span className="credit-line">
                      IHG credit <span className="cl-amt">−{fmtMoney(appliedCredit(e))}</span>
                    </span>
                  ) : null}
                  <span className="exp-net">
                    实付 <b>{fmtMoney(net(e))}</b>
                  </span>
                </div>
              </div>
            );
          })}

          <div className="ledger-totals">
            <div className="trow">
              <span>小计 Subtotal</span>
              <span className="tv">{fmtMoney(subtotal)}</span>
            </div>
            <div className="trow credit">
              <span>Chase IHG credit</span>
              <span className="tv">−{fmtMoney(creditTotal)}</span>
            </div>
            <div className="trow grand">
              <span>实付合计 Net Total</span>
              <span className="tv">{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className="block-title" style={{ marginTop: 26 }}>
          <span>结算 · Settle up</span>
          <span className="bt-line" />
        </div>

        <div className="settle">
          <div className="settle-grid">
            {TRAVELERS.map((m) => {
              const p = paid[m.id] || 0;
              const bal = p - share;
              const owe = bal < -0.005;
              return (
                <div key={m.id} className="card settle-person">
                  <div className="sp-head">
                    <Avatar m={m} size="md" />
                    <div>
                      <div className="nm">{m.name}</div>
                      <div className="hd">@{m.handle}</div>
                    </div>
                  </div>
                  <div className="sp-rows">
                    <div className="sp-line">
                      <span>已垫付</span>
                      <span className="v">{fmtMoney(p)}</span>
                    </div>
                    <div className="sp-line">
                      <span>应承担</span>
                      <span className="v">{fmtMoney(share)}</span>
                    </div>
                  </div>
                  <div className={`sp-balance ${Math.abs(bal) < 0.005 ? "" : owe ? "owe" : "get"}`}>
                    <span>{Math.abs(bal) < 0.005 ? "已结清" : owe ? "需补付" : "应收回"}</span>
                    <span className="v">{fmtMoney(Math.abs(bal))}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="settle-result">
            <span className="sr-flag">结算</span>
            {ower && receiver ? (
              <span className="sr-txt sr-arrow">
                <span className="payer-chip on" style={{ pointerEvents: "none" }}>
                  <Avatar m={ower.m} size="xs" />
                  {ower.m.name}
                </span>
                <Icons.arrow sw={2.4} style={{ width: 18, height: 18, color: "var(--yellow)" }} />
                <span className="payer-chip on" style={{ pointerEvents: "none" }}>
                  <Avatar m={receiver.m} size="xs" />
                  {receiver.m.name}
                </span>
                转 <b>{fmtMoney(settleAmt)}</b>
              </span>
            ) : (
              <span className="sr-txt">两人已结清，无需互相转账。</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
