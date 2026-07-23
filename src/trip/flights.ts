import type { Flight, TripMember } from "./types";

const endpointKey = (flight: Flight, endpoint: "departure" | "arrival") => {
  const value = flight[endpoint];
  return `${value.date} ${value.time}`;
};

export function sortFlights(flights: Flight[]): Flight[] {
  return [...flights].sort((a, b) => {
    const departure = endpointKey(a, "departure").localeCompare(endpointKey(b, "departure"));
    if (departure !== 0) return departure;
    return endpointKey(a, "arrival").localeCompare(endpointKey(b, "arrival"));
  });
}

export function flightsForTraveler(flights: Flight[], travelerId: string): Flight[] {
  return sortFlights(flights.filter((flight) => flight.travelerId === travelerId));
}

export function memberForUser(members: TripMember[], userId?: string): TripMember | undefined {
  if (!userId) return undefined;
  return members.find((member) => member.userId === userId);
}

// The signed-in traveler is deliberately first; everyone else keeps roster
// order so the selector is stable while live flight edits arrive.
export function prioritizeMember(members: TripMember[], currentMemberId?: string): TripMember[] {
  if (!currentMemberId) return members;
  const current = members.find((member) => member.id === currentMemberId);
  return current
    ? [current, ...members.filter((member) => member.id !== currentMemberId)]
    : members;
}
