import { describe, expect, it } from "bun:test";
import {
  flightsForTraveler,
  memberForUser,
  prioritizeMember,
  sortFlights,
} from "../src/trip/flights";
import type { Flight, TripMember } from "../src/trip/types";

const flight = (
  id: string,
  travelerId: string,
  departureDate: string,
  departureTime: string,
): Flight => ({
  id,
  travelerId,
  airline: "",
  flightNumber: id,
  departure: { airport: "JFK", date: departureDate, time: departureTime },
  arrival: { airport: "NRT", date: departureDate, time: "20:00" },
});

const members: TripMember[] = [
  { id: "alice", userId: "u1", name: "Alice" },
  { id: "bob", userId: "u2", name: "Bob" },
  { id: "cara", userId: "u3", name: "Cara" },
];

describe("flight presentation", () => {
  it("prioritizes the signed-in traveler without reordering everyone else", () => {
    expect(prioritizeMember(members, "bob").map((member) => member.id)).toEqual([
      "bob",
      "alice",
      "cara",
    ]);
  });

  it("resolves a signed-in user to the stable trip member key", () => {
    expect(memberForUser(members, "u2")?.id).toBe("bob");
    expect(memberForUser(members, "missing")).toBeUndefined();
  });

  it("sorts each traveler's multiple legs by local departure", () => {
    const flights = [
      flight("late", "bob", "2027-08-18", "12:00"),
      flight("other", "alice", "2027-08-14", "07:00"),
      flight("early", "bob", "2027-08-15", "09:00"),
    ];
    expect(flightsForTraveler(flights, "bob").map((item) => item.id)).toEqual(["early", "late"]);
    expect(sortFlights(flights).map((item) => item.id)).toEqual(["other", "early", "late"]);
  });
});
