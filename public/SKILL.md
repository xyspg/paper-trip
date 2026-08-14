---
name: papertrip
description: Read and edit one Papertrip trip (itinerary stops, traveler flights, checklists, suggestions, expense ledger) through the HTTP API using a trip-scoped bearer token.
---

# Papertrip Trip API

You are operating on a shared multi-tenant trip-planning app. Each trip is one
JSON document: itinerary items, traveler flights, checklists, documents,
suggestions, and an expense ledger. Humans watch it live — every write you make broadcasts to open
browsers immediately and lands in an audit log under your token's identity.

## Setup

- **API base**: the origin you fetched this file from (e.g. `https://papertrip.example.com`).
- **Trip id**: given by the user alongside the token. All paths below live
  under `/api/trips/<tripId>`.
- **Auth**: every request needs `Authorization: Bearer <token>` — the `pta_...`
  token the user gave you. The token is scoped to exactly one trip; it opens
  nothing else. (Reads work unauthenticated only on public trips.)
- Tokens expire and are revoked if the minter leaves the trip; a 401/403 on a
  previously working call means ask the user for a fresh token.

## Read

```
GET /api/trips/<tripId>/trip     → { "rev": number, "trip": Trip }
```

Always read first. `rev` is the optimistic-lock cursor for PUT.

## Write — single edits (preferred)

```
POST /api/trips/<tripId>/trip
Authorization: Bearer <token>
Content-Type: application/json

<one op object>          → 200 { "rev": number, "trip": Trip }
```

One op per request. Allowed ops and their exact shapes:

| Op                                | Body                                                                                                                                        |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Add itinerary stop                | `{"type":"addItem","item":<TripItem>}`                                                                                                      |
| Edit stop (full replace by id)    | `{"type":"updateItem","item":<TripItem>}`                                                                                                   |
| Delete stop                       | `{"type":"deleteItem","itemId":"<id>"}`                                                                                                     |
| Set stop status                   | `{"type":"setItemStatus","itemId":"<id>","status":"planned"\|"locked"\|"done"}`                                                             |
| Check/uncheck checklist row       | `{"type":"setChecklistItem","checklistId":"<id>","item":{"id":"<rowId>","label":"…","checked":true}}`                                       |
| Leave a suggestion on a stop      | `{"type":"addSuggestion","suggestion":{"id":"<uuid>","itemId":"<stopId>","body":"…","status":"pending","createdAt":"<ISO>"}}`               |
| Resolve a suggestion              | `{"type":"setSuggestionStatus","suggestionId":"<id>","status":"adopted"\|"ignored"}`                                                        |
| Delete a suggestion               | `{"type":"deleteSuggestion","suggestionId":"<id>"}`                                                                                         |
| Add expense                       | `{"type":"addExpense","expense":<Expense>}`                                                                                                 |
| Edit expense (full replace by id) | `{"type":"updateExpense","expense":<Expense>}`                                                                                              |
| Delete expense                    | `{"type":"deleteExpense","expenseId":"<id>"}`                                                                                               |
| Set expense amount                | `{"type":"setExpenseAmount","expenseId":"<id>","amount":123.45}`                                                                            |
| Set single payer                  | `{"type":"setExpensePayer","expenseId":"<id>","payer":"<memberId>"}`                                                                        |
| Set payer split                   | `{"type":"setExpenseSplit","expenseId":"<id>","payer":"<memberId>","split":{"mode":"percent"\|"amount","shares":{"<memberId>":80,"…":20}}}` |
| Add traveler flight               | `{"type":"addFlight","flight":<Flight>}`                                                                                                    |
| Edit traveler flight              | `{"type":"updateFlight","flight":<Flight>}`                                                                                                 |
| Delete traveler flight            | `{"type":"deleteFlight","flightId":"<id>","travelerId":"<memberId>"}`                                                                       |

Notes:

- `addItem` inserts in `(date, time)` order automatically and **replaces** an
  existing item with the same id, so retrying a failed call is safe.
- `updateItem` / `updateExpense` replace the **whole** object — fetch first and
  preserve fields you are not changing.
- Anything not listed (bulk resets, backup restore/delete) is refused with 403
  `{"error":"op_not_allowed"}`; those need a human.

