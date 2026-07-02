import { describe, expect, it } from "bun:test";

import { applyOp } from "../src/trip/ops";
import { tripData } from "../src/trip/tripData";
import type { Trip, TripItem } from "../src/trip/types";

const item = (id: string, date: string, time: string): TripItem => ({
  id,
  date,
  time,
  title: id,
  category: "food",
  location: "",
  address: "",
  durationMinutes: 60,
  status: "planned",
  priority: "medium",
  notes: [],
  links: [],
});

const base = (): Trip => ({
  ...structuredClone(tripData),
  items: [
    item("a", "2026-07-02", "09:00"),
    item("b", "2026-07-02", "18:00"),
    item("c", "2026-07-03", "10:00"),
  ],
});

const ids = (t: Trip) => t.items.map((i) => i.id);

describe("addItem", () => {
  it("inserts in (date, time) order", () => {
    const t = applyOp(base(), { type: "addItem", item: item("x", "2026-07-02", "12:00") });
    expect(ids(t)).toEqual(["a", "x", "b", "c"]);
  });

  it("appends when latest", () => {
    const t = applyOp(base(), { type: "addItem", item: item("x", "2026-07-04", "08:00") });
    expect(ids(t)).toEqual(["a", "b", "c", "x"]);
  });

  it("is stable: equal (date, time) lands after the existing item", () => {
    const t = applyOp(base(), { type: "addItem", item: item("x", "2026-07-02", "09:00") });
    expect(ids(t)).toEqual(["a", "x", "b", "c"]);
  });

  it("replaces an existing id instead of duplicating (agent retry safety)", () => {
    const t = applyOp(base(), { type: "addItem", item: item("b", "2026-07-03", "23:00") });
    expect(ids(t)).toEqual(["a", "c", "b"]);
    expect(t.items[2].time).toBe("23:00");
  });
});

describe("deleteItem", () => {
  it("removes by id", () => {
    const t = applyOp(base(), { type: "deleteItem", itemId: "b" });
    expect(ids(t)).toEqual(["a", "c"]);
  });

  it("is a no-op for an unknown id", () => {
    const t = applyOp(base(), { type: "deleteItem", itemId: "nope" });
    expect(ids(t)).toEqual(["a", "b", "c"]);
  });
});
