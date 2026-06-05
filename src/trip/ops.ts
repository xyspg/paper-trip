import { tripData } from "./tripData";
import type { ChecklistItem, ItemStatus, Trip, TripItem } from "./types";

export type TripOp =
  | { type: "setItemStatus"; itemId: string; status: ItemStatus }
  | { type: "updateItem"; item: TripItem }
  | { type: "setChecklistItem"; checklistId: string; item: ChecklistItem }
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

    case "reset":
      return structuredClone(tripData);
  }
}