## Write — bulk restructure

```
PUT /api/trips/<tripId>/trip
Authorization: Bearer <token>
Content-Type: application/json

{ "rev": <rev you fetched>, "trip": <entire modified Trip> }
```

- 200 `{ rev, trip }` on success.
- 409 `{ "error": "stale_rev", rev, trip }` — someone wrote in between. Reapply
  your changes to the returned `trip` and PUT again with the new `rev`.
- 400 `{ "error": "bad_request" }` — the body must contain the ENTIRE trip
  (same `id`, every content array including `flights` present), not a fragment. `trip.members` is
  registry-owned: whatever you send there is ignored and re-imposed by the
  server.

**Before any bulk PUT, create a backup:**

```
POST /api/trips/<tripId>/backups   body: {"label":"pre-agent <what you're doing>"}
GET  /api/trips/<tripId>/backups   → list (restore/delete are human-only)
```

## Types (synced by hand from `src/trip/types.ts` — trust the live GET over this file)

```ts
type TripItem = {
  id: string; // kebab-case slug, e.g. "dinner-kagaya"
  date: string; // "2027-08-16" — in the trip's own timezone (trip.base.timezone)
  time: string; // "18:30" 24h — wall clock at the stop itself
  timezone?: string; // IANA zone, ONLY when this stop is not in trip.base.timezone (cross-timezone trips)
  title: string;
  category: "flight" | "food" | "event" | "hotel" | "drive" | "errand";
  location: string; // venue name
  address: string; // full street address
  durationMinutes: number;
  status: "planned" | "locked" | "done"; // locked = booked/confirmed
  priority: "low" | "medium" | "high";
  costEstimate?: number; // USD
  confirmation?: string; // booking confirmation code — only if the user gave one
  leaveBy?: string; // "17:40" — when to depart for this stop
  notes: string[];
  links: { label: string; url: string }[];
};

type Expense = {
  id: string;
  cat: "transit" | "food" | "event" | "stay" | "misc";
  name: string; // display name
  sub: string; // one-line detail
  amount: number; // in `currency` (falls back to trip.base.currency when absent)
  credit: number; // statement credit offsetting it, usually 0 — same currency as amount
  payer: string; // member id (trip.members[].id)
  currency?: string; // ISO 4217 code, ONLY when not trip.base.currency
  fxRate?: number; // trip.base.currency units per 1 unit of `currency`, captured at entry
  split?: { mode: "percent" | "amount"; shares: Record<string, number> };
  items?: { name: string; quantity: number; price: number; who?: string[] }[];
};

type Flight = {
  id: string;
  travelerId: string; // trip.members[].id
  airline: string;
  flightNumber: string;
  departure: { airport: string; date: string; time: string; timezone?: string };
  arrival: { airport: string; date: string; time: string; timezone?: string };
  confirmation?: string;
  notes?: string;
};
```

Member ids for `payer`/`shares` come from `trip.members[].id`; checklist and
document shapes: read them from the live GET instead of guessing.

## Rules

1. Read → edit → write. Never write from a stale mental model of the trip.
2. Prefer a single op over PUT. Use PUT only for changes an op can't express.
3. Never invent data: no fabricated confirmation codes, prices, or addresses.
   If the user's screenshot/message doesn't say it, leave the field out or ask.
4. A restaurant booking becomes: `addItem` with `category: "food"`,
   `status: "locked"`, the reservation time, and the confirmation code if given.
5. Times are wall-clock local to the stop. Stops in the trip's default zone
   (`trip.base.timezone`) omit `timezone`; a stop in another zone (e.g. the
   remote leg of a cross-timezone trip) sets its own IANA `timezone` so the
   timeline can label it. Dates must fall inside `trip.dates`.
6. Don't touch `trip.suggestions` entries you didn't create; don't delete
   items/expenses unless the user asked.
7. An expense in a foreign currency sets `currency` and `fxRate` together, and
   every money field on it (amount, credit, item prices, shares in amount mode)
   is in that currency. `GET /api/rates/<BASE>` (public) returns live quotes —
   `fxRate = 1 / rates[currency]` — when the user didn't state a rate.
