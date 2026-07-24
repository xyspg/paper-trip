import { describe, expect, it } from "bun:test";

import {
  addPlanToItem,
  deletePlanFromItem,
  itineraryDates,
  itineraryStop,
  tripCategoryFor,
  updatePlanText,
} from "../src/admin/itineraryAdapter";
import type { TripItem } from "../src/trip/types";

const item = (over: Partial<TripItem> = {}): TripItem => ({
  id: "tokyo-arrival",
  date: "2026-08-14",
  time: "09:00",
  title: "抵达东京",
  category: "flight",
  location: "HND",
  address: "",
  durationMinutes: 60,
  status: "locked",
  priority: "medium",
  notes: ["领取行李"],
  links: [],
  ...over,
});

describe("trip-scoped itinerary adapter", () => {
  it("renders only the current trip item", () => {
    expect(itineraryStop(item(), 1)).toMatchObject({
      id: "tokyo-arrival",
      day: 1,
      date: "2026-08-14",
      title: "抵达东京",
      cat: "transit",
      status: "locked",
      hasParking: false,
      plans: [{ id: "note:0", label: "提示", text: "领取行李" }],
    });
  });

  it("labels notes as notes and only parking rows as alternative plans", () => {
    const noteStop = itineraryStop(item({ notes: ["领取行李", "买西瓜卡", "确认末班车"] }), 1);
    expect(noteStop.hasParking).toBe(false);
    expect(noteStop.plans.map((p) => p.label)).toEqual(["提示", "备注", "备注"]);

    const parkingStop = itineraryStop(
      item({ parking: { primary: "P1", backup: "P2", warning: "限高 2.1m" } }),
      1,
    );
    expect(parkingStop.hasParking).toBe(true);
    expect(parkingStop.plans.map((p) => p.label)).toEqual(["主方案", "备用", "提醒"]);
  });

  it("preserves flight when editing another field in the transit category", () => {
    expect(tripCategoryFor("transit", "flight")).toBe("flight");
    expect(tripCategoryFor("transit", "food")).toBe("drive");
  });

  it("edits and deletes note-backed plans without touching other item fields", () => {
    const original = item({ notes: ["主方案", "备用"] });
    const edited = updatePlanText(original, "note:1", "新备用");
    expect(edited.notes).toEqual(["主方案", "新备用"]);
    expect(deletePlanFromItem(edited, "note:0").notes).toEqual(["新备用"]);
    expect(addPlanToItem(edited).notes).toEqual(["主方案", "新备用", ""]);
    expect(edited.title).toBe(original.title);
  });

  it("edits structured parking plans without flattening parking metadata", () => {
    const original = item({
      parking: {
        primary: "P1",
        backup: "P2",
        reservationId: "reservation-1",
        price: 20,
      },
    });
    const edited = updatePlanText(original, "parking:backup", "P3");
    expect(edited.parking).toMatchObject({
      primary: "P1",
      backup: "P3",
      reservationId: "reservation-1",
      price: 20,
    });
  });

  it("builds selectable dates from a fresh trip's own range", () => {
    expect(itineraryDates([], "2026-08-14", "2026-08-16", "Asia/Tokyo")).toEqual([
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);
  });
});
