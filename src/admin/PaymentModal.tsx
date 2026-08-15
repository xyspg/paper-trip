import { useState } from "react";
import { AdminModal } from "./AdminModal";
import { Icons } from "./AdminIcons";
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "./adminUi";
import { CurrencySelect, FxRateRow, useEntryFxRate } from "./CurrencyFields";
import { useAdmin } from "./AdminContext";
import { currencyDecimals, roundFxRate } from "../trip/currency";
import type { Payment } from "../trip/types";

export type NewPaymentInput = Omit<Payment, "id">;

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: NewPaymentInput) => void;
  // Prefill for from/to (e.g. the top settle-up transfer), so recording the
  // suggested repayment is two fields instead of four.
  suggest?: { from: string; to: string } | null;
};

// Today's date (YYYY-MM-DD) on the trip's own clock, not the device's or UTC.
const todayIn = (timeZone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
};

// Reset the form whenever the modal (re)opens by keying the parent; this inner
// component always starts from fresh defaults.
function Form({ onClose, onSubmit, suggest }: Omit<Props, "isOpen">) {
  const { travelers, currency: baseCurrency, timezone } = useAdmin();
  const [from, setFrom] = useState(suggest?.from ?? travelers[0]?.id ?? "");
  const [to, setTo] = useState(
    suggest?.to ?? travelers.find((m) => m.id !== (suggest?.from ?? travelers[0]?.id))?.id ?? "",
  );
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(baseCurrency);
  const [fxOverride, setFxOverride] = useState<number | null>(null);
  const [date, setDate] = useState(() => todayIn(timezone));
  const [note, setNote] = useState("");

  const foreign = currency !== baseCurrency;
  const fxRate = useEntryFxRate(baseCurrency, currency, fxOverride);
  const decimals = currencyDecimals(currency);

  const parsed = Math.max(0, parseFloat(amount) || 0);
  const canSubmit =
    from !== "" && to !== "" && from !== to && parsed > 0 && (!foreign || fxRate != null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({
      from,
      to,
      amount: parsed,
      currency: foreign ? currency : undefined,
      fxRate: foreign && fxRate != null ? roundFxRate(fxRate) : undefined,
      date: date || undefined,
      note: note.trim() || undefined,
    });
  };

  const memberSelect = (
    label: string,
    value: string,
    onChange: (id: string) => void,
    exclude: string,
  ) => (
    <label className="flex flex-col gap-[7px] min-w-0">
      <span className={FIELD_LABEL}>{label}</span>
      <select className={FIELD_INPUT} value={value} onChange={(e) => onChange(e.target.value)}>
        {travelers.map((m) => (
          <option key={m.id} value={m.id} disabled={m.id === exclude}>
            {m.name}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <ModalHeader icon={<Icons.swap sw={2.6} />} title="记录还款" onClose={onClose} />

      <div className="grid grid-cols-2 gap-y-[15px] gap-x-[14px] p-[18px] max-[440px]:grid-cols-1">
        {memberSelect("谁还款", from, setFrom, to)}
        {memberSelect("还给谁", to, setTo, from)}

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>金额</span>
          <div className="grid grid-cols-[150px_1fr] gap-[7px] max-[440px]:grid-cols-1">
            <CurrencySelect
              value={currency}
              onChange={(next) => {
                setCurrency(next);
                setFxOverride(null);
              }}
            />
            <input
              className={FIELD_INPUT}
              type="number"
              inputMode="decimal"
              step={decimals ? "0.01" : "1"}
              min="0"
              value={amount}
              autoFocus
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              placeholder={decimals ? "0.00" : "0"}
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

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>日期</span>
          <input
            className={FIELD_INPUT}
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>备注（可选）</span>
          <input
            className={FIELD_INPUT}
            value={note}
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 微信转账"
            onChange={(e) => setNote(e.target.value)}
          />
        </label>
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
          <Icons.check sw={2.6} />
          记录还款
        </button>
      </ModalFooter>
    </form>
  );
}

export function PaymentModal({ isOpen, onClose, onSubmit, suggest }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose}>
      <Form key={String(isOpen)} onClose={onClose} onSubmit={onSubmit} suggest={suggest} />
    </AdminModal>
  );
}

export function buildPayment(input: NewPaymentInput, id: string): Payment {
  return { id, ...input };
}
