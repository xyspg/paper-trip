// Wall-clock helpers stated on a trip's own base timezone. Every trip carries
// its own zone, so "today" and "now" must be derived from `trip.base.timezone`
// rather than the viewer's device or UTC. Both fall back to the device zone
// when the stored zone string is invalid, so a bad value degrades to a usable
// date instead of throwing.

// Today's date as "YYYY-MM-DD" on the trip's clock. en-CA formats in that
// order, matching the trip's ISO date keys for plain string comparison.
export const todayIn = (timeZone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(new Date());
  }
};

const CLOCK_OPTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

// The trip's "now" as "YYYY-MM-DD HH:MM", so it compares lexicographically
// against each item's `${date} ${time}` (both zero-padded).
export const nowIn = (timeZone: string): string => {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-CA", { timeZone, ...CLOCK_OPTS }).formatToParts(new Date());
  } catch {
    parts = new Intl.DateTimeFormat("en-CA", CLOCK_OPTS).formatToParts(new Date());
  }
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};
