import { useQuery } from "@tanstack/react-query";

// Client for the worker's /api/rates proxy (see worker/rates.ts). Quotes only
// prefill the editable per-expense rate captured at entry — the stored fxRate
// is what the ledger math uses — so a stale or missing quote never changes
// existing numbers.

export type FxRates = {
  base: string;
  date: string;
  // Units of each listed currency per 1 unit of `base`.
  rates: Record<string, number>;
  provider: string;
};

export const fetchRates = async (base: string): Promise<FxRates> => {
  const res = await fetch(`/api/rates/${encodeURIComponent(base)}`);
  if (!res.ok) throw new Error(`GET /api/rates/${base} failed: ${res.status}`);
  return (await res.json()) as FxRates;
};

// Base-currency units per 1 unit of `code` — i.e. the Expense.fxRate for an
// expense recorded in `code` — derived from a base-quoted table. Null when the
// provider doesn't list the code.
export const rateToBase = (rates: FxRates, code: string): number | null => {
  const perBase = Number(rates.rates[code]);
  if (!Number.isFinite(perBase) || perBase <= 0) return null;
  return 1 / perBase;
};

// Quotes refresh upstream at most daily and the worker caches for 6h; match
// that so an open admin session doesn't refetch per modal open.
export const useRates = (base: string, enabled = true) =>
  useQuery({
    queryKey: ["fx-rates", base],
    queryFn: () => fetchRates(base),
    enabled,
    staleTime: 6 * 3600_000,
    retry: 1,
  });
