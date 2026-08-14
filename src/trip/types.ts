// A stored trip snapshot's summary row (backup list / create / restore metadata).
// Defined here so the worker (Durable Object) and the client share one source.
export type TripBackup = {
  id: string;
  at: string;
  rev: number;
  label: string | null;
  actorLogin: string;
};

export type ItemStatus = "planned" | "locked" | "done";

export type TripItem = {
  id: string;
  date: string;
  time: string;
  // Wall-clock times read in the trip's default timezone (base.timezone). A
  // stop in another zone carries its own IANA zone here; the timeline labels
  // it with the appropriate short name.
  timezone?: string;
  title: string;
  category: "flight" | "food" | "event" | "hotel" | "drive" | "errand";
  location: string;
  address: string;
  durationMinutes: number;
  status: ItemStatus;
  priority: "low" | "medium" | "high";
  costEstimate?: number;
  confirmation?: string;
  leaveBy?: string;
  notes: string[];
  parking?: {
    primary: string;
    backup?: string;
    warning?: string;
    provider?: string;
    // Never store the provider's pass URL here: it is a capability URL (anyone
    // holding it can edit/cancel the reservation) and trip data is public.
    // The worker serves it from the PARKING_PASS_URLS secret, keyed by
    // reservationId, behind the trip membership check.
    reservationId?: string;
    address?: string;
    validFrom?: string;
    validTo?: string;
    price?: number;
    inOutAllowed?: boolean;
    walkMinutes?: number;
    walkDistanceMiles?: number;
    licensePlateRequired?: boolean;
    notes?: string[];
  };
  links: {
    label: string;
    url: string;
  }[];
};

export type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

export type Checklist = {
  id: string;
  title: string;
  items: ChecklistItem[];
};

export type TripDocument = {
  id: string;
  title: string;
  type: "pdf" | "image" | "code" | "note";
  location: string;
  note: string;
};

export type SuggestionStatus = "pending" | "adopted" | "ignored";

// A comment a traveler leaves on a stop from the public timeline. No author
// identity is collected (the timeline is unauthenticated); the admin console
// reviews these and marks each adopted or ignored.
export type TripSuggestion = {
  id: string;
  itemId: string;
  body: string;
  status: SuggestionStatus;
  createdAt: string;
};

export type ExpenseCategory = "transit" | "food" | "event" | "stay" | "misc";

// How a multi-payer contribution is entered: `percent` (e.g. 80 / 20) or
// `amount` (e.g. 300 / 10). Both are normalized against their own sum, so the
// numbers only need to be proportional — they don't have to add up to 100 or to
// the expense amount.
export type ExpensePayMode = "percent" | "amount";

// Optional override for who fronted an expense. When absent, the single `payer`
// covers 100%. `shares` maps a member id to its weight in the chosen mode;
// missing/zero members contributed nothing.
export type ExpenseSplit = {
  mode: ExpensePayMode;
  shares: Record<string, number>;
};

// Exact net amount each traveler is responsible for on one expense. When this
// field is absent the expense keeps the backwards-compatible AA default. Unlike
// `split` (who fronted the money), these values describe who ultimately owes it
// and must add up to the expense's net amount after credit.
export type ExpenseAllocation = Record<string, number>;

// One dish/line from a scanned receipt, persisted on the expense so the itemized
// breakdown survives past the scan session. `price` is the row's line total (the
// same figure the split math divides). `who` lists the member ids that share the
// dish; absent/empty means everyone (AA). Only populated for expenses created via
// the receipt scanner — manual expenses leave `items` undefined.
export type ExpenseItem = {
  name: string;
  quantity: number;
  price: number;
  who?: string[];
};

// A line item in the shared trip ledger. `payer` is a trip member id that
// covers the whole amount by default; `split` overrides that with a
// proportional multi-payer breakdown. `owedBy` independently stores the exact
// amount each member must ultimately bear; absent means AA for legacy entries.
// Edited from the admin split view, shown read-only on the public ledger.
// `items` is the optional scanned-receipt breakdown, rendered read-only on both
// the admin and public ledgers (and PDF).
//
// Multi-currency: every money field on one expense (`amount`, `credit`,
// `owedBy`, `items[].price`, amount-mode split shares) is recorded in ONE
// currency — `currency`, defaulting to the trip's base currency when absent.
// `fxRate` is the base-currency units per 1 unit of `currency`, captured when
// the expense was entered; aggregations multiply by it (expenses.ts), so the
// recorded original amounts are never rewritten by later rate moves.
export type Expense = {
  id: string;
  cat: ExpenseCategory;
  name: string;
  sub: string;
  amount: number;
  credit: number;
  payer: string;
  currency?: string;
  fxRate?: number;
  split?: ExpenseSplit;
  owedBy?: ExpenseAllocation;
  items?: ExpenseItem[];
};

// One airport endpoint of a flight. Dates/times are local wall-clock values at
// the airport; `timezone` is optional because the airport label is usually the
// clearest cue, but an IANA zone can be stored when the traveler needs it.
export type FlightEndpoint = {
  airport: string;
  date: string;
  time: string;
  timezone?: string;
};

// A traveler can have any number of flight legs. `travelerId` references the
// registry-owned TripMember.id, so the booking survives display-name/avatar
// changes and can be grouped around the signed-in traveler.
export type Flight = {
  id: string;
  travelerId: string;
  airline: string;
  flightNumber: string;
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  confirmation?: string;
  notes?: string;
};

// One person on the trip roster. `id` is the member key every Expense.payer /
// split share references. `userId` is absent for invited members who have not
// signed in. Maintained by the worker (synced from the D1 registry on every
// membership change) — never edited through trip ops.
export type TripMember = {
  id: string;
  userId?: string;
  name: string;
  avatarUrl?: string;
  color?: string;
};

export type Trip = {
  id: string;
  title: string;
  subtitle: string;
  dates: {
    start: string;
    end: string;
  };
  base: {
    hotel: string;
    car: string;
    timezone: string;
    // ISO 4217 settlement currency for totals/balances. Absent on state
    // persisted before multi-currency; readers treat that as USD.
    currency?: string;
  };
  items: TripItem[];
  checklists: Checklist[];
  documents: TripDocument[];
  suggestions: TripSuggestion[];
  expenses: Expense[];
  flights: Flight[];
  // Absent on state persisted before multi-tenancy; the worker backfills it.
  members?: TripMember[];
  updatedAt: string;
};
