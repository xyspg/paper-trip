import { describe, expect, it } from "bun:test";

import {
  evenExpenseAllocation,
  expenseBalances,
  expenseFxRate,
  expenseOwedBy,
  expenseTotals,
  rebaseExpenses,
  settlementTransfers,
} from "../src/trip/expenses";
import { applyOp, emptyTrip } from "../src/trip/ops";
import type { Expense, Payment } from "../src/trip/types";

const expense = (patch: Partial<Expense> = {}): Expense => ({
  id: "expense-1",
  cat: "stay",
  name: "Hotel",
  sub: "",
  amount: 10,
  credit: 0,
  payer: "a",
  ...patch,
});

const payment = (patch: Partial<Payment> = {}): Payment => ({
  id: "payment-1",
  from: "b",
  to: "a",
  amount: 3,
  ...patch,
});

describe("expense responsibility allocations", () => {
  it("keeps legacy expenses AA and reconciles cent remainders", () => {
    expect(evenExpenseAllocation(10, ["a", "b", "c"])).toEqual({
      a: 3.34,
      b: 3.33,
      c: 3.33,
    });
    expect(expenseOwedBy(expense(), ["a", "b", "c"])).toEqual({
      a: 3.34,
      b: 3.33,
      c: 3.33,
    });
  });

  it("keeps who paid independent from who owes", () => {
    const balances = expenseBalances(
      [
        expense({
          split: { mode: "amount", shares: { a: 6, b: 4 } },
          owedBy: { a: 3, b: 7 },
        }),
      ],
      ["a", "b"],
    );

    expect(balances).toEqual([
      { id: "a", paid: 6, share: 3, repaid: 0, received: 0, balance: 3 },
      { id: "b", paid: 4, share: 7, repaid: 0, received: 0, balance: -3 },
    ]);
  });

  it("allocates the net amount after an expense credit", () => {
    const item = expense({ amount: 10, credit: 2, owedBy: { a: 2, b: 6 } });
    expect(expenseOwedBy(item, ["a", "b"])).toEqual({ a: 2, b: 6 });
  });

  it("falls back to AA when external allocation data does not reconcile", () => {
    const item = expense({ owedBy: { a: 2, b: 3 } });
    expect(expenseOwedBy(item, ["a", "b"])).toEqual({ a: 5, b: 5 });
  });

  it("rescales a custom allocation when the inline total changes", () => {
    const trip = {
      ...emptyTrip({
        id: "trip",
        title: "Trip",
        dates: { start: "2027-01-01", end: "2027-01-02" },
        timezone: "UTC",
      }),
      expenses: [expense({ amount: 100, owedBy: { a: 30, b: 70 } })],
    };

    const updated = applyOp(trip, {
      type: "setExpenseAmount",
      expenseId: "expense-1",
      amount: 120,
    });
    expect(updated.expenses[0].owedBy).toEqual({ a: 36, b: 84 });
  });
});

describe("multi-currency aggregation", () => {
  it("treats missing or invalid fx rates as base-currency entries", () => {
    expect(expenseFxRate(expense())).toBe(1);
    expect(expenseFxRate(expense({ fxRate: 0 }))).toBe(1);
    expect(expenseFxRate(expense({ fxRate: Number.NaN }))).toBe(1);
    expect(expenseFxRate(expense({ currency: "JPY", fxRate: 0.007 }))).toBe(0.007);
  });

  it("states totals in the base currency via each line's captured rate", () => {
    const totals = expenseTotals([
      expense({ amount: 100 }),
      // ¥10,000 dinner with a ¥1,000 credit at 0.007 base per yen.
      expense({ id: "expense-2", amount: 10_000, credit: 1_000, currency: "JPY", fxRate: 0.007 }),
    ]);
    expect(totals.subtotal).toBeCloseTo(170, 10);
    expect(totals.creditTotal).toBeCloseTo(7, 10);
    expect(totals.total).toBeCloseTo(163, 10);
  });

  it("keeps balances reconciled across mixed currencies", () => {
    const balances = expenseBalances(
      [
        // a fronts a $100 base-currency expense, split AA.
        expense({ amount: 100 }),
        // b fronts ¥10,000 (= $70), owed entirely by a.
        expense({
          id: "expense-2",
          amount: 10_000,
          payer: "b",
          currency: "JPY",
          fxRate: 0.007,
          owedBy: { a: 10_000, b: 0 },
        }),
      ],
      ["a", "b"],
    );

    expect(balances[0].paid).toBeCloseTo(100, 10);
    expect(balances[0].share).toBeCloseTo(120, 10);
    expect(balances[1].paid).toBeCloseTo(70, 10);
    expect(balances[1].share).toBeCloseTo(50, 10);
    // Conversion happens per expense, so paid and owed still cancel out.
    expect(balances[0].balance + balances[1].balance).toBeCloseTo(0, 10);
    expect(balances[0].balance).toBeCloseTo(-20, 10);
  });

  it("ignores a stray fxRate on rows that resolve to the base currency", () => {
    const rows = [expense({ amount: 100, fxRate: 0.007 })];
    expect(expenseTotals(rows, "USD").total).toBeCloseTo(100, 10);
    expect(expenseBalances(rows, ["a"], "USD")[0].paid).toBeCloseTo(100, 10);
  });

  it("allocates zero-decimal currencies in whole units", () => {
    expect(evenExpenseAllocation(101, ["a", "b"], 0)).toEqual({ a: 51, b: 50 });
    expect(
      expenseOwedBy(expense({ amount: 10_000, currency: "JPY", fxRate: 0.007 }), ["a", "b", "c"]),
    ).toEqual({ a: 3334, b: 3333, c: 3333 });
  });

  it("settles mixed-currency ledgers with exact transfers", () => {
    const balances = expenseBalances(
      [
        expense({ amount: 100 }),
        expense({
          id: "expense-2",
          amount: 10_000,
          payer: "b",
          currency: "JPY",
          fxRate: 0.007,
          owedBy: { a: 10_000, b: 0 },
        }),
      ],
      ["a", "b"],
      "USD",
    );
    expect(settlementTransfers(balances)).toEqual([{ from: "a", to: "b", amount: 20 }]);
  });
});

