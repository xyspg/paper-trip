# Admin split ↔ frontend ledger: sync expenses through the Trip

Date: 2026-06-06

## Problem

Editing 分账金额 in the admin console (`/admin` → 分账) changes nothing on the
public ledger (`/ledger`), and the edits don't survive a reload. There are three
independent copies of expense data and no write path connects them:

| Surface | Source | Persisted | Connected |
|---|---|---|---|
| Public ledger (`LedgerPage.tsx`) | hardcoded inline `ledger[]` | no | no |
| Admin split (`SplitSection.tsx`) | `useState(EXPENSES_SEED)` (`adminData.ts`) | no | no |
| Synced `Trip` (Durable Object) | `tripData.ts` | yes | no `expenses` field exists |

Suggestions already work end to end because they live inside the `Trip`:
`useTripOp` → worker `applyOp` → DO persists + WebSocket broadcast → clients
re-render. Expenses were never placed on that path.

## Goal

One source of truth for expenses, on the same synced-`Trip` path as suggestions,
so admin edits persist and show up on the public ledger after reload.

## Non-goals

- The itinerary `stops` mock (`STOPS_SEED`) has the same disconnect but is out of
  scope; only 分账 was reported.
- Live WebSocket updates on the public ledger. The ledger reads via `useTrip`
  only; edits appear after a reload. (Admin keeps its existing live sync.)
- Exposing payer / settlement on the public ledger. That stays admin-only; the
  public ledger keeps its current read-only presentation.
- The admin sub-section routing task (paused; resume after this).

## Design

### 1. Data model — `src/trip/types.ts`

Add an `Expense` type and an `expenses` array to `Trip`:

```ts
export type ExpenseCategory = "transit" | "food" | "event" | "stay" | "misc"

export type Expense = {
  id: string
  cat: ExpenseCategory
  name: string
  sub: string
  amount: number
  credit: number
  payer: string // member id
}

export type Trip = {
  // ...existing fields
  expenses: Expense[]
}
```

### 2. Canonical seed — `src/trip/tripData.ts`

`tripData.expenses` holds the canonical seed (the current `EXPENSES_SEED`
content: flight / hotel / tickets / car, with `payer`).

`adminData.ts` stops defining its own `Expense` type and `EXPENSES_SEED`; it
re-exports them from the trip layer so existing admin imports keep working
(`export type { Expense } from "../trip/types"`, `export { tripData ... }` /
re-export of the seed). `MEMBERS` / `TRAVELERS` / `CATS` stay in `adminData.ts`.
The `ExpenseCategory` union lives in `trip/types.ts`; `CATS` is keyed by it.

`LedgerPage`'s hardcoded `ledger[]` is deleted.

### 3. Reducer ops — `src/trip/ops.ts`

Add three ops to `TripOp` and `applyOp`, immutably mapping over
`trip.expenses` (mirroring the suggestion ops):

- `{ type: "setExpenseAmount"; expenseId: string; amount: number }`
- `{ type: "setExpensePayer"; expenseId: string; payer: string }`
- `{ type: "resetExpenses" }` → restores `structuredClone(tripData).expenses`
  (resets only expenses, not items/suggestions)

`reset` already returns `structuredClone(tripData)`, which now includes expenses.

### 4. Worker gating — `worker/index.ts`

Leave `PUBLIC_OPS` as `{ setItemStatus, addSuggestion }`. The three expense ops
are therefore admin-only (require a session): a public visitor reads the ledger
but cannot edit amounts/payers.

### 5. Durable Object backfill — `worker/AX26DurableObject.ts`

Next to `this.trip.suggestions ??= []`, add
`this.trip.expenses ??= structuredClone(tripData.expenses)` so the
already-persisted trip gains `expenses` on next boot without wiping storage.

### 6. Admin split — `src/admin/SplitSection.tsx` + `AdminPage.tsx`

- `AdminPage` reads `expenses` from `tripSnap.trip.expenses` (drop
  `useState(EXPENSES_SEED)`), and the `split` nav count becomes
  `expenses.length` from the trip.
- `SplitSection` is prop-driven exactly like `SuggestionsSection`: `AdminPage`
  passes `expenses` plus `onSetAmount` / `onSetPayer` / `onReset` callbacks that
  call `tripOp.mutate({ type: "setExpenseAmount" | "setExpensePayer" |
  "resetExpenses", ... })`. `SplitSection` no longer owns `setExpenses` state.
  Optimistic update + broadcast come from existing `useTripOp` / `applyOp`. The
  uncontrolled number input + `amtResetKey` remount-on-reset pattern is
  preserved (bump `amtResetKey` in `onReset`).

### 7. Public ledger — `src/pages/LedgerPage.tsx`

- Read `trip.expenses` via `useTrip()` (no `useTripLiveSync`).
- Keep an explicit per-id presentation map for icon + accent color
  (flight→Plane/cyan, hotel→Hotel/violet, tickets→Ticket/magenta,
  car→Car/yellow) so the current public look is unchanged. Only the data
  (name / sub / amount / credit) now comes from the trip.
- Totals computed as today: subtotal, credit total, net, per-person = net ÷ 2.
- Handle the loading state (no data yet) gracefully.

## Data flow (after)

```
admin edits amount
  → useTripOp POST /api/trip (optimistic applyOp)
  → worker applyOp + storage.put + broadcast
  → admin live-sync updates instantly
  → public /ledger reads trip.expenses via useTrip on next load/refetch
```

## Edge cases / migration

- Persisted DO state predating `expenses`: handled by the `??=` backfill.
- `reset` / `resetExpenses` reseed from `tripData`.
- Empty/NaN amount input: coerced to 0 (existing `SplitSection` behavior).
- Public POST of an expense op: rejected 403 by the worker auth gate.

## Validation

- `bun run build` (tsc + client/worker build)
- `bun run lint`
- `bun run typecheck:worker`
- Manual: admin edit amount/payer → reload `/ledger` shows the new value;
  admin 恢复原始 restores the seed; suggestions/items unaffected;
  public cannot edit (403).
