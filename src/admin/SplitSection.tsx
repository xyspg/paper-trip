import { useState } from "react";
import { CATS, fmtMoney, TRAVELER_IDS, TRAVELERS, uid } from "./adminData";
import type { Expense } from "./adminData";
import { ExpenseModal, buildExpense } from "./AddExpenseModal";
import type { NewExpenseInput } from "./AddExpenseModal";
import { ReceiptScanModal } from "./ReceiptScanModal";
import { ExpenseItems } from "./ExpenseItems";
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
  const [scanOpen, setScanOpen] = useState(false);
  // The expense currently being edited (null = the modal is in add mode / closed).
  const [editing, setEditing] = useState<Expense | null>(null);
  const { confirm, confirmModal } = useConfirm();

  const addExpense = (input: NewExpenseInput) => onAdd(buildExpense(input, uid("exp")));

  const handleEdit = (input: NewExpenseInput) => {
    if (!editing) return;
    // Carry over fields the modal doesn't touch (id, credit) so editing the
    // name/amount/split never drops the IHG credit on a row. The scanned-receipt
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
      split: input.split,
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
    })
    if (!ok) return
    onReset()
  }

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
  const balances = expenseBalances(expenses, TRAVELER_IDS);

  // settlement between the two travelers
  const balanceById = Object.fromEntries(balances.map((b) => [b.id, b]));
  const travelerBalances = TRAVELERS.map((m) => ({
    m,
    paid: balanceById[m.id]?.paid ?? 0,
    bal: balanceById[m.id]?.balance ?? 0,
    share: balanceById[m.id]?.share ?? 0,
  }));
  const ower = travelerBalances.find((b) => b.bal < -0.005);
  const receiver = travelerBalances.find((b) => b.bal > 0.005);
  const settleAmt = ower ? Math.abs(ower.bal) : 0;

  return (
    <div>
      <div className="relative bg-ink text-paper border-[3px] border-ink rounded-card shadow-hard-sm py-[18px] px-[clamp(18px,3vw,26px)] overflow-hidden isolate flex items-center gap-4 flex-wrap before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_24px,rgba(255,255,255,0.04)_24px_26px)]" style={cssVars({ "--accent": "var(--color-yellow)" })}>
        <span className="shrink-0 font-display font-black text-[24px] leading-none text-ink bg-[var(--accent,var(--color-yellow))] border-2 border-paper rounded-[10px] w-12 h-12 grid place-items-center">03</span>
        <div className="min-w-0">
          <div className="font-display font-black text-[clamp(19px,3vw,26px)] uppercase tracking-[0.01em] leading-none">分账金额</div>
          <div className="font-cjk font-medium text-[13px] text-paper/72 mt-[7px]">点金额改完即保存 · 选「谁付的」· 合计与结算自动刷新</div>
        </div>
        <div className="ml-auto flex gap-[9px] flex-wrap">
          <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:w-3.5 [&_svg]:h-3.5 bg-ink text-paper shadow-[3px_3px_0_rgba(0,0,0,0.25)] hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none" onClick={() => setScanOpen(true)}>
            <Icons.camera sw={2.2} />
            扫描收据
          </button>
          <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:w-3.5 [&_svg]:h-3.5 bg-[var(--accent,var(--color-yellow))] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none" onClick={() => setAddOpen(true)}>
            <Icons.plus sw={2.4} />
            新增条目
          </button>
          <button className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:w-3.5 [&_svg]:h-3.5 bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-sm active:translate-x-[3px] active:translate-y-[3px] active:shadow-none" onClick={handleReset}>
            <Icons.swap sw={2.2} />
            恢复原始
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-0 mt-4 bg-paper-2 border-[3px] border-ink rounded-card shadow-hard-sm overflow-hidden">
        <div className="py-4 px-[18px] border-r-2 border-r-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:border-b-ink max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">实付合计</div>
          <div className="font-mono font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px] tracking-[-0.02em]">{fmtMoney(total)}</div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">已抵扣 credit {fmtMoney(creditTotal)}</div>
        </div>
        <div className="py-4 px-[18px] border-r-2 border-r-ink last:border-r-0 max-[560px]:border-r-0 max-[560px]:border-b-2 max-[560px]:border-b-ink max-[560px]:last:border-b-0">
          <div className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">条目</div>
          <div className="font-display font-black text-[clamp(24px,4vw,32px)] leading-none mt-[9px]">{expenses.length}</div>
          <div className="font-cjk font-medium text-[11.5px] text-ink-soft mt-1.5">Line items</div>
        </div>
      </div>

      <div className="mt-[clamp(20px,4vw,30px)]">
        <div className="bg-paper-2 border-[3px] border-ink rounded-card shadow-hard overflow-hidden">
          <div className="flex items-center gap-2.5 py-[13px] px-[17px] bg-ink text-paper">
            <span className="font-display font-extrabold text-[13px] tracking-[0.14em] uppercase">花销明细 · Ledger</span>
            <span className="ml-auto font-grotesk font-bold text-[10.5px] tracking-[0.06em] uppercase text-paper/60">点金额可改 · 点头像换付款人</span>
          </div>

          {expenses.map((e) => {
            const cat = CATS[e.cat];
            const IconCmp = Icons[EXP_ICON[e.id] ?? "wallet"];
            return (
              <div key={e.id} className="py-[15px] px-[17px] border-b-2 border-dashed border-b-[#e4ddcd] last-of-type:border-b-0">
                <div className="flex items-start gap-3">
                  <span className="shrink-0 w-[38px] h-[38px] rounded-[10px] border-2 border-ink grid place-items-center [&_svg]:w-5 [&_svg]:h-5" style={{ background: cat.color }}>
                    <IconCmp />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="font-cjk font-black text-[15.5px] leading-[1.25]">{e.name}</span>
                    <span className="font-cjk font-medium text-[12px] text-ink-soft mt-[3px] ml-[5px]">{e.sub}</span>
                  </span>
                  <span className="shrink-0 w-auto pl-0 mt-0">
                    <span className="inline-flex items-center border-2 border-ink rounded-[10px] bg-paper py-1 pr-2.5 pl-[9px] shadow-[3px_3px_0_var(--color-ink)] focus-within:shadow-hard-sm">
                      <span className="font-mono font-bold text-[15px] text-ink-soft">$</span>
                      <input
                        key={`${e.id}-${e.amount}`}
                        className="w-[84px] border-none outline-none bg-transparent font-mono font-bold text-[16px] text-right text-ink [-moz-appearance:textfield] [&::-webkit-outer-spin-button]:[-webkit-appearance:none] [&::-webkit-outer-spin-button]:m-0 [&::-webkit-inner-spin-button]:[-webkit-appearance:none] [&::-webkit-inner-spin-button]:m-0"
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
                <ExpenseItems items={e.items} />
                <div className="flex items-center gap-y-2.5 gap-x-4 flex-wrap mt-3">
                  <span className="flex flex-col items-start gap-2 w-full">
                    <span className="font-grotesk font-extrabold text-[10px] tracking-[0.1em] uppercase text-ink-soft">谁付的</span>
                    <PaymentSplit
                      value={splitFromExpense(e)}
                      onChange={(v) => commitSplit(e, v)}
                      amount={netExpense(e)}
                    />
                  </span>
                  {e.credit ? (
                    <span className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[10px] tracking-[0.06em] uppercase whitespace-nowrap text-green bg-[color-mix(in_srgb,var(--color-green)_14%,#fff)] border-2 border-green rounded-full py-[3px] px-2.5">
                      IHG credit <span className="font-mono">−{fmtMoney(appliedCredit(e))}</span>
                    </span>
                  ) : null}
                  <span className="ml-auto font-cjk font-bold text-[12.5px] text-ink-soft">
                    实付 <b className="font-mono font-bold text-ink text-[14px]">{fmtMoney(netExpense(e))}</b>
                  </span>
                  <button
                    className="shrink-0 w-8 h-8 grid place-items-center border-2 border-ink rounded-[9px] bg-paper text-ink-soft cursor-pointer shadow-[3px_3px_0_var(--color-ink)] [transition:background_0.12s,color_0.12s,transform_0.12s] [&_svg]:w-4 [&_svg]:h-4 ml-auto hover:bg-yellow hover:text-ink hover:-translate-x-px hover:-translate-y-px"
                    title="编辑条目"
                    aria-label={`编辑 ${e.name}`}
                    onClick={() => setEditing(e)}
                  >
                    <Icons.pencil sw={2.2} />
                  </button>
                  <button
                    className="shrink-0 w-8 h-8 grid place-items-center border-2 border-ink rounded-[9px] bg-paper text-ink-soft cursor-pointer shadow-[3px_3px_0_var(--color-ink)] [transition:background_0.12s,color_0.12s,transform_0.12s] [&_svg]:w-4 [&_svg]:h-4 ml-2 hover:bg-magenta hover:text-ink hover:-translate-x-px hover:-translate-y-px"
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

          <div className="bg-[color-mix(in_srgb,var(--color-yellow)_13%,var(--color-paper-2))] border-t-[3px] border-t-ink">
            <div className="flex items-center justify-between py-[11px] px-[17px] font-cjk font-bold text-[13.5px]">
              <span>小计 Subtotal</span>
              <span className="font-mono font-bold">{fmtMoney(subtotal)}</span>
            </div>
            <div className="flex items-center justify-between py-[11px] px-[17px] font-cjk font-bold text-[13.5px] text-green">
              <span>Chase IHG credit</span>
              <span className="font-mono font-bold text-green">−{fmtMoney(creditTotal)}</span>
            </div>
            <div className="flex items-center justify-between px-[17px] py-3.5 bg-ink text-paper font-display font-black uppercase tracking-[0.04em] text-[clamp(14px,3vw,17px)]">
              <span>实付合计 Net Total</span>
              <span className="font-mono font-bold text-[clamp(17px,4vw,22px)] text-yellow">{fmtMoney(total)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-3.5 font-display font-extrabold text-[13px] tracking-[0.14em] uppercase" style={{ marginTop: 26 }}>
          <span>结算 · Settle up</span>
          <span className="flex-1 h-0.5 bg-[repeating-linear-gradient(90deg,var(--color-ink)_0_7px,transparent_7px_13px)]" />
        </div>

        <div className="mt-4">
          <div className="grid grid-cols-2 gap-3.5 max-[620px]:grid-cols-1">
            {travelerBalances.map(({ m, paid: p, bal, share: sh }) => {
              const owe = bal < -0.005;
              return (
                <div key={m.id} className="bg-paper-2 border-[3px] border-ink rounded-card shadow-hard overflow-hidden py-[15px] px-4 [&:not(:first-child)]:mt-4">
                  <div className="flex items-center gap-2.5">
                    <Avatar m={m} size="md" />
                    <div>
                      <div className="font-cjk font-black text-[15px]">{m.name}</div>
                      <div className="font-mono font-normal text-[11px] text-ink-soft">@{m.handle}</div>
                    </div>
                  </div>
                  <div className="mt-[13px] grid gap-[7px]">
                    <div className="flex items-center justify-between font-cjk font-semibold text-[12.5px] text-ink-soft">
                      <span>已垫付</span>
                      <span className="font-mono font-bold text-ink">{fmtMoney(p)}</span>
                    </div>
                    <div className="flex items-center justify-between font-cjk font-semibold text-[12.5px] text-ink-soft">
                      <span>应承担</span>
                      <span className="font-mono font-bold text-ink">{fmtMoney(sh)}</span>
                    </div>
                  </div>
                  <div className="mt-[11px] pt-[11px] border-t-2 border-dashed border-t-[#e4ddcd] flex items-center justify-between font-cjk font-black text-[13.5px]">
                    <span>{Math.abs(bal) < 0.005 ? "已结清" : owe ? "需补付" : "应收回"}</span>
                    <span className={`font-mono font-bold text-[16px] ${Math.abs(bal) < 0.005 ? "" : owe ? "text-magenta" : "text-green"}`}>{fmtMoney(Math.abs(bal))}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3.5 py-4 px-[18px] bg-ink text-paper border-[3px] border-ink rounded-card shadow-hard-sm flex items-center gap-3.5 flex-wrap">
            <span className="font-grotesk font-extrabold text-[11px] tracking-[0.14em] uppercase bg-yellow text-ink py-[5px] px-[11px] rounded-full">结算</span>
            {ower && receiver ? (
              <span className="inline-flex items-center gap-[9px] font-cjk font-bold text-[14px]">
                <span className="inline-flex items-center gap-1.5 cursor-pointer border-2 border-ink rounded-full py-[3px] pr-2.5 pl-1 font-cjk font-bold text-[12px] bg-ink text-paper" style={{ pointerEvents: "none" }}>
                  <Avatar m={ower.m} size="xs" />
                  {ower.m.name}
                </span>
                <Icons.arrow sw={2.4} style={{ width: 18, height: 18, color: "var(--color-yellow)" }} />
                <span className="inline-flex items-center gap-1.5 cursor-pointer border-2 border-ink rounded-full py-[3px] pr-2.5 pl-1 font-cjk font-bold text-[12px] bg-ink text-paper" style={{ pointerEvents: "none" }}>
                  <Avatar m={receiver.m} size="xs" />
                  {receiver.m.name}
                </span>
                转 <b className="font-mono font-bold text-yellow">{fmtMoney(settleAmt)}</b>
              </span>
            ) : (
              <span className="font-cjk font-bold text-[14px]">两人已结清，无需互相转账。</span>
            )}
          </div>
        </div>
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

      {confirmModal}
    </div>
  );
}
