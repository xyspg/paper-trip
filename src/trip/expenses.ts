import type { Expense } from "./types";

// Expense ledger math shared by the public ledger and the admin split view so the
// two surfaces can never disagree. A line's credit can only offset up to its own
// amount, which keeps the totals reconciled: subtotal - creditTotal === total.
export const appliedCredit = (e: Expense): number =>
  Math.min(e.credit || 0, Number(e.amount) || 0);

export const netExpense = (e: Expense): number => (Number(e.amount) || 0) - appliedCredit(e);

export type ExpenseTotals = { subtotal: number; creditTotal: number; total: number };

export const expenseTotals = (expenses: Expense[]): ExpenseTotals => {
  let subtotal = 0;
  let creditTotal = 0;
  let total = 0;
  for (const e of expenses) {
    subtotal += Number(e.amount) || 0;
    creditTotal += appliedCredit(e);
    total += netExpense(e);
  }
  return { subtotal, creditTotal, total };
};