describe("settle-up payments", () => {
  it("moves balances member-to-member without touching paid or share", () => {
    // a fronted 10, split AA → b owes a 5; b then pays 3 of it back.
    const balances = expenseBalances([expense()], ["a", "b"], undefined, [payment()]);
    expect(balances).toEqual([
      { id: "a", paid: 10, share: 5, repaid: 0, received: 3, balance: 2 },
      { id: "b", paid: 0, share: 5, repaid: 3, received: 0, balance: -2 },
    ]);
    expect(settlementTransfers(balances)).toEqual([{ from: "b", to: "a", amount: 2 }]);
  });

  it("converts foreign-currency payments at their captured rate", () => {
    const balances = expenseBalances(
      [expense({ amount: 100 })],
      ["a", "b"],
      "USD",
      // ¥5,000 back at 0.007 base per yen = $35 of the $50 owed.
      [payment({ amount: 5_000, currency: "JPY", fxRate: 0.007 })],
    );
    expect(balances[0].received).toBeCloseTo(35, 10);
    expect(balances[0].balance).toBeCloseTo(15, 10);
    expect(balances[1].balance).toBeCloseTo(-15, 10);
  });

  it("stays zero-sum and can settle exactly", () => {
    const balances = expenseBalances([expense()], ["a", "b"], undefined, [payment({ amount: 5 })]);
    expect(balances[0].balance + balances[1].balance).toBeCloseTo(0, 10);
    expect(settlementTransfers(balances)).toEqual([]);
  });

  it("skips self-payments and payments naming unknown members", () => {
    const balances = expenseBalances([expense()], ["a", "b"], undefined, [
      payment({ id: "p-self", from: "a", to: "a", amount: 4 }),
      payment({ id: "p-ghost", from: "ghost", to: "a", amount: 4 }),
      payment({ id: "p-negative", amount: -4 }),
    ]);
    expect(balances[0].balance).toBe(5);
    expect(balances[1].balance).toBe(-5);
  });
});

describe("base-currency rebase", () => {
  it("stamps implicit rows and restates captured rates, never amounts", () => {
    const out = rebaseExpenses(
      [
        expense({ amount: 100 }),
        expense({ id: "e2", amount: 10_000, currency: "JPY", fxRate: 0.0068 }),
        expense({ id: "e3", amount: 50, currency: "EUR", fxRate: 1.08 }),
      ],
      "USD",
      "EUR",
      0.9259,
    );
    // Implicit USD rows become explicit USD at the cross rate.
    expect(out[0].currency).toBe("USD");
    expect(out[0].fxRate).toBeCloseTo(0.9259, 6);
    // Foreign rows keep their currency; the captured rate is restated.
    expect(out[1].currency).toBe("JPY");
    expect(out[1].fxRate).toBeCloseTo(0.0068 * 0.9259, 8);
    // Rows already recorded in the new base become implicit again.
    expect(out[2].currency).toBeUndefined();
    expect(out[2].fxRate).toBeUndefined();
    expect(out.map((e) => e.amount)).toEqual([100, 10_000, 50]);
  });
});

describe("settlement transfers", () => {
  it("settles any number of travelers", () => {
    expect(
      settlementTransfers([
        { id: "a", paid: 18, share: 10, repaid: 0, received: 0, balance: 8 },
        { id: "b", paid: 7, share: 10, repaid: 0, received: 0, balance: -3 },
        { id: "c", paid: 5, share: 10, repaid: 0, received: 0, balance: -5 },
      ]),
    ).toEqual([
      { from: "b", to: "a", amount: 3 },
      { from: "c", to: "a", amount: 5 },
    ]);
  });
});
