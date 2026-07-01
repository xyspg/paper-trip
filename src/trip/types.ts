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
    passUrl?: string;
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

// One dish/line from a scanned receipt, persisted on the expense so the itemized
// breakdown survives past the scan session. `price` is the row's line total (the
// same figure the split math divides). `who` lists the member ids that share the
// dish; absent/empty means everyone (AA). Only populated for expenses created via
// the receipt scanner — manual and seed expenses leave `items` undefined.
export type ExpenseItem = {
  name: string;
  quantity: number;
  price: number;
  who?: string[];
};

// A line item in the shared trip ledger. `payer` is a member id (see adminData
// MEMBERS) who covers the whole amount by default; `split` overrides that with a
// proportional multi-payer breakdown. Edited from the admin split view, shown
// read-only on the public ledger. `items` is the optional scanned-receipt
// breakdown, rendered read-only on both the admin and public ledgers (and PDF).
export type Expense = {
  id: string;
  cat: ExpenseCategory;
  name: string;
  sub: string;
  amount: number;
  credit: number;
  payer: string;
  split?: ExpenseSplit;
  items?: ExpenseItem[];
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
  };
  items: TripItem[];
  checklists: Checklist[];
  documents: TripDocument[];
  suggestions: TripSuggestion[];
  expenses: Expense[];
  updatedAt: string;
};
