import { Hono } from "hono";

import { memberUser } from "./registry";
import type { Env } from "./env";

// Receipt OCR/parse for the admin split view, mounted per trip
// (/api/trips/:tripId/receipt). The browser uploads a downscaled JPEG; we hand
// it to Gemini with a strict JSON schema and return the structured line items.
// Membership-gated so the key and quota stay protected.

// Model id comes from the GEMINI_MODEL public var (wrangler.jsonc), with a
// fallback so the scanner still works if it's unset.
const DEFAULT_MODEL = "gemini-3.1-flash-lite";
const endpointFor = (model: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// OpenAPI-subset schema Gemini enforces on its JSON output. Prices are line
// totals (quantity * unit) in the receipt's own currency, no symbols.
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    merchant: { type: "STRING" },
    currency: { type: "STRING" },
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          name: { type: "STRING" },
          quantity: { type: "NUMBER" },
          price: { type: "NUMBER" },
        },
        required: ["name", "price"],
      },
    },
    subtotal: { type: "NUMBER" },
    tax: { type: "NUMBER" },
    tip: { type: "NUMBER" },
    total: { type: "NUMBER" },
  },
  required: ["items", "total"],
} as const;

const PROMPT = [
  "You are a restaurant receipt parser.",
  "Read the receipt image and extract every ordered line item (dish or product).",
  "For each item return: name (keep the original language, including Chinese), quantity (default 1), and price = the line-item TOTAL for that row (quantity * unit price).",
  "Also return subtotal, tax, tip (0 if none), and total when printed.",
  "All money values are plain numbers with no currency symbols or thousands separators.",
  "Do not invent items, do not include subtotal/tax/total as line items, and ignore non-purchase text (server name, table, address).",
].join(" ");

type ParsedItem = { name: string; quantity?: number; price: number };
type ParsedReceipt = {
  merchant?: string;
  currency?: string;
  items: ParsedItem[];
  subtotal?: number;
  tax?: number;
  tip?: number;
  total: number;
};

const receipt = new Hono<{ Bindings: Env }>();

receipt.post("/parse", async (c) => {
  // Param typed loose here: the sub-app is mounted at /api/trips/:tripId/receipt.
  const tripId = c.req.param("tripId") ?? "";
  const user = tripId ? await memberUser(c, tripId) : null;
  if (!user) return c.json({ error: "forbidden" }, 403);

  const key = c.env.GEMINI_API_KEY;
  if (!key) return c.json({ error: "missing_key" }, 500);

  const body = (await c.req.json().catch(() => null)) as {
    image?: string;
    mimeType?: string;
  } | null;
  const data = body?.image;
  if (!data) return c.json({ error: "no_image" }, 400);
  const mimeType = body?.mimeType || "image/jpeg";

  const endpoint = endpointFor(c.env.GEMINI_MODEL || DEFAULT_MODEL);
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ inline_data: { mime_type: mimeType, data } }, { text: PROMPT }],
        },
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    return c.json({ error: "upstream", status: res.status, detail: detail.slice(0, 500) }, 502);
  }

  const json = (await res.json().catch(() => null)) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  } | null;
  const text = json?.candidates?.[0]?.content?.parts?.find((p) => p.text)?.text;
  if (!text) return c.json({ error: "empty" }, 502);

  let parsed: ParsedReceipt;
  try {
    parsed = JSON.parse(text) as ParsedReceipt;
  } catch {
    return c.json({ error: "parse" }, 502);
  }

  // Keep only well-formed positive-priced rows; the UI relies on numeric prices.
  const items = (parsed.items ?? [])
    .filter((it) => it && typeof it.name === "string" && Number.isFinite(Number(it.price)))
    .map((it) => ({
      name: it.name.trim(),
      quantity: Number.isFinite(Number(it.quantity)) && Number(it.quantity) > 0 ? Number(it.quantity) : 1,
      price: Math.max(0, Number(it.price)),
    }))
    .filter((it) => it.name.length > 0);

  const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : undefined);
  return c.json({
    merchant: typeof parsed.merchant === "string" ? parsed.merchant.trim() : "",
    currency: typeof parsed.currency === "string" ? parsed.currency.trim() : "",
    items,
    subtotal: num(parsed.subtotal),
    tax: num(parsed.tax),
    tip: num(parsed.tip),
    total: num(parsed.total),
  });
});

export default receipt;
