import type { Expense, ExpenseAllocation } from "./types";

const cents = (value: number): number => Math.round(Math.max(0, Number(value) || 0) * 100);
const fromCents = (value: number): number => value / 100;

// Expense ledger math shared by the public ledger and the admin split view so the
// two surfaces can never disagree. A line's credit can only offset up to its own
// amount, which keeps the totals reconciled: subtotal - creditTotal === total.
export const appliedCredit = (e: Expense): number => Math.min(e.credit || 0, Number(e.amount) || 0);

export const netExpense = (e: Expense): number => (Number(e.amount) || 0) - appliedCredit(e);

// Base-currency units per unit of the expense's own currency. 1 for expenses
// recorded directly in the base currency (or with a missing/invalid rate), so
// pre-multi-currency data aggregates unchanged.
export const expenseFxRate = (e: Expense): number => {
  const rate = Number(e.fxRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

export type ExpenseTotals = { subtotal: number; creditTotal: number; total: number };

// Totals are stated in the trip's base currency: each line converts at its own
// captured fxRate. Reconciliation survives the conversion because it holds per
// line before multiplying: (amount - credit) * rate = amount*rate - credit*rate.
export const expenseTotals = (expenses: Expense[]): ExpenseTotals => {
  let subtotal = 0;
  let creditTotal = 0;
  let total = 0;
  for (const e of expenses) {
    const rate = expenseFxRate(e);
    subtotal += (Number(e.amount) || 0) * rate;
    creditTotal += appliedCredit(e) * rate;
    total += netExpense(e) * rate;
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
    if (sum > 0) return allocateByWeight(net, memberIds, shares);
  }
  if (e.payer in out) out[e.payer] = net;
  return out;
};

// Allocate an amount using arbitrary non-negative weights while keeping the
// result exact to the cent. Fractional remainders are handed out in stable
// member order, so the returned amounts always add up to `amount`.
export const allocateByWeight = (
  amount: number,
  memberIds: string[],
  weights?: Record<string, number>,
): ExpenseAllocation => {
  const out: ExpenseAllocation = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const target = cents(amount);
  if (memberIds.length === 0 || target === 0) return out;

  const safeWeights = memberIds.map((id) => Math.max(0, Number(weights?.[id]) || 0));
  const weightTotal = safeWeights.reduce((sum, value) => sum + value, 0);
  const effective = weightTotal > 0 ? safeWeights : memberIds.map(() => 1);
  const effectiveTotal = effective.reduce((sum, value) => sum + value, 0);
  const rows = memberIds.map((id, index) => {
    const raw = (target * effective[index]) / effectiveTotal;
    const floor = Math.floor(raw);
    return { id, index, value: floor, remainder: raw - floor };
  });
  const remaining = target - rows.reduce((sum, row) => sum + row.value, 0);
  const remainderOrder = [...rows].sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (let i = 0; i < remaining; i += 1) remainderOrder[i % remainderOrder.length].value += 1;
  for (const row of rows) out[row.id] = fromCents(row.value);
  return out;
};

export const evenExpenseAllocation = (amount: number, memberIds: string[]): ExpenseAllocation =>
  allocateByWeight(amount, memberIds);

export const expenseAllocationTotal = (
  allocation: ExpenseAllocation | undefined,
  memberIds: string[],
): number => fromCents(memberIds.reduce((sum, id) => sum + cents(allocation?.[id] ?? 0), 0));

export const expenseAllocationMatches = (
  allocation: ExpenseAllocation | undefined,
  amount: number,
  memberIds: string[],
): boolean =>
  allocation === undefined ||
  cents(expenseAllocationTotal(allocation, memberIds)) === cents(amount);

// Resolve what each traveler ultimately owes for an expense. Explicit amounts
// are used only when they reconcile to the net cost; malformed/stale external
// data falls back to AA so the ledger can never create or lose money.
export const expenseOwedBy = (e: Expense, memberIds: string[]): ExpenseAllocation => {
  const net = netExpense(e);
  if (e.owedBy && expenseAllocationMatches(e.owedBy, net, memberIds)) {
    return Object.fromEntries(memberIds.map((id) => [id, fromCents(cents(e.owedBy?.[id] ?? 0))]));
  }
  return evenExpenseAllocation(net, memberIds);
};

export type ExpenseBalance = {
  id: string;
  paid: number;
  share: number;
  balance: number;
};

export type SettlementTransfer = {
  from: string;
  to: string;
  amount: number;
};

// Balances are stated in the trip's base currency. Per-expense paid/owed maps
// each sum to the expense's own net (in its own currency), so converting both
// with the same fxRate keeps total paid === total owed across any currency mix.
export const expenseBalances = (expenses: Expense[], memberIds: string[]): ExpenseBalance[] => {
  const paid = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const owed = Object.fromEntries(memberIds.map((id) => [id, 0]));

  for (const e of expenses) {
    const rate = expenseFxRate(e);
    const by = expensePaidBy(e, memberIds);
    const allocation = expenseOwedBy(e, memberIds);
    for (const id of memberIds) {
      paid[id] += by[id] * rate;
      owed[id] += allocation[id] * rate;
    }
  }

  return memberIds.map((id) => ({
    id,
    paid: paid[id] || 0,
    share: owed[id] || 0,
    balance: (paid[id] || 0) - (owed[id] || 0),
  }));
};

// Convert any number of positive/negative balances into a compact transfer
// plan. This replaces the old two-person-only pairing and works for any roster.
export const settlementTransfers = (balances: ExpenseBalance[]): SettlementTransfer[] => {
  const debtors = balances
    .filter((balance) => cents(-balance.balance) > 0)
    .map((balance) => ({ id: balance.id, amount: cents(-balance.balance) }));
  const receivers = balances
    .filter((balance) => cents(balance.balance) > 0)
    .map((balance) => ({ id: balance.id, amount: cents(balance.balance) }));
  const transfers: SettlementTransfer[] = [];
  let debtorIndex = 0;
  let receiverIndex = 0;

  while (debtorIndex < debtors.length && receiverIndex < receivers.length) {
    const debtor = debtors[debtorIndex];
    const receiver = receivers[receiverIndex];
    const amount = Math.min(debtor.amount, receiver.amount);
    if (amount > 0) {
      transfers.push({ from: debtor.id, to: receiver.id, amount: fromCents(amount) });
      debtor.amount -= amount;
      receiver.amount -= amount;
    }
    if (debtor.amount === 0) debtorIndex += 1;
    if (receiver.amount === 0) receiverIndex += 1;
  }

  return transfers;
};
