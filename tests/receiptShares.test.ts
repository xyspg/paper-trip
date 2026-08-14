import { describe, expect, it } from "bun:test";

import { deriveShares } from "../src/admin/receipt";

describe("receipt share derivation", () => {
  it("splits with cent precision by default and sums to the bill", () => {
    const shares = deriveShares([{ price: 10, who: ["a", "b", "c"] }], ["a", "b", "c"], 0);
    expect(shares).toEqual({ a: 3.34, b: 3.33, c: 3.33 });
  });

  it("settles zero-decimal receipts in whole units that sum to the bill", () => {
    // 10,000 JPY three ways: no fractional yen, remainder to the first member.
    expect(deriveShares([{ price: 10_000, who: [] }], ["a", "b", "c"], 0, 0)).toEqual({
      a: 3334,
      b: 3333,
      c: 3333,
    });
    // Extras (tax/tip) spread proportionally still land on whole yen.
    const withTax = deriveShares([{ price: 10_000, who: [] }], ["a", "b", "c"], 820, 0);
    expect(Object.values(withTax).every((n) => Number.isInteger(n))).toBe(true);
    expect(Object.values(withTax).reduce((s, n) => s + n, 0)).toBe(10_820);
  });
});
