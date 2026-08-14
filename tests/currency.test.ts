import { describe, expect, it } from "bun:test";

import {
  expenseCurrency,
  fmtCurrency,
  fmtCurrencyNumber,
  normalizeCurrency,
  roundFxRate,
  tripCurrency,
} from "../src/trip/currency";

describe("currency codes", () => {
  it("normalizes ISO-shaped codes and known OCR aliases", () => {
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency(" jpy ")).toBe("JPY");
    expect(normalizeCurrency("RMB")).toBe("CNY");
    expect(normalizeCurrency("US$")).toBe("USD");
    expect(normalizeCurrency("$")).toBeNull();
    expect(normalizeCurrency("")).toBeNull();
    expect(normalizeCurrency(undefined)).toBeNull();
    expect(normalizeCurrency("EURO")).toBeNull();
  });

  it("falls back to USD for trips persisted before multi-currency", () => {
    expect(tripCurrency(null)).toBe("USD");
    expect(tripCurrency({ base: {} as { currency?: string } })).toBe("USD");
    expect(tripCurrency({ base: { currency: "JPY" } })).toBe("JPY");
  });

  it("resolves an expense's currency against the trip base", () => {
    expect(expenseCurrency({}, "USD")).toBe("USD");
    expect(expenseCurrency({ currency: "JPY" }, "USD")).toBe("JPY");
    expect(expenseCurrency({ currency: "not-a-code" }, "EUR")).toBe("EUR");
  });
});

describe("currency formatting", () => {
  it("formats with each currency's own symbol and precision", () => {
    expect(fmtCurrency(1234.5)).toBe("$1,234.50");
    expect(fmtCurrency(1234.5, "USD")).toBe("$1,234.50");
    expect(fmtCurrency(1234.5, "CNY")).toBe("¥1,234.50");
    // Zero-decimal currencies round away cents entirely.
    expect(fmtCurrency(1234.5, "JPY")).toBe("JP¥1,235");
    expect(fmtCurrency(89000, "KRW")).toBe("₩89,000");
    // Unknown codes still render, prefixed by the code itself.
    expect(fmtCurrency(10, "XYZ")).toBe("XYZ 10.00");
  });

  it("exposes the bare grouped number for symbol-split layouts", () => {
    expect(fmtCurrencyNumber(1234.5, "USD")).toBe("1,234.50");
    expect(fmtCurrencyNumber(1234.5, "JPY")).toBe("1,235");
  });

  it("keeps captured rates to ~6 significant digits", () => {
    expect(roundFxRate(1 / 147)).toBeCloseTo(0.00680272, 8);
    expect(roundFxRate(7.233123456)).toBe(7.23312);
  });
});
