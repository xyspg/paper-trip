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

// A line item in the shared trip ledger. `payer` is a member id (see adminData
// MEMBERS). Edited from the admin split view, shown read-only on the public
// ledger.
export type Expense = {
  id: string;
  cat: ExpenseCategory;
  name: string;
  sub: string;
  amount: number;
  credit: number;
  payer: string;
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
