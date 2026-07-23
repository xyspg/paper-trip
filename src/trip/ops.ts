import type {
  ChecklistItem,
  Expense,
  ExpenseSplit,
  Flight,
  ItemStatus,
  SuggestionStatus,
  Trip,
  TripItem,
  TripSuggestion,
} from "./types";
import { allocateByWeight, appliedCredit } from "./expenses";

export type TripOp =
  | { type: "setItemStatus"; itemId: string; status: ItemStatus }
  | { type: "updateItem"; item: TripItem }
  | { type: "addItem"; item: TripItem }
  | { type: "deleteItem"; itemId: string }
  | { type: "setChecklistItem"; checklistId: string; item: ChecklistItem }
  | { type: "addSuggestion"; suggestion: TripSuggestion }
  | { type: "setSuggestionStatus"; suggestionId: string; status: SuggestionStatus }
  | { type: "deleteSuggestion"; suggestionId: string }
  | { type: "clearSuggestions" }
  | { type: "addExpense"; expense: Expense }
  | { type: "updateExpense"; expense: Expense }
  | { type: "deleteExpense"; expenseId: string }
  | { type: "setExpenseAmount"; expenseId: string; amount: number }
  | { type: "setExpensePayer"; expenseId: string; payer: string }
  | { type: "setExpenseSplit"; expenseId: string; payer: string; split?: ExpenseSplit }
  | { type: "addFlight"; flight: Flight }
  | { type: "updateFlight"; flight: Flight }
  | { type: "deleteFlight"; flightId: string; travelerId: string }
  | { type: "resetExpenses" }
  | { type: "reset" };

export function applyOp(trip: Trip, op: TripOp): Trip {
  switch (op.type) {
    case "setItemStatus":
      return {
        ...trip,
        items: trip.items.map((item) =>
          item.id === op.itemId ? { ...item, status: op.status } : item,
        ),
      };

    case "updateItem":
      return {
        ...trip,
        items: trip.items.map((item) => (item.id === op.item.id ? op.item : item)),
      };

    case "addItem": {
      // Re-adding an existing id replaces it (idempotent under agent retries).
      // Insert in (date, time) order — the timeline renders array order within
      // a day, so a blind append would show a new stop out of sequence.
      const items = trip.items.filter((item) => item.id !== op.item.id);
      const key = (i: TripItem) => `${i.date} ${i.time}`;
      const at = items.findIndex((existing) => key(existing) > key(op.item));
      if (at === -1) items.push(op.item);
      else items.splice(at, 0, op.item);
      return { ...trip, items };
    }

    case "deleteItem":
      return { ...trip, items: trip.items.filter((item) => item.id !== op.itemId) };

    case "setChecklistItem":
      return {
        ...trip,
        checklists: trip.checklists.map((cl) =>
          cl.id === op.checklistId
            ? {
                ...cl,
                items: cl.items.map((it) =>
                  it.id === op.item.id ? { ...it, checked: op.item.checked } : it,
                ),
              }
            : cl,
        ),
      };

    case "addSuggestion":
      // Newest first so the admin queue and per-stop list read top-down.
      return { ...trip, suggestions: [op.suggestion, ...(trip.suggestions ?? [])] };

    case "setSuggestionStatus":
      return {
        ...trip,
        suggestions: (trip.suggestions ?? []).map((s) =>
          s.id === op.suggestionId ? { ...s, status: op.status } : s,
        ),
      };

    case "deleteSuggestion":
      return {
        ...trip,
        suggestions: (trip.suggestions ?? []).filter((s) => s.id !== op.suggestionId),
      };

    case "clearSuggestions":
      return { ...trip, suggestions: [] };

    case "addExpense":
      // Newest last so the ledger keeps its entered order and added rows append.
      return { ...trip, expenses: [...(trip.expenses ?? []), op.expense] };

    case "updateExpense":
      // Replace the whole line item by id; callers preserve fields they don't edit
      // (e.g. `credit`) so an edit never silently drops them.
      return {
        ...trip,
        expenses: (trip.expenses ?? []).map((e) => (e.id === op.expense.id ? op.expense : e)),
      };

    case "deleteExpense":
      return {
        ...trip,
        expenses: (trip.expenses ?? []).filter((e) => e.id !== op.expenseId),
      };

    case "setExpenseAmount":
      return {
        ...trip,
        expenses: (trip.expenses ?? []).map((e) => {
          if (e.id !== op.expenseId) return e;
          const amount = Number.isFinite(op.amount) ? Math.max(0, op.amount) : 0;
          if (!e.owedBy) return { ...e, amount };
          const next = { ...e, amount };
          const memberIds = Object.keys(e.owedBy);
          return {
            ...next,
            owedBy: allocateByWeight(amount - appliedCredit(next), memberIds, e.owedBy),
          };
        }),
      };

    case "setExpensePayer":
      // Picking a single payer means they front 100%, so any prior split clears.
      return {
        ...trip,
        expenses: (trip.expenses ?? []).map((e) =>
          e.id === op.expenseId ? { ...e, payer: op.payer, split: undefined } : e,
        ),
      };

    case "setExpenseSplit":
      return {
        ...trip,
        expenses: (trip.expenses ?? []).map((e) =>
          e.id === op.expenseId ? { ...e, payer: op.payer, split: op.split } : e,
        ),
      };

    case "addFlight": {
      const flights = trip.flights ?? [];
      const existing = flights.find(
        (flight) => flight.id === op.flight.id && flight.travelerId === op.flight.travelerId,
      );
      // Retrying the same add replaces that traveler's leg, but an id already
      // owned by somebody else is never duplicated or reassigned accidentally.
      if (flights.some((flight) => flight.id === op.flight.id) && !existing) return trip;
      const next = existing
        ? flights.map((flight) => (flight === existing ? op.flight : flight))
        : [...flights, op.flight];
      return { ...trip, flights: next };
    }

    case "updateFlight":
      // Traveler assignment is immutable for an existing leg. An admin who
      // needs to move one deletes and re-adds it, keeping normal edits scoped
      // to the member named by the operation.
      return {
        ...trip,
        flights: (trip.flights ?? []).map((flight) =>
          flight.id === op.flight.id && flight.travelerId === op.flight.travelerId
            ? op.flight
            : flight,
        ),
      };

    case "deleteFlight":
      return {
        ...trip,
        flights: (trip.flights ?? []).filter(
          (flight) => !(flight.id === op.flightId && flight.travelerId === op.travelerId),
        ),
      };

    case "resetExpenses":
      return { ...trip, expenses: [] };

    case "reset":
      // Identity, metadata and the roster always survive a reset — `members`
      // is registry-owned, not trip content.
      return {
        ...trip,
        items: [],
        checklists: [],
        documents: [],
        suggestions: [],
        expenses: [],
        flights: [],
      };
  }
}

// The skeleton a freshly created trip starts from (the DO persists this on
// /internal/init). Content arrays empty; roster arrives via the first sync.
export function emptyTrip(seed: {
  id: string;
  title: string;
  dates: { start: string; end: string };
  timezone: string;
}): Trip {
  return {
    id: seed.id,
    title: seed.title,
    subtitle: "",
    dates: { ...seed.dates },
    base: { hotel: "", car: "", timezone: seed.timezone },
    items: [],
    checklists: [],
    documents: [],
    suggestions: [],
    expenses: [],
    flights: [],
    members: [],
    updatedAt: new Date().toISOString(),
  };
}
