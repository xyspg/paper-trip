import { useState } from "react";
import { CATS, fmtMoney, TRAVELERS, uid } from "./adminData";
import type { Expense } from "./adminData";
import { ExpenseModal, buildExpense } from "./AddExpenseModal";
import type { NewExpenseInput } from "./AddExpenseModal";
import { Avatar } from "./Avatar";
import { EXP_ICON, Icons } from "./AdminIcons";
import { cssVars } from "./style";
import { useConfirm } from "./useConfirm";
import { PaymentSplit, splitFromExpense, splitToExpense } from "./PaymentSplit";
import type { SplitValue } from "./PaymentSplit";
import { appliedCredit, expenseBalances, expenseTotals, netExpense } from "../trip/expenses";
import type { ExpenseSplit } from "../trip/types";

type Props = {
  expenses: Expense[];
  onSetAmount: (id: string, amount: number) => void;
  onSetSplit: (id: string, payer: string, split?: ExpenseSplit) => void;
  onAdd: (expense: Expense) => void;
  onUpdate: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onReset: () => void;
};

export function SplitSection({
  expenses,
  onSetAmount,
  onSetSplit,
  onAdd,
  onUpdate,
  onDelete,
  onReset,
}: Props) {
  const [addOpen, setAddOpen] = useState(false);
  // The expense currently being edited (null = the modal is in add mode / closed).
  const [editing, setEditing] = useState<Expense | null>(null);
  const { confirm, confirmModal } = useConfirm();

  const handleCreate = (input: NewExpenseInput) => {
    onAdd(buildExpense(input, uid("exp")));
    setAddOpen(false);
  };

  const handleEdit = (input: NewExpenseInput) => {
    if (!editing) return;
    // Carry over fields the modal doesn't touch (id, credit) so editing the
    // name/amount/split never drops the IHG credit on a row.
    onUpdate({
      ...editing,
      cat: input.cat,
      name: input.name,
      sub: input.sub,
      amount: input.amount,
      payer: input.payer,
      split: input.split,
    });
    setEditing(null);
  };

  const handleDelete = async (e: Expense) => {
    const ok = await confirm({
      title: "删除条目",
      message: (
        <>
          确定删除花销条目<b>「{e.name}」</b>吗？删除后无法恢复。
        </>
      ),
      confirmLabel: "删除条目",
    });
    if (!ok) return;
    onDelete(e.id);
  };

  // Amount fields are uncontrolled (native decimal entry) and keyed by their synced
  // value, so a reset / remote change / rollback remounts them with the fresh value.
  // Commit on blur, not per keystroke, so typing a multi-digit number doesn't fire a
  // network write + broadcast per character; empty/invalid input is ignored and
  // negatives clamp to 0.
  const commitAmount = (e: Expense, v: string) => {
    const n = parseFloat(v);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, n);
    if (next !== (Number(e.amount) || 0)) onSetAmount(e.id, next);
  };

  const commitSplit = (e: Expense, v: SplitValue) => {
    const { payer, split } = splitToExpense(v);
    onSetSplit(e.id, payer, split);
  };

  const { subtotal, creditTotal, total } = expenseTotals(expenses);
  const balances = expenseBalances(
    expenses,
    TRAVELERS.map((m) => m.id),
  );
  const share = balances[0]?.share ?? 0;

  // settlement between the two travelers
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const travelerBalances = TRAVELERS.map((m) => ({
    m,
    paid: balanceById[m.id]?.paid ?? 0,
    bal: balanceById[m.id]?.balance ?? 0,
  }));
  const ower = travelerBalances.find((b) => b.bal < -0.005);
  const receiver = travelerBalances.find((b) => b.bal > 0.005);
  const settleAmt = ower ? Math.abs(ower.bal) : 0;

  return (
    <div>
      <div className="sec-banner" style={cssVars({ "--accent": "var(--yellow)" })}>
        <span className="sb-num">03</span>
        <div className="sb-meta">
          <div className="sb-t">分账金额</div>
          <div className="sb-d">点金额改完即保存 · 选「谁付的」· 合计与结算自动刷新</div>
        </div>
        <div className="sb-actions">
          <button className="pbtn solid" onClick={() => setAddOpen(true)}>
            <Icons.plus sw={2.4} />
            新增条目
          </button>
          <button className="pbtn ghost" onClick={onReset}>
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
                        key={`${e.id}-${e.amount}`}
                        type="number"
                        inputMode="decimal"
                        step="0.01"
                        min="0"
                        defaultValue={e.amount}
                        autoComplete="off"
                        data-1p-ignore
                        data-lpignore="true"
                        aria-label={`${e.name} 金额`}
                        onBlur={(ev) => commitAmount(e, ev.target.value)}
                        onKeyDown={(ev) => {
                          if (ev.key === "Enter") ev.currentTarget.blur();
                        }}
                      />
                    </span>
                  </span>
                </div>
                <div className="exp-bottom">
                  <span className="payer-pick">
                    <span className="pp-lbl">谁付的</span>
                    <PaymentSplit
                      value={splitFromExpense(e)}
                      onChange={(v) => commitSplit(e, v)}
                      amount={netExpense(e)}
                    />
                  </span>
                  {e.credit ? (
                    <span className="credit-line">
                      IHG credit <span className="cl-amt">−{fmtMoney(appliedCredit(e))}</span>
                    </span>
                  ) : null}
                  <span className="exp-net">
                    实付 <b>{fmtMoney(netExpense(e))}</b>
                  </span>
                  <button
                    className="exp-edit"
                    title="编辑条目"
                    aria-label={`编辑 ${e.name}`}
                    onClick={() => setEditing(e)}
                  >
                    <Icons.pencil sw={2.2} />
                  </button>
                  <button
                    className="exp-del"
                    title="删除条目"
                    aria-label={`删除 ${e.name}`}
                    onClick={() => handleDelete(e)}
                  >
                    <Icons.trash sw={2.2} />
                  </button>
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
            {travelerBalances.map(({ m, paid: p, bal }) => {
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

      <ExpenseModal isOpen={addOpen} onClose={() => setAddOpen(false)} onSubmit={handleCreate} />

      <ExpenseModal
        isOpen={editing !== null}
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />

      {confirmModal}
    </div>
  );
}
