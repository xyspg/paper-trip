import { tripData } from "./tripData";
import type {
  ChecklistItem,
  ItemStatus,
  SuggestionStatus,
  Trip,
  TripItem,
  TripSuggestion,
} from "./types";

export type TripOp =
  | { type: "setItemStatus"; itemId: string; status: ItemStatus }
  | { type: "updateItem"; item: TripItem }
  | { type: "setChecklistItem"; checklistId: string; item: ChecklistItem }
  | { type: "addSuggestion"; suggestion: TripSuggestion }
  | { type: "setSuggestionStatus"; suggestionId: string; status: SuggestionStatus }
  | { type: "deleteSuggestion"; suggestionId: string }
  | { type: "clearSuggestions" }
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

    case "reset":
      return structuredClone(tripData);
  }
}
