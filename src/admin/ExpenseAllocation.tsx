import { useState } from "react";
import type { ExpenseAllocation as ExpenseAllocationValue } from "../trip/types";
import {
  evenExpenseAllocation,
  expenseAllocationMatches,
  expenseAllocationTotal,
  fullExpenseAllocation,
} from "../trip/expenses";
import { Avatar } from "./Avatar";
import type { AdminMember } from "./adminData";
import { fmtMoney, round2 } from "./adminData";
import { DEFAULT_CURRENCY, currencyDecimals, currencySymbol } from "../trip/currency";
import { BTN_GHOST, BTN_SM } from "./adminUi";
import { Icons } from "./AdminIcons";

type Props = {
  amount: number;
  travelers: AdminMember[];
  value?: ExpenseAllocationValue;
  onChange: (value?: ExpenseAllocationValue) => void;
  // Currency the amounts are recorded in (the expense's own currency).
  currency?: string;
};

function AllocationInput({
  member,
  value,
  symbol,
  decimals,
  onCommit,
  onTakeFullAmount,
}: {
  member: AdminMember;
  value: number;
  symbol: string;
  decimals: number;
  onCommit: (value: number) => void;
  onTakeFullAmount: () => void;
}) {
  const [draft, setDraft] = useState(value ? String(value) : "");
  const factor = 10 ** decimals;
  const commit = () => {
    const parsed = parseFloat(draft);
    const next = Number.isFinite(parsed) ? Math.round(Math.max(0, parsed) * factor) / factor : 0;
    setDraft(next ? String(next) : "");
    onCommit(next);
  };

  return (
    <div className="flex items-center justify-between gap-2.5 px-3 py-2 border border-[#ebe9e3] rounded-xl bg-white">
      <span className="inline-flex items-center gap-2 min-w-0 font-cjk font-semibold text-sm text-[#1c1b19]">
        <Avatar m={member} size="xs" />
        <span className="truncate">{member.name}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          className="inline-flex items-center h-[33px] px-2.5 rounded-[9px] border border-[#ebe9e3] bg-white font-grotesk font-semibold text-[11px] text-[#76726a] cursor-pointer transition-colors hover:border-[#1c1b19] hover:text-[#1c1b19]"
          title={`由 ${member.name} 承担全部金额`}
          aria-label={`由 ${member.name} 承担全部金额`}
          onClick={onTakeFullAmount}
        >
          100%
        </button>
        <span className="inline-flex items-center gap-[3px] border border-[#ebe9e3] rounded-[10px] px-2.5 py-[5px] bg-white transition-colors focus-within:border-[#1c1b19]">
          <span className="font-grotesk font-semibold text-[13px] text-[#9b988f]">{symbol}</span>
          <input
            className="w-[74px] border-none bg-transparent outline-none font-grotesk font-semibold text-[15px] text-[#1c1b19] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
            type="number"
            inputMode="decimal"
            step={decimals ? "0.01" : "1"}
            min="0"
            value={draft}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            aria-label={`${member.name} 承担金额`}
            placeholder={decimals ? "0.00" : "0"}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
          />
        </span>
      </span>
    </div>
  );
}

// `undefined` is the durable AA default. A concrete map is a custom allocation
// whose cents must reconcile to the expense's net amount before it can be saved.
export function ExpenseAllocation({ amount, travelers, value, onChange, currency }: Props) {
  const memberIds = travelers.map((member) => member.id);
  const symbol = currencySymbol(currency ?? DEFAULT_CURRENCY);
  const decimals = currencyDecimals(currency ?? DEFAULT_CURRENCY);
  const allocation = value ?? evenExpenseAllocation(amount, memberIds, decimals);
  const total = expenseAllocationTotal(allocation, memberIds);
  const matches = expenseAllocationMatches(value, amount, memberIds);
  const difference = round2(amount - total);

  if (travelers.length === 0) {
    return (
      <div className="font-cjk text-[12px] leading-[1.6] text-[#9b988f]">
        请先邀请同行人，再设置每个人的承担金额。
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-cjk text-[11.5px] text-[#76726a]">
          {value ? "自定义金额" : "默认 AA，可直接修改任意一人"}
        </span>
        {value && (
          <button
            type="button"
            className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-[13px]`}
            onClick={() => onChange(undefined)}
          >
            <Icons.swap sw={2.2} />
            恢复 AA
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {travelers.map((member) => (
          <AllocationInput
            key={`${member.id}-${allocation[member.id] ?? 0}`}
            member={member}
            value={allocation[member.id] ?? 0}
            symbol={symbol}
            decimals={decimals}
            onCommit={(next) => onChange({ ...allocation, [member.id]: next })}
            onTakeFullAmount={() =>
              onChange(fullExpenseAllocation(amount, memberIds, member.id, decimals))
            }
          />
        ))}
      </div>

      <div
        className={`flex items-center justify-between gap-3 font-cjk font-semibold text-[11.5px] ${matches ? "text-[#3f6f5b]" : "text-[#c2553f]"}`}
        role={!matches ? "alert" : undefined}
      >
        <span>
          {matches
            ? "已完整分配"
            : difference > 0
              ? `还需分配 ${fmtMoney(difference, currency)}`
              : `已超出 ${fmtMoney(Math.abs(difference), currency)}`}
        </span>
        <span className="font-sans">
          {fmtMoney(total, currency)} / {fmtMoney(amount, currency)}
        </span>
      </div>
    </div>
  );
}
