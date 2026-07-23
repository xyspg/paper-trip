import { describe, expect, it } from "bun:test";

import { applyOp, emptyTrip } from "../src/trip/ops";
import type { Trip, TripItem } from "../src/trip/types";
import type { Flight } from "../src/trip/types";

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
  ...emptyTrip({
    id: "test-trip",
    title: "Test trip",
    dates: { start: "2027-08-15", end: "2027-08-16" },
    timezone: "UTC",
  }),
  items: [
    item("a", "2027-08-15", "09:00"),
    item("b", "2027-08-15", "18:00"),
    item("c", "2027-08-16", "10:00"),
  ],
});

const ids = (t: Trip) => t.items.map((i) => i.id);

describe("addItem", () => {
  it("inserts in (date, time) order", () => {
    const t = applyOp(base(), { type: "addItem", item: item("x", "2027-08-15", "12:00") });
    expect(ids(t)).toEqual(["a", "x", "b", "c"]);
  });

  it("appends when latest", () => {
    const t = applyOp(base(), { type: "addItem", item: item("x", "2027-08-17", "08:00") });
    expect(ids(t)).toEqual(["a", "b", "c", "x"]);
  });

  it("is stable: equal (date, time) lands after the existing item", () => {
    const t = applyOp(base(), { type: "addItem", item: item("x", "2027-08-15", "09:00") });
    expect(ids(t)).toEqual(["a", "x", "b", "c"]);
  });

  it("replaces an existing id instead of duplicating (agent retry safety)", () => {
    const t = applyOp(base(), { type: "addItem", item: item("b", "2027-08-16", "23:00") });
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

const flight = (id: string, travelerId: string): Flight => ({
  id,
  travelerId,
  airline: "ANA",
  flightNumber: "NH109",
  departure: { airport: "JFK", date: "2027-08-14", time: "12:00" },
  arrival: { airport: "HND", date: "2027-08-15", time: "15:00" },
});

describe("flight ops", () => {
  it("supports multiple legs for different travelers", () => {
    const withAlice = applyOp(base(), { type: "addFlight", flight: flight("f1", "alice") });
    const withBoth = applyOp(withAlice, { type: "addFlight", flight: flight("f2", "bob") });
    expect(withBoth.flights.map((item) => item.travelerId)).toEqual(["alice", "bob"]);
  });

  it("updates and deletes only when id and traveler ownership both match", () => {
    const original = applyOp(base(), { type: "addFlight", flight: flight("f1", "alice") });
    const wrongOwner = applyOp(original, {
      type: "updateFlight",
      flight: { ...flight("f1", "bob"), airline: "Wrong" },
    });
    expect(wrongOwner.flights[0].airline).toBe("ANA");

    const updated = applyOp(original, {
      type: "updateFlight",
      flight: { ...flight("f1", "alice"), airline: "United" },
    });
    expect(updated.flights[0].airline).toBe("United");
    expect(
      applyOp(updated, { type: "deleteFlight", flightId: "f1", travelerId: "bob" }).flights,
    ).toHaveLength(1);
    expect(
      applyOp(updated, { type: "deleteFlight", flightId: "f1", travelerId: "alice" }).flights,
    ).toHaveLength(0);
  });

  it("does not duplicate an id already assigned to another traveler", () => {
    const original = applyOp(base(), { type: "addFlight", flight: flight("f1", "alice") });
    const collision = applyOp(original, { type: "addFlight", flight: flight("f1", "bob") });
    expect(collision.flights).toEqual(original.flights);
  });
});
