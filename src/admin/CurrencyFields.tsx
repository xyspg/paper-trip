import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { fmtMoney } from "./adminData";
import { FIELD_INPUT } from "./adminUi";
import { CURRENCIES, fmtFxRate, roundFxRate } from "../trip/currency";
import { rateToBase, useRates } from "../trip/rates";
import { isEnterKey } from "../ime";

// Currency picker + captured-rate editor shared by the manual expense form and
// the receipt scanner. The rate is "base units per 1 unit of the entry
// currency" — exactly the Expense.fxRate that gets persisted — prefilled from
// the live /api/rates quote and always hand-editable, so an offline quote
// never blocks entry.

export function CurrencySelect({
  value,
  onChange,
  className,
}: {
  value: string;
  onChange: (code: string) => void;
  className?: string;
}) {
  // An exotic stored code (agent-written, or a pared-down picker list) still
  // has to render as selected instead of snapping to the first option.
  const listed = CURRENCIES.some((c) => c.code === value);
  const { t } = useLingui();
  return (
    <select
      className={className ?? FIELD_INPUT}
      value={value}
      aria-label={t`币种`}
      onChange={(e) => onChange(e.target.value)}
    >
      {!listed && <option value={value}>{value}</option>}
      {CURRENCIES.map((c) => (
        <option key={c.code} value={c.code}>
          {c.code} · {t(c.label)}
        </option>
      ))}
    </select>
  );
}

// The effective rate an entry form should use for `currency`: the user's
// override when set, else the live quote (null while loading / on failure /
// for a currency the provider doesn't list).
export function useEntryFxRate(
  base: string,
  currency: string,
  override: number | null,
): number | null {
  const foreign = currency !== base;
  const quote = useRates(base, foreign);
  if (!foreign) return 1;
  if (override != null) return override;
  return quote.data ? rateToBase(quote.data, currency) : null;
}

export function FxRateRow({
  base,
  currency,
  rate,
  onRate,
  amount,
}: {
  base: string;
  currency: string;
  // Effective rate (override or quote); null = no quote yet, manual entry needed.
  rate: number | null;
  // null clears the override back to the live quote.
  onRate: (rate: number | null) => void;
  // Amount in `currency`, for the converted preview.
  amount: number;
}) {
  // Draft-while-editing: the field mirrors the effective rate except while the
  // user is actually typing (draft non-null between focus and blur), so an
  // async quote arriving mid-entry can never wipe what's being typed — the old
  // keyed-remount approach did exactly that when the quote resolved.
  const [draft, setDraft] = useState<string | null>(null);
  const { t } = useLingui();
  if (currency === base) return null;
  const shown = draft ?? (rate != null ? fmtFxRate(rate) : "");
  const converted = rate != null ? fmtMoney(amount * rate, base) : "";
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 font-cjk text-[12px] text-[#76726a]">
      <span className="whitespace-nowrap">
        <Trans>汇率 1 {currency} =</Trans>
      </span>
      <span className="inline-flex items-center gap-1 border border-[#ebe9e3] rounded-[9px] bg-white py-[3px] px-2 focus-within:border-[#1c1b19] transition-colors">
        <input
          key={currency}
          className="w-[86px] border-none outline-none bg-transparent font-sans font-semibold text-[13px] text-[#1c1b19] text-right [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-inner-spin-button]:m-0 [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0"
          type="number"
          inputMode="decimal"
          step="any"
          min="0"
          value={shown}
          autoComplete="off"
          data-1p-ignore
          data-lpignore="true"
          placeholder={t`获取中…`}
          aria-label={t`1 ${currency} 折合 ${base}`}
          onFocus={() => setDraft(shown)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => {
            const n = parseFloat(e.target.value);
            onRate(Number.isFinite(n) && n > 0 ? roundFxRate(n) : null);
            setDraft(null);
          }}
          onKeyDown={(e) => {
            if (isEnterKey(e)) e.currentTarget.blur();
          }}
        />
        <span className="font-grotesk font-semibold text-[11px] text-[#9b988f]">{base}</span>
      </span>
      {rate != null ? (
        <span className="whitespace-nowrap">
          <Trans>
            折合 <b className="font-sans font-bold text-[#1c1b19]">{converted}</b>
          </Trans>
        </span>
      ) : (
        <span className="text-[#c2553f]">
          <Trans>未获取到汇率，请手动填写</Trans>
        </span>
      )}
    </div>
  );
}
