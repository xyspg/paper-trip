// Multi-currency model. Each trip settles in one base currency
// (trip.base.currency); an expense may be recorded in any currency and carries
// the exchange rate captured when it was entered (Expense.fxRate = base units
// per 1 unit of Expense.currency). Per-expense math (splits, credits, receipt
// items) stays in the expense's own currency; only cross-expense aggregation
// converts (see expenses.ts), so a rate is captured once and never silently
// rewrites what was actually paid.

import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";

export const DEFAULT_CURRENCY = "USD";

export type CurrencyInfo = {
  code: string;
  symbol: string;
  // Localized display name: render with t(label) / i18n._(label). A code
  // outside the curated list is its own name.
  label: MessageDescriptor;
  // Display decimals; zero-decimal currencies (JPY/KRW/…) never show cents.
  decimals: number;
};

// Curated picker list for a travel ledger. Any other ISO 4217 code still
// round-trips (currencyInfo falls back to the code itself as the symbol).
export const CURRENCIES: CurrencyInfo[] = [
  { code: "USD", symbol: "$", label: msg`美元`, decimals: 2 },
  { code: "CNY", symbol: "¥", label: msg`人民币`, decimals: 2 },
  { code: "JPY", symbol: "JP¥", label: msg`日元`, decimals: 0 },
  { code: "EUR", symbol: "€", label: msg`欧元`, decimals: 2 },
  { code: "GBP", symbol: "£", label: msg`英镑`, decimals: 2 },
  { code: "HKD", symbol: "HK$", label: msg`港币`, decimals: 2 },
  { code: "TWD", symbol: "NT$", label: msg`新台币`, decimals: 0 },
  { code: "KRW", symbol: "₩", label: msg`韩元`, decimals: 0 },
  { code: "SGD", symbol: "S$", label: msg`新加坡元`, decimals: 2 },
  { code: "THB", symbol: "฿", label: msg`泰铢`, decimals: 2 },
  { code: "VND", symbol: "₫", label: msg`越南盾`, decimals: 0 },
  { code: "MYR", symbol: "RM", label: msg`林吉特`, decimals: 2 },
  { code: "AUD", symbol: "A$", label: msg`澳元`, decimals: 2 },
  { code: "CAD", symbol: "C$", label: msg`加元`, decimals: 2 },
  { code: "CHF", symbol: "CHF ", label: msg`瑞士法郎`, decimals: 2 },
];

const byCode = new Map(CURRENCIES.map((c) => [c.code, c]));

// Receipt OCR sometimes returns trade names instead of ISO codes.
const CODE_ALIASES: Record<string, string> = {
  RMB: "CNY",
  US$: "USD",
  NTD: "TWD",
  YEN: "JPY",
  WON: "KRW",
  EURO: "EUR",
};

// Uppercase 3-letter ISO 4217 code, or null when the input isn't one.
export function normalizeCurrency(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const raw = v.trim().toUpperCase();
  const code = CODE_ALIASES[raw] ?? raw;
  return /^[A-Z]{3}$/.test(code) ? code : null;
}

export const currencyInfo = (code: string): CurrencyInfo =>
  byCode.get(code) ?? {
    code,
    symbol: `${code} `,
    label: { id: code, message: code },
    decimals: 2,
  };

export const currencySymbol = (code: string): string => currencyInfo(code).symbol;

export const currencyDecimals = (code: string): number => currencyInfo(code).decimals;

// Round an amount to the currency's own precision — whole units for
// zero-decimal currencies (JPY/KRW/…), cents otherwise — so entry surfaces
// never persist sub-unit noise like 3333.33 yen.
export const roundAmount = (n: number, code: string): number => {
  const factor = 10 ** currencyInfo(code).decimals;
  return Math.round((Number(n) || 0) * factor) / factor;
};

// Grouped amount at the currency's own precision, without the symbol — for
// layouts that render the symbol as its own styled node.
export function fmtCurrencyNumber(n: number, code: string = DEFAULT_CURRENCY): string {
  const { decimals } = currencyInfo(code);
  const factor = 10 ** decimals;
  const value = Math.round((Number(n) || 0) * factor) / factor;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// "$1,234.50" / "JP¥1,235" — the one money formatter every surface shares.
export const fmtCurrency = (n: number, code: string = DEFAULT_CURRENCY): string =>
  currencySymbol(code) + fmtCurrencyNumber(n, code);

// The trip's settlement currency. Trips persisted before multi-currency have
// no base.currency and settle in USD, the unit the app historically hardcoded.
export const tripCurrency = (trip: { base?: { currency?: string } } | null | undefined): string =>
  normalizeCurrency(trip?.base?.currency) ?? DEFAULT_CURRENCY;

// The currency an expense's own numbers (amount/credit/items/owedBy) are
// recorded in; entries without one are legacy base-currency lines.
export const expenseCurrency = (e: { currency?: string }, base: string): string =>
  normalizeCurrency(e.currency) ?? base;

// Rates carry ~6 significant digits — enough for any display precision without
// persisting float noise like 0.0068027210884353745.
export const roundFxRate = (rate: number): number => Number(rate.toPrecision(6));

// Compact human form of a captured rate ("0.006803", "7.2331").
export const fmtFxRate = (rate: number): string => String(roundFxRate(rate));
