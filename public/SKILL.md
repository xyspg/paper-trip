---
name: ax26-trip
description: Read and edit the Anime Expo 2026 trip (itinerary stops, checklists, suggestions, expense ledger) through the ax26 HTTP API using a bearer token.
---

# ax26 Trip API

You are operating on a shared trip-planning app for Anime Expo 2026 (Los
Angeles). One JSON document holds the whole trip: itinerary items, checklists,
documents, suggestions, and an expense ledger. Humans watch it live — every
write you make broadcasts to open browsers immediately and lands in an audit
log under your token's identity.

## Setup

- **API base**: the origin you fetched this file from (e.g. `https://ax26.example.com`).
- **Auth**: every write needs `Authorization: Bearer <token>` — the `axa_...`
  token the user gave you alongside this file. Reads are public.
- Tokens expire; a 401/403 on a previously working call means ask the user for
  a fresh token.

## Read

```
GET /api/trip            → { "rev": number, "trip": Trip }
```

Always read first. `rev` is the optimistic-lock cursor for PUT.

## Write — single edits (preferred)

```
POST /api/trip
Authorization: Bearer <token>
Content-Type: application/json

<one op object>          → 200 { "rev": number, "trip": Trip }
```

One op per request. Allowed ops and their exact shapes:

| Op | Body |
| --- | --- |
| Add itinerary stop | `{"type":"addItem","item":<TripItem>}` |
| Edit stop (full replace by id) | `{"type":"updateItem","item":<TripItem>}` |
| Delete stop | `{"type":"deleteItem","itemId":"<id>"}` |
| Set stop status | `{"type":"setItemStatus","itemId":"<id>","status":"planned"\|"locked"\|"done"}` |
| Check/uncheck checklist row | `{"type":"setChecklistItem","checklistId":"<id>","item":{"id":"<rowId>","label":"…","checked":true}}` |
| Leave a suggestion on a stop | `{"type":"addSuggestion","suggestion":{"id":"<uuid>","itemId":"<stopId>","body":"…","status":"pending","createdAt":"<ISO>"}}` |
| Resolve a suggestion | `{"type":"setSuggestionStatus","suggestionId":"<id>","status":"adopted"\|"ignored"}` |
| Delete a suggestion | `{"type":"deleteSuggestion","suggestionId":"<id>"}` |
| Add expense | `{"type":"addExpense","expense":<Expense>}` |
| Edit expense (full replace by id) | `{"type":"updateExpense","expense":<Expense>}` |
| Delete expense | `{"type":"deleteExpense","expenseId":"<id>"}` |
| Set expense amount | `{"type":"setExpenseAmount","expenseId":"<id>","amount":123.45}` |
| Set single payer | `{"type":"setExpensePayer","expenseId":"<id>","payer":"<memberId>"}` |
| Set payer split | `{"type":"setExpenseSplit","expenseId":"<id>","payer":"<memberId>","split":{"mode":"percent"\|"amount","shares":{"<memberId>":80,"…":20}}}` |

Notes:
- `addItem` inserts in `(date, time)` order automatically and **replaces** an
  existing item with the same id, so retrying a failed call is safe.
- `updateItem` / `updateExpense` replace the **whole** object — fetch first and
  preserve fields you are not changing.
- Anything not listed (bulk resets, backup restore/delete) is refused with 403
  `{"error":"op_not_allowed"}`; those need a human admin.

## Write — bulk restructure

```
PUT /api/trip
Authorization: Bearer <token>
Content-Type: application/json

{ "rev": <rev you fetched>, "trip": <entire modified Trip> }
```

- 200 `{ rev, trip }` on success.
- 409 `{ "error": "stale_rev", rev, trip }` — someone wrote in between. Reapply
  your changes to the returned `trip` and PUT again with the new `rev`.
- 400 `{ "error": "bad_request" }` — the body must contain the ENTIRE trip
  (same `id`, all five arrays present), not a fragment.

**Before any bulk PUT, create a backup:**

```
POST /api/trip/backups        body: {"label":"pre-agent <what you're doing>"}
GET  /api/trip/backups        → list (restore/delete are human-only)
```

## Types (synced by hand from `src/trip/types.ts` — trust the live GET over this file)

```ts
type TripItem = {
  id: string                 // kebab-case slug, e.g. "dinner-kagaya"
  date: string               // "2026-07-03" — trip timezone America/Los_Angeles
  time: string               // "18:30" 24h
  title: string
  category: "flight" | "food" | "event" | "hotel" | "drive" | "errand"
  location: string           // venue name
  address: string            // full street address
  durationMinutes: number
  status: "planned" | "locked" | "done"   // locked = booked/confirmed
  priority: "low" | "medium" | "high"
  costEstimate?: number      // USD
  confirmation?: string      // booking confirmation code — only if the user gave one
  leaveBy?: string           // "17:40" — when to depart for this stop
  notes: string[]
  links: { label: string; url: string }[]
}

type Expense = {
  id: string
  cat: "transit" | "food" | "event" | "stay" | "misc"
  name: string               // display name
  sub: string                // one-line detail
  amount: number             // USD
  credit: number             // statement credit offsetting it, usually 0
  payer: string              // member id
  split?: { mode: "percent" | "amount"; shares: Record<string, number> }
  items?: { name: string; quantity: number; price: number; who?: string[] }[]
}
```

Member ids for `payer`/`shares` and checklist/document shapes: read them from
`GET /api/trip` (`trip.expenses[].payer`, `trip.checklists`) instead of guessing.

## Rules

1. Read → edit → write. Never write from a stale mental model of the trip.
2. Prefer a single op over PUT. Use PUT only for changes an op can't express.
3. Never invent data: no fabricated confirmation codes, prices, or addresses.
   If the user's screenshot/message doesn't say it, leave the field out or ask.
4. A restaurant booking becomes: `addItem` with `category: "food"`,
   `status: "locked"`, the reservation time, and the confirmation code if given.
5. Times are local to Los Angeles. Dates must fall inside `trip.dates`.
6. Don't touch `trip.suggestions` entries you didn't create; don't delete
   items/expenses unless the user asked.
