import { useState } from "react";
import { CATS, fmtMoney, uid } from "./adminData";
import type { Expense } from "./adminData";
import { ExpenseModal, buildExpense } from "./AddExpenseModal";
import type { NewExpenseInput } from "./AddExpenseModal";
import { ReceiptScanModal } from "./ReceiptScanModal";
import { ExpenseItems } from "./ExpenseItems";
import { Avatar } from "./Avatar";
import { EXP_ICON, Icons } from "./AdminIcons";
import { BTN, BTN_GHOST, BTN_INK, Metrics, SectionHead } from "./adminUi";
import { useConfirm } from "./useConfirm";
import { useAdmin } from "./AdminContext";
import { PaymentSplit, splitFromExpense, splitToExpense } from "./PaymentSplit";
import type { SplitValue } from "./PaymentSplit";
import { PaymentModal, buildPayment } from "./PaymentModal";
import type { NewPaymentInput } from "./PaymentModal";
import {
  appliedCredit,
  expenseBalances,
  expenseFxRate,
  expenseOwedBy,
  expenseTotals,
  netExpense,
  settlementTransfers,
} from "../trip/expenses";
import { currencySymbol, expenseCurrency } from "../trip/currency";
import type { ExpenseSplit, Payment } from "../trip/types";

type Props = {
  expenses: Expense[];
  payments: Payment[];
  onSetAmount: (id: string, amount: number) => void;
  onSetSplit: (id: string, payer: string, split?: ExpenseSplit) => void;
  onAdd: (expense: Expense) => void;
  onUpdate: (expense: Expense) => void;
  onDelete: (id: string) => void;
  onAddPayment: (payment: Payment) => void;
  onDeletePayment: (id: string) => void;
  onReset: () => void;
};

