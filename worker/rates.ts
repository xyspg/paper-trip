import { Hono } from "hono";

import type { Env } from "./env";

// Live exchange-rate quotes for the multi-currency ledger, proxied through the
// worker so the browser has one stable same-origin endpoint and the upstream
// providers see one cached fetch per base per TTL instead of every visitor.
// Quotes only prefill the per-expense fxRate the admin captures at entry time —
// the stored rate is what all ledger math uses — so a day-old number is fine
// and an outage just means the rate is typed by hand.
//
// Providers, tried in order. Both are keyless public APIs:
// - open.er-api.com (ExchangeRate-API open endpoint): 160+ currencies, daily.
// - api.frankfurter.dev (Frankfurter): ECB reference rates (~30 currencies).
//
// The endpoint is public: quotes aren't sensitive, the base code is strictly
// validated, and the cache bounds upstream traffic.

const CACHE_TTL_SECONDS = 6 * 3600;

type RatesPayload = {
  base: string;
  // Provider-reported publication stamp, passed through verbatim.
  date: string;
  // Units of each listed currency per 1 unit of `base`.
  rates: Record<string, number>;
  provider: string;
};

function sanitizeRates(raw: Record<string, unknown>, base: string): Record<string, number> {
  const rates: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw)) {
    const rate = Number(value);
    if (/^[A-Z]{3}$/.test(code) && Number.isFinite(rate) && rate > 0) rates[code] = rate;
  }
  rates[base] = 1;
  return rates;
}

async function fromErApi(base: string): Promise<RatesPayload | null> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    result?: string;
    time_last_update_utc?: string;
    rates?: Record<string, unknown>;
  } | null;
  if (json?.result !== "success" || !json.rates) return null;
  return {
    base,
    date: json.time_last_update_utc ?? "",
    rates: sanitizeRates(json.rates, base),
    provider: "open.er-api.com",
  };
}

async function fromFrankfurter(base: string): Promise<RatesPayload | null> {
  const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}`);
  if (!res.ok) return null;
  const json = (await res.json().catch(() => null)) as {
    date?: string;
    rates?: Record<string, unknown>;
  } | null;
  if (!json?.rates) return null;
  return {
    base,
    date: json.date ?? "",
    rates: sanitizeRates(json.rates, base),
    provider: "frankfurter.dev",
  };
}

const rates = new Hono<{ Bindings: Env }>();

rates.get("/:base", async (c) => {
  const base = c.req.param("base").toUpperCase();
  if (!/^[A-Z]{3}$/.test(base)) return c.json({ error: "bad_base" }, 400);

  // Cache API keyed on a canonical per-base URL (the request URL would work
  // too, but a fixed key ignores stray query params).
  const cacheKey = new Request(`https://rates.papertrip.internal/${base}`);
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const payload =
    (await fromErApi(base).catch(() => null)) ?? (await fromFrankfurter(base).catch(() => null));
  if (!payload) return c.json({ error: "unavailable" }, 502);

  const res = Response.json(payload, {
    headers: { "cache-control": `public, max-age=${CACHE_TTL_SECONDS}` },
  });
  c.executionCtx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
});

export default rates;
