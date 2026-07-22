import { describe, expect, it } from "bun:test";

import {
  evenExpenseAllocation,
  expenseBalances,
  expenseOwedBy,
  settlementTransfers,
} from "../src/trip/expenses";
import { applyOp, emptyTrip } from "../src/trip/ops";
import type { Expense } from "../src/trip/types";

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
      { id: "a", paid: 6, share: 3, balance: 3 },
      { id: "b", paid: 4, share: 7, balance: -3 },
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

describe("settlement transfers", () => {
  it("settles any number of travelers", () => {
    expect(
      settlementTransfers([
        { id: "a", paid: 18, share: 10, balance: 8 },
        { id: "b", paid: 7, share: 10, balance: -3 },
        { id: "c", paid: 5, share: 10, balance: -5 },
      ]),
    ).toEqual([
      { from: "b", to: "a", amount: 3 },
      { from: "c", to: "a", amount: 5 },
    ]);
  });
});