export function SplitSection({
  expenses,
  payments,
  onSetAmount,
  onSetSplit,
  onAdd,
  onUpdate,
  onDelete,
  onAddPayment,
  onDeletePayment,
  onReset,
}: Props) {
  const { travelers, currency } = useAdmin();
  const travelerIds = travelers.map((m) => m.id);
  const [addOpen, setAddOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  // The expense currently being edited (null = the modal is in add mode / closed).
  const [editing, setEditing] = useState<Expense | null>(null);
  const { confirm, confirmModal } = useConfirm();

  const addExpense = (input: NewExpenseInput) => onAdd(buildExpense(input, uid("exp")));

  const handleEdit = (input: NewExpenseInput) => {
    if (!editing) return;
    // Carry over fields the modal doesn't touch (id, credit) so editing the
    // name/amount/split never drops the credit on a row. The scanned-receipt
    // `items` breakdown is kept only when the amount is unchanged: the manual
    // form has no items UI, so once the total is edited the per-dish prices no
    // longer sum to it, and a stale breakdown that contradicts the total (shown
    // read-only on the ledger and PDF) is worse than none.
    onUpdate({
      ...editing,
      cat: input.cat,
      name: input.name,
      sub: input.sub,
      amount: input.amount,
      payer: input.payer,
      currency: input.currency,
      fxRate: input.fxRate,
      split: input.split,
      owedBy: input.owedBy,
      items: input.amount === editing.amount ? editing.items : undefined,
    });
    setEditing(null);
  };

  const handleReset = async () => {
    const ok = await confirm({
      title: "恢复原始账目",
      message: (
        <>
          这会丢弃<b>所有</b>改动，把分账明细恢复成初始数据，且<b>无法撤销</b>。
        </>
      ),
      confirmLabel: "恢复原始",
      requirePhrase: "restore to original",
    });
    if (!ok) return;
    onReset();
  };

  const addPayment = (input: NewPaymentInput) => {
    onAddPayment(buildPayment(input, uid("pay")));
    setPayOpen(false);
  };

  const handleDeletePayment = async (p: Payment) => {
    const ok = await confirm({
      title: "删除还款记录",
      message: (
        <>
          确定删除这笔<b>{fmtMoney(p.amount, expenseCurrency(p, currency))}</b>
          的还款记录吗？删除后对应欠款会重新计入待结算。
        </>
      ),
      confirmLabel: "删除记录",
    });
    if (!ok) return;
    onDeletePayment(p.id);
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
    const { payer, split } = splitToExpense(v, travelerIds);
    onSetSplit(e.id, payer, split);
  };

  const { subtotal, creditTotal, total } = expenseTotals(expenses, currency);
  const balances = expenseBalances(expenses, travelerIds, currency, payments);
  const transfers = settlementTransfers(balances);
  const outstanding = balances.reduce((sum, balance) => sum + Math.max(0, -balance.balance), 0);

  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const travelerBalances = travelers.map((m) => ({
    m,
    paid: balanceById[m.id]?.paid ?? 0,
    bal: balanceById[m.id]?.balance ?? 0,
    share: balanceById[m.id]?.share ?? 0,
    repaid: balanceById[m.id]?.repaid ?? 0,
    received: balanceById[m.id]?.received ?? 0,
  }));
  const travelerById = Object.fromEntries(travelers.map((traveler) => [traveler.id, traveler]));

  return (
    <div>
      <SectionHead
        kicker="03 · Split"
        title="分账金额"
        desc="每笔分别设置谁垫付、每个人承担多少；默认 AA，也可以精确到个人金额"
        actions={
          <>
            <button className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`} onClick={handleReset}>
              <Icons.swap sw={2.2} />
              恢复原始
            </button>
            <button
              className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`}
              onClick={() => setScanOpen(true)}
            >
              <Icons.camera sw={2.2} />
              扫描收据
            </button>
            <button
              className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}
              onClick={() => setAddOpen(true)}
            >
              <Icons.plus sw={2.4} />
              新增条目
            </button>
          </>
        }
      />

      <Metrics
        items={[
          {
            k: `实付合计 (${currency})`,
            v: fmtMoney(total, currency),
            sub: `已抵扣 credit ${fmtMoney(creditTotal, currency)}`,
          },
          {
            k: "待结算",
            v: fmtMoney(outstanding, currency),
            sub: transfers.length > 0 ? `${transfers.length} 笔转账可结清` : "已结清",
            color: outstanding > 0.005 ? "#c2553f" : "#3f6f5b",
          },
          { k: "条目", v: expenses.length, sub: "Line items" },
        ]}
      />

      {/* ledger */}
      <div className="mt-8 bg-white border border-[#ebe9e3] rounded-[14px] overflow-hidden">
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#ebe9e3] bg-[#fdfdfb]">
          <span className="font-grotesk font-bold text-[11px] tracking-[0.14em] uppercase">
            花销明细 · Ledger
          </span>
          <span className="ml-auto font-grotesk text-[10px] tracking-[0.04em] uppercase text-[#9b988f]">
            点金额可改 · 铅笔内设置每人承担
          </span>
        </div>

        {expenses.map((e) => {
          const cat = CATS[e.cat];
          const IconCmp = Icons[EXP_ICON[e.id] ?? "wallet"];
          const owedBy = expenseOwedBy(e, travelerIds);
          const responsible = travelers.filter((traveler) => (owedBy[traveler.id] ?? 0) > 0.005);
          // The row's own recorded currency; foreign rows also show the
          // base-currency equivalent at the captured rate.
          const rowCurrency = expenseCurrency(e, currency);
          const foreign = rowCurrency !== currency;
          return (
            <div
              key={e.id}
              className="px-4 py-4 border-b border-dashed border-[#ebe9e3] last:border-0"
            >
              <div className="flex items-start gap-3">
                <span
                  className="shrink-0 w-9 h-9 rounded-[10px] grid place-items-center text-white [&_svg]:size-[18px]"
                  style={{ background: cat.color }}
                >
                  <IconCmp />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-cjk font-bold text-[15px] leading-snug">
                    {e.name}
                  </span>
                  <span className="block font-cjk text-[12px] text-[#76726a] mt-0.5">{e.sub}</span>
                </span>
                <span className="shrink-0 inline-flex items-center border border-[#ebe9e3] rounded-[10px] bg-white px-2.5 py-1 focus-within:border-[#1c1b19] transition-colors">
                  <span className="font-sans text-[14px] text-[#9b988f]">
                    {currencySymbol(rowCurrency)}
                  </span>
                  <input
                    key={`${e.id}-${e.amount}`}
                    className="w-[84px] border-0 outline-none bg-transparent font-sans font-bold text-[15px] text-right text-[#1c1b19] [appearance:textfield] [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-0"
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
              </div>
              <ExpenseItems items={e.items} travelers={travelers} currency={rowCurrency} />
              <div className="flex flex-col items-start gap-2 mt-3">
                <span className="font-grotesk text-[10px] tracking-[0.1em] uppercase text-[#9b988f]">
                  谁承担
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {responsible.map((traveler) => (
                    <span
                      key={traveler.id}
                      className="inline-flex items-center gap-1.5 border border-[#ebe9e3] rounded-full bg-[#fdfdfb] py-[3px] pr-2.5 pl-1 font-cjk font-semibold text-[12px]"
                    >
                      <Avatar m={traveler} size="xs" />
                      {traveler.name}
                      <b className="font-sans font-bold text-[#1c1b19]">
                        {fmtMoney(owedBy[traveler.id] ?? 0, rowCurrency)}
                      </b>
                    </span>
                  ))}
                </span>
              </div>
              <div className="flex items-start gap-x-4 gap-y-2.5 flex-wrap mt-3">
                <span className="flex flex-col items-start gap-2 w-full">
                  <span className="font-grotesk text-[10px] tracking-[0.1em] uppercase text-[#9b988f]">
                    谁付的
                  </span>
                  <PaymentSplit
                    travelers={travelers}
                    value={splitFromExpense(e)}
                    onChange={(v) => commitSplit(e, v)}
                    amount={netExpense(e)}
                    currency={rowCurrency}
                  />
                </span>
                {e.credit ? (
                  <span className="inline-flex items-center gap-1.5 font-grotesk text-[10px] tracking-[0.06em] uppercase whitespace-nowrap text-[#3f6f5b] bg-[#eef4f0] border border-[#cfe0d6] rounded-full px-2.5 py-1">
                    Credit{" "}
                    <span className="font-sans">−{fmtMoney(appliedCredit(e), rowCurrency)}</span>
                  </span>
                ) : null}
                <span className="ml-auto font-cjk font-semibold text-[12.5px] text-[#76726a]">
                  实付{" "}
                  <b className="font-sans font-bold text-[#1c1b19] text-[14px]">
                    {fmtMoney(netExpense(e), rowCurrency)}
                  </b>
                  {foreign && (
                    <span className="ml-1.5 font-sans text-[11.5px] text-[#9b988f]">
                      ≈ {fmtMoney(netExpense(e) * expenseFxRate(e), currency)}
                    </span>
                  )}
                </span>
                <button
                  className="shrink-0 w-8 h-8 grid place-items-center border border-[#ebe9e3] rounded-[9px] bg-white text-[#76726a] hover:border-[#1c1b19] hover:text-[#1c1b19] transition-colors [&_svg]:size-4"
                  title="编辑条目"
                  aria-label={`编辑 ${e.name}`}
                  onClick={() => setEditing(e)}
                >
                  <Icons.pencil sw={2.2} />
                </button>
                <button
                  className="shrink-0 w-8 h-8 grid place-items-center border border-[#ecccc2] rounded-[9px] bg-white text-[#c2553f] hover:bg-[#c2553f] hover:text-white transition-colors [&_svg]:size-4"
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

        <div className="bg-[#eef4f0] border-t border-[#ebe9e3]">
          <div className="flex items-center justify-between px-4 py-2.5 font-cjk font-semibold text-[13.5px]">
            <span>小计 Subtotal ({currency})</span>
            <span className="font-sans">{fmtMoney(subtotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 font-cjk font-semibold text-[13.5px] text-[#3f6f5b]">
            <span>抵扣 Credit</span>
            <span className="font-sans">−{fmtMoney(creditTotal, currency)}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3.5 bg-[#1c1b19] text-[#fafaf8] font-sans font-bold tracking-[0.02em] text-[16px]">
            <span>实付合计 Net Total</span>
            <span className="font-sans text-[20px] text-white">{fmtMoney(total, currency)}</span>
          </div>
        </div>
      </div>

      {/* settle */}
      <div className="flex items-center gap-2.5 mt-8 mb-4">
        <span className="font-grotesk font-bold text-[11px] tracking-[0.14em] uppercase">
          结算 · Settle up
        </span>
        <span className="flex-1 h-px bg-[repeating-linear-gradient(90deg,#cfccc2_0_5px,transparent_5px_10px)]" />
        <button className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`} onClick={() => setPayOpen(true)}>
          <Icons.plus sw={2.4} />
          记录还款
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3.5 max-[620px]:grid-cols-1">
        {travelerBalances.map(({ m, paid: p, bal, share: sh, repaid, received }) => {
          const owe = bal < -0.005;
          const settled = Math.abs(bal) < 0.005;
          return (
            <div key={m.id} className="bg-white border border-[#ebe9e3] rounded-[14px] p-4">
              <div className="flex items-center gap-2.5">
                <Avatar m={m} size="md" />
                <div>
                  <div className="font-cjk font-bold text-[15px]">{m.name}</div>
                  <div className="font-mono text-[11px] text-[#9b988f]">@{m.handle}</div>
                </div>
              </div>
              <div className="grid gap-1.5 mt-3.5">
                <div className="flex items-center justify-between font-cjk font-medium text-[12.5px] text-[#76726a]">
                  <span>已垫付</span>
                  <span className="font-sans text-[#1c1b19]">{fmtMoney(p, currency)}</span>
                </div>
                <div className="flex items-center justify-between font-cjk font-medium text-[12.5px] text-[#76726a]">
                  <span>应承担</span>
                  <span className="font-sans text-[#1c1b19]">{fmtMoney(sh, currency)}</span>
                </div>
                {repaid > 0.005 && (
                  <div className="flex items-center justify-between font-cjk font-medium text-[12.5px] text-[#76726a]">
                    <span>已还款</span>
                    <span className="font-sans text-[#3f6f5b]">{fmtMoney(repaid, currency)}</span>
                  </div>
                )}
                {received > 0.005 && (
                  <div className="flex items-center justify-between font-cjk font-medium text-[12.5px] text-[#76726a]">
                    <span>已收款</span>
                    <span className="font-sans text-[#3f6f5b]">{fmtMoney(received, currency)}</span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-dashed border-[#ebe9e3] font-cjk font-bold text-[13.5px]">
                <span>{settled ? "已结清" : owe ? "需补付" : "应收回"}</span>
                <span
                  className="font-sans text-[16px]"
                  style={{ color: settled ? undefined : owe ? "#c2553f" : "#3f6f5b" }}
                >
                  {fmtMoney(Math.abs(bal), currency)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {payments.length > 0 && (
        <div className="mt-4 bg-white border border-[#ebe9e3] rounded-[14px] overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#ebe9e3] bg-[#fdfdfb]">
            <span className="font-grotesk font-bold text-[11px] tracking-[0.14em] uppercase">
              还款记录 · Payments
            </span>
            <span className="ml-auto font-grotesk text-[10px] tracking-[0.04em] uppercase text-[#9b988f]">
              {payments.length} 笔
            </span>
          </div>
          {payments.map((p) => {
            const from = travelerById[p.from];
            const to = travelerById[p.to];
            const rowCurrency = expenseCurrency(p, currency);
            const foreign = rowCurrency !== currency;
            return (
              <div
                key={p.id}
                className="flex items-center gap-2.5 flex-wrap px-4 py-3 border-b border-dashed border-[#ebe9e3] last:border-0"
              >
                <span className="inline-flex items-center gap-1.5 border border-[#ebe9e3] rounded-full bg-[#fdfdfb] py-[3px] pr-2.5 pl-1 font-cjk font-semibold text-[12.5px]">
                  {from && <Avatar m={from} size="xs" />}
                  {from?.name ?? p.from}
                </span>
                <Icons.arrow sw={2.4} style={{ width: 16, height: 16 }} />
                <span className="inline-flex items-center gap-1.5 border border-[#ebe9e3] rounded-full bg-[#fdfdfb] py-[3px] pr-2.5 pl-1 font-cjk font-semibold text-[12.5px]">
                  {to && <Avatar m={to} size="xs" />}
                  {to?.name ?? p.to}
                </span>
                <b className="font-sans font-bold text-[14px] text-[#1c1b19]">
                  {fmtMoney(p.amount, rowCurrency)}
                </b>
                {foreign && (
                  <span className="font-sans text-[11.5px] text-[#9b988f]">
                    ≈ {fmtMoney(p.amount * expenseFxRate(p), currency)}
                  </span>
                )}
                <span className="font-cjk text-[12px] text-[#9b988f]">
                  {[p.date, p.note].filter(Boolean).join(" · ")}
                </span>
                <button
                  className="ml-auto shrink-0 w-8 h-8 grid place-items-center border border-[#ecccc2] rounded-[9px] bg-white text-[#c2553f] hover:bg-[#c2553f] hover:text-white transition-colors [&_svg]:size-4"
                  title="删除还款记录"
                  aria-label="删除还款记录"
                  onClick={() => handleDeletePayment(p)}
                >
                  <Icons.trash sw={2.2} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="mt-4 px-5 py-4 bg-[#1c1b19] text-[#fafaf8] rounded-[14px] flex items-center gap-3.5 flex-wrap"
        style={{ boxShadow: "0 18px 40px -18px rgba(20,20,30,0.6)" }}
      >
        <span className="font-grotesk font-bold text-[11px] tracking-[0.14em] uppercase bg-[#3f6f5b] text-white px-2.5 py-1 rounded-full">
          结算
        </span>
        {transfers.length > 0 ? (
          <span className="flex flex-col gap-2">
            {transfers.map((transfer, index) => {
              const from = travelerById[transfer.from];
              const to = travelerById[transfer.to];
              if (!from || !to) return null;
              return (
                <span
                  key={`${transfer.from}-${transfer.to}-${index}`}
                  className="font-cjk font-semibold text-[14px] inline-flex items-center gap-2.5 flex-wrap"
                >
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.12] border border-white/20 pl-1 pr-2.5 py-0.5">
                    <Avatar m={from} size="xs" />
                    {from.name}
                  </span>
                  <Icons.arrow sw={2.4} style={{ width: 18, height: 18 }} />
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.12] border border-white/20 pl-1 pr-2.5 py-0.5">
                    <Avatar m={to} size="xs" />
                    {to.name}
                  </span>
                  转 <b className="font-sans text-white">{fmtMoney(transfer.amount, currency)}</b>
                </span>
              );
            })}
          </span>
        ) : (
          <span className="font-cjk font-semibold text-[14px]">所有人已结清，无需互相转账。</span>
        )}
      </div>

      <ReceiptScanModal
        isOpen={scanOpen}
        onClose={() => setScanOpen(false)}
        onSubmit={(input) => {
          addExpense(input);
          setScanOpen(false);
        }}
      />

      <ExpenseModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={(input) => {
          addExpense(input);
          setAddOpen(false);
        }}
      />

      <ExpenseModal
        isOpen={editing !== null}
        initial={editing}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />

      <PaymentModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        onSubmit={addPayment}
        suggest={transfers[0] ? { from: transfers[0].from, to: transfers[0].to } : null}
      />

      {confirmModal}
    </div>
  );
}
