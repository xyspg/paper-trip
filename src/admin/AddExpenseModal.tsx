import { useState } from "react";
import { AdminModal } from "./AdminModal";
import type { Expense, StopCat } from "./adminData";
import type {
  ExpenseAllocation as ExpenseAllocationValue,
  ExpenseItem,
  ExpenseSplit,
} from "../trip/types";
import { Icons } from "./AdminIcons";
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  CategoryChips,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "./adminUi";
import { PaymentSplit, defaultSplit, splitFromExpense, splitToExpense } from "./PaymentSplit";
import type { SplitValue } from "./PaymentSplit";
import { useAdmin } from "./AdminContext";
import { ExpenseAllocation } from "./ExpenseAllocation";
import { CurrencySelect, FxRateRow, useEntryFxRate } from "./CurrencyFields";
import { expenseAllocationMatches } from "../trip/expenses";
import { expenseCurrency, roundFxRate } from "../trip/currency";

export type NewExpenseInput = {
  name: string;
  sub: string;
  amount: number;
  cat: StopCat;
  payer: string;
  // Recorded currency + captured base-per-unit rate; absent = trip base
  // currency (see Expense in trip/types.ts).
  currency?: string;
  fxRate?: number;
  split?: ExpenseSplit;
  owedBy?: ExpenseAllocationValue;
  // Scanned-receipt breakdown, set only by the receipt scanner. The manual
  // add/edit form below never produces items.
  items?: ExpenseItem[];
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewExpenseInput) => void;
  // When set the modal opens in edit mode, pre-filled from the expense.
  initial?: Expense | null;
};

// Reset the form whenever the modal (re)opens or targets a different expense by
// keying the parent; this inner component always starts from fresh defaults.
function Form({ onClose, onSubmit, initial }: Omit<Props, "isOpen">) {
  const { travelers, currency: baseCurrency } = useAdmin();
  const editing = Boolean(initial);
  const initialCurrency = initial ? expenseCurrency(initial, baseCurrency) : baseCurrency;
  const [name, setName] = useState(initial?.name ?? "");
  const [sub, setSub] = useState(initial?.sub ?? "");
  const [amount, setAmount] = useState(initial ? String(initial.amount) : "");
  const [cat, setCat] = useState<StopCat>(initial?.cat ?? "event");
  const [currency, setCurrency] = useState(initialCurrency);
  // User-pinned rate; null falls back to the live quote. Editing keeps the
  // rate the expense was captured at instead of silently re-quoting it.
  const [fxOverride, setFxOverride] = useState<number | null>(initial?.fxRate ?? null);
  const [split, setSplit] = useState<SplitValue>(() =>
    initial ? splitFromExpense(initial) : defaultSplit(travelers),
  );
  const [owedBy, setOwedBy] = useState<ExpenseAllocationValue | undefined>(() =>
    initial?.owedBy ? { ...initial.owedBy } : undefined,
  );

  const foreign = currency !== baseCurrency;
  const fxRate = useEntryFxRate(baseCurrency, currency, fxOverride);
  const changeCurrency = (next: string) => {
    setCurrency(next);
    // Back on the original currency, restore its captured rate; any other
    // switch drops the override so the live quote prefills.
    setFxOverride(next === initialCurrency ? (initial?.fxRate ?? null) : null);
  };

  const parsed = Math.max(0, parseFloat(amount) || 0);
  const netAmount = Math.max(0, parsed - (initial?.credit ?? 0));
  const travelerIds = travelers.map((m) => m.id);
  const allocationValid = expenseAllocationMatches(owedBy, netAmount, travelerIds);
  const canSubmit = name.trim().length > 0 && allocationValid && (!foreign || fxRate != null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    const { payer, split: splitField } = splitToExpense(split, travelerIds);
    onSubmit({
      name: name.trim(),
      sub: sub.trim(),
      amount: parsed,
      cat,
      payer,
      currency: foreign ? currency : undefined,
      fxRate: foreign && fxRate != null ? roundFxRate(fxRate) : undefined,
      split: splitField,
      owedBy,
    });
  };

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <ModalHeader
        icon={editing ? <Icons.pencil sw={2.6} /> : <Icons.plus sw={2.6} />}
        title={editing ? "编辑花销条目" : "新增花销条目"}
        onClose={onClose}
      />

      <div className="grid grid-cols-2 gap-y-[15px] gap-x-[14px] p-[18px] max-[440px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>名称</span>
          <input
            className={FIELD_INPUT}
            value={name}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 景点门票 · 三日通票"
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>明细（可选）</span>
          <input
            className={FIELD_INPUT}
            value={sub}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 2 人 / 3 天"
            onChange={(e) => setSub(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>金额</span>
          <div className="grid grid-cols-[150px_1fr] gap-[7px] max-[440px]:grid-cols-1">
            <CurrencySelect value={currency} onChange={changeCurrency} />
            <input
              className={FIELD_INPUT}
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0"
              value={amount}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder="0.00"
              aria-label="金额"
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <FxRateRow
            base={baseCurrency}
            currency={currency}
            rate={foreign ? fxRate : null}
            onRate={setFxOverride}
            amount={parsed}
          />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>谁付的（垫付）</span>
          <PaymentSplit
            value={split}
            onChange={setSplit}
            amount={netAmount}
            travelers={travelers}
            currency={currency}
          />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>谁承担（每人金额）</span>
          <ExpenseAllocation
            value={owedBy}
            onChange={setOwedBy}
            amount={netAmount}
            travelers={travelers}
            currency={currency}
          />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>类别</span>
          <CategoryChips value={cat} onChange={setCat} />
        </div>
      </div>

      <ModalFooter>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button
          type="submit"
          className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}
          disabled={!canSubmit}
        >
          {editing ? <Icons.check sw={2.6} /> : <Icons.plus sw={2.6} />}
          {editing ? "保存修改" : "添加条目"}
        </button>
      </ModalFooter>
    </form>
  );
}

export function ExpenseModal({ isOpen, onClose, onSubmit, initial }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose}>
      <Form
        key={`${initial?.id ?? "new"}-${String(isOpen)}`}
        onClose={onClose}
        onSubmit={onSubmit}
        initial={initial}
      />
    </AdminModal>
  );
}

export function buildExpense(input: NewExpenseInput, id: string): Expense {
  return {
    id,
    cat: input.cat,
    name: input.name,
    sub: input.sub,
    amount: input.amount,
    credit: 0,
    payer: input.payer,
    currency: input.currency,
    fxRate: input.fxRate,
    split: input.split,
    owedBy: input.owedBy,
    items: input.items,
  };
}
