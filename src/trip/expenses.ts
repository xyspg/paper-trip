import type { Expense, ExpenseAllocation, Payment } from "./types";
import { currencyDecimals, expenseCurrency, normalizeCurrency, roundFxRate } from "./currency";

const cents = (value: number): number => Math.round(Math.max(0, Number(value) || 0) * 100);
const fromCents = (value: number): number => value / 100;

// Decimal precision of the currency an expense's own numbers are recorded in.
// Entries without an explicit currency are legacy/base-currency lines; those
// keep cent precision, which is a safe superset for every base currency.
export const expenseDecimals = (e: Expense): number => {
  const code = normalizeCurrency(e.currency);
  return code ? currencyDecimals(code) : 2;
};

// Expense ledger math shared by the public ledger and the admin split view so the
// two surfaces can never disagree. A line's credit can only offset up to its own
// amount, which keeps the totals reconciled: subtotal - creditTotal === total.
export const appliedCredit = (e: Expense): number => Math.min(e.credit || 0, Number(e.amount) || 0);

export const netExpense = (e: Expense): number => (Number(e.amount) || 0) - appliedCredit(e);

// Base-currency units per unit of the line's own currency. 1 for lines
// recorded directly in the base currency (or with a missing/invalid rate), so
// pre-multi-currency data aggregates unchanged. Structural so expenses and
// payments share one conversion rule.
export const expenseFxRate = (e: { fxRate?: number }): number => {
  const rate = Number(e.fxRate);
  return Number.isFinite(rate) && rate > 0 ? rate : 1;
};

// The rate a line contributes to base-currency aggregation. When the trip base
// is known, a line that resolves to the base itself always converts at exactly
// 1, so a stray fxRate on a base-currency row (malformed agent data) can never
// pull totals away from what the row visibly shows.
const aggregationRate = (e: { currency?: string; fxRate?: number }, base?: string): number =>
  base !== undefined && expenseCurrency(e, base) === base ? 1 : expenseFxRate(e);

export type ExpenseTotals = { subtotal: number; creditTotal: number; total: number };

// Totals are stated in the trip's base currency: each line converts at its own
// captured fxRate. Reconciliation survives the conversion because it holds per
// line before multiplying: (amount - credit) * rate = amount*rate - credit*rate.
export const expenseTotals = (expenses: Expense[], base?: string): ExpenseTotals => {
  let subtotal = 0;
  let creditTotal = 0;
  let total = 0;
  for (const e of expenses) {
    const rate = aggregationRate(e, base);
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
    if (sum > 0) return allocateByWeight(net, memberIds, shares, expenseDecimals(e));
  }
  if (e.payer in out) out[e.payer] = net;
  return out;
};

// Allocate an amount using arbitrary non-negative weights while keeping the
// result exact to the currency's smallest unit (cents by default, whole units
// for zero-decimal currencies). Fractional remainders are handed out in stable
// member order, so the returned amounts always add up to `amount`.
export const allocateByWeight = (
  amount: number,
  memberIds: string[],
  weights?: Record<string, number>,
  decimals: number = 2,
): ExpenseAllocation => {
  const out: ExpenseAllocation = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const factor = 10 ** decimals;
  const target = Math.round(Math.max(0, Number(amount) || 0) * factor);
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
  for (const row of rows) out[row.id] = row.value / factor;
  return out;
};

export const evenExpenseAllocation = (
  amount: number,
  memberIds: string[],
  decimals: number = 2,
): ExpenseAllocation => allocateByWeight(amount, memberIds, undefined, decimals);

export const fullExpenseAllocation = (
  amount: number,
  memberIds: string[],
  memberId: string,
  decimals: number = 2,
): ExpenseAllocation => allocateByWeight(amount, memberIds, { [memberId]: 1 }, decimals);

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
  return evenExpenseAllocation(net, memberIds, expenseDecimals(e));
};

export type ExpenseBalance = {
  id: string;
  paid: number;
  share: number;
  // Settle-up payments this member sent / received (base currency). They move
  // `balance` without touching paid/share, so expense figures stay expense-only.
  repaid: number;
  received: number;
  balance: number;
};

