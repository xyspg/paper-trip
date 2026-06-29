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

// Resolve how much each member actually fronted toward an expense's *net* cost.
// The returned map is keyed by `memberIds` and always sums to netExpense(e), so
// balances stay reconciled in any mode. With a `split` the net is divided in
// proportion to each member's weight (percent or amount — both normalize the
// same way); without one the single `payer` covers the whole net (the default
// 100% case). A split whose weights sum to zero falls back to the payer.
export const expensePaidBy = (e: Expense, memberIds: string[]): Record<string, number> => {
  const net = netExpense(e);
  const out: Record<string, number> = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const shares = e.split?.shares;
  if (shares) {
    let sum = 0;
    for (const id of memberIds) sum += Math.max(0, Number(shares[id]) || 0);
    if (sum > 0) {
      for (const id of memberIds) out[id] = (net * Math.max(0, Number(shares[id]) || 0)) / sum;
      return out;
    }
  }
  if (e.payer in out) out[e.payer] = net;
  return out;
};

export type ExpenseBalance = {
  id: string;
  paid: number;
  share: number;
  balance: number;
};

export const expenseBalances = (expenses: Expense[], memberIds: string[]): ExpenseBalance[] => {
  const { total } = expenseTotals(expenses);
  const share = memberIds.length ? total / memberIds.length : 0;
  const paid = Object.fromEntries(memberIds.map((id) => [id, 0]));

  for (const e of expenses) {
    const by = expensePaidBy(e, memberIds);
    for (const id of memberIds) paid[id] += by[id];
  }

  return memberIds.map((id) => ({
    id,
    paid: paid[id] || 0,
    share,
    balance: (paid[id] || 0) - share,
  }));
};