export type SettlementTransfer = {
  from: string;
  to: string;
  amount: number;
};

// The payments that actually move balances. Both sides must be on the roster,
// a traveler cannot repay themselves, and the amount must be a positive finite
// number: any other row would create or lose money. The roster test goes
// through a Set rather than `in`/`[]` on a plain object, so an id that collides
// with an Object.prototype key ("toString", "constructor", "__proto__") is
// rejected like any other stranger instead of passing the guard and then
// silently dropping its half of the transfer.
//
// Every surface that lists payments filters through this, so the ledger, the
// PDF statement and the settlement summary can never disagree about which
// transfers count. The admin console is the one exception: it shows rejected
// rows too, flagged, because it is where an owner deletes them.
export const countingPayments = (payments: Payment[], memberIds: string[]): Payment[] => {
  const roster = new Set(memberIds);
  return payments.filter((p) => {
    const amount = Number(p.amount);
    return (
      p.from !== p.to &&
      roster.has(p.from) &&
      roster.has(p.to) &&
      Number.isFinite(amount) &&
      amount > 0
    );
  });
};

// Balances are stated in the trip's base currency. Per-expense paid/owed maps
// each sum to the expense's own net (in its own currency), so converting both
// with the same fxRate keeps total paid === total owed across any currency mix.
// Settle-up payments then shift balances member-to-member: a payment counts
// toward what `from` has effectively paid and against what `to` is still owed,
// so both sides move by the same converted amount and the ledger stays
// zero-sum. Rows `countingPayments` rejects never reach the math.
export const expenseBalances = (
  expenses: Expense[],
  memberIds: string[],
  base?: string,
  payments: Payment[] = [],
): ExpenseBalance[] => {
  const paid = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const owed = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const repaid = Object.fromEntries(memberIds.map((id) => [id, 0]));
  const received = Object.fromEntries(memberIds.map((id) => [id, 0]));

  for (const e of expenses) {
    const rate = aggregationRate(e, base);
    const by = expensePaidBy(e, memberIds);
    const allocation = expenseOwedBy(e, memberIds);
    for (const id of memberIds) {
      paid[id] += by[id] * rate;
      owed[id] += allocation[id] * rate;
    }
  }

  for (const p of countingPayments(payments, memberIds)) {
    const amount = Number(p.amount) * aggregationRate(p, base);
    repaid[p.from] += amount;
    received[p.to] += amount;
  }

  return memberIds.map((id) => ({
    id,
    paid: paid[id] || 0,
    share: owed[id] || 0,
    repaid: repaid[id] || 0,
    received: received[id] || 0,
    balance: (paid[id] || 0) - (owed[id] || 0) + (repaid[id] || 0) - (received[id] || 0),
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

// Restate rows for a base-currency change from `oldBase` to `newBase`.
// Recorded original-currency figures never change; only the base conversion is
// restated: rows implicitly in the old base become explicit `oldBase` rows at
// `rebaseRate` (newBase units per 1 oldBase unit), every foreign row's captured
// rate is multiplied by it, and rows already recorded in the new base become
// implicit again (conversion to itself is exactly 1 by definition).
//
// This is generic over the `{ currency, fxRate }` convention because expenses
// and settle-up payments both follow it, and a currency change must restate
// both. Rebasing only the expenses would leave every payment reading as a raw
// figure in the new unit, misstating balances by the whole rebase factor.
export const rebaseFxRows = <T extends { currency?: string; fxRate?: number }>(
  rows: T[],
  oldBase: string,
  newBase: string,
  rebaseRate: number,
): T[] =>
  rows.map((row) => {
    const currency = normalizeCurrency(row.currency) ?? oldBase;
    if (currency === newBase) return { ...row, currency: undefined, fxRate: undefined };
    // A row recorded in the old base converted at exactly 1; foreign rows keep
    // their captured old-base rate as the starting point.
    const captured = currency === oldBase ? 1 : expenseFxRate(row);
    return { ...row, currency, fxRate: roundFxRate(captured * rebaseRate) };
  });
