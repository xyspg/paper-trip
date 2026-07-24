import type { StopCat } from "./adminData";
import type { ItemStatus, TripItem } from "../trip/types";

// `kind` drives the visual hierarchy (solid vs dashed row); `label` names what
// the row actually is. Only parking rows are alternatives to each other, so
// only they get the 主方案/备用 wording — notes are notes.
export type ItineraryPlan = {
  id: string;
  kind: "main" | "alt";
  label: string;
  text: string;
};

export type ItineraryStop = {
  id: string;
  day: number;
  date: string;
  time: string;
  cat: StopCat;
  status: ItemStatus;
  title: string;
  loc: string;
  addr: string;
  // Parking-backed stops edit a fixed primary/backup/warning triple; every
  // other stop edits a free-form note list. The wording differs accordingly.
  hasParking: boolean;
  plans: ItineraryPlan[];
};

const CATEGORY_FROM_TRIP: Record<TripItem["category"], StopCat> = {
  flight: "transit",
  drive: "transit",
  food: "food",
  event: "event",
  hotel: "stay",
  errand: "misc",
};

const CATEGORY_TO_TRIP: Record<Exclude<StopCat, "transit">, TripItem["category"]> = {
  food: "food",
  event: "event",
  stay: "hotel",
  misc: "errand",
};

const PARKING_PLAN_PREFIX = "parking:";
const NOTE_PLAN_PREFIX = "note:";

export const tripCategoryFor = (
  cat: StopCat,
  current?: TripItem["category"],
): TripItem["category"] => {
  if (cat !== "transit") return CATEGORY_TO_TRIP[cat];
  return current === "flight" ? "flight" : "drive";
};

export const itineraryPlans = (item: TripItem): ItineraryPlan[] => {
  if (item.parking) {
    const plans: ItineraryPlan[] = [
      {
        id: `${PARKING_PLAN_PREFIX}primary`,
        kind: "main",
        label: "主方案",
        text: item.parking.primary,
      },
    ];
    if (item.parking.backup !== undefined) {
      plans.push({
        id: `${PARKING_PLAN_PREFIX}backup`,
        kind: "alt",
        label: "备用",
        text: item.parking.backup,
      });
    }
    if (item.parking.warning !== undefined) {
      plans.push({
        id: `${PARKING_PLAN_PREFIX}warning`,
        kind: "alt",
        label: "提醒",
        text: item.parking.warning,
      });
    }
    return plans;
  }

  // Matches the public timeline's vocabulary (see timelineShared.itemPlans):
  // the first note leads, the rest are ordinary notes — not fallback plans.
  return item.notes.map((text, index) => ({
    id: `${NOTE_PLAN_PREFIX}${index}`,
    kind: index === 0 ? "main" : "alt",
    label: index === 0 ? "提示" : "备注",
    text,
  }));
};

export const itineraryStop = (item: TripItem, day: number): ItineraryStop => ({
  id: item.id,
  day,
  date: item.date,
  time: item.time,
  cat: CATEGORY_FROM_TRIP[item.category],
  status: item.status,
  title: item.title,
  loc: item.location,
  addr: item.address,
  hasParking: Boolean(item.parking),
  plans: itineraryPlans(item),
});

export const updatePlanText = (item: TripItem, planId: string, text: string): TripItem => {
  if (planId.startsWith(PARKING_PLAN_PREFIX) && item.parking) {
    const field = planId.slice(PARKING_PLAN_PREFIX.length);
    if (field === "primary" || field === "backup" || field === "warning") {
      return { ...item, parking: { ...item.parking, [field]: text } };
    }
  }

  if (planId.startsWith(NOTE_PLAN_PREFIX)) {
    const index = Number(planId.slice(NOTE_PLAN_PREFIX.length));
    if (Number.isInteger(index) && item.notes[index] !== undefined) {
      const notes = [...item.notes];
      notes[index] = text;
      return { ...item, notes };
    }
  }

  return item;
};

export const deletePlanFromItem = (item: TripItem, planId: string): TripItem => {
  if (planId.startsWith(PARKING_PLAN_PREFIX) && item.parking) {
    const field = planId.slice(PARKING_PLAN_PREFIX.length);
    if (field === "backup" || field === "warning") {
      const parking = { ...item.parking };
      delete parking[field];
      return { ...item, parking };
    }
    return item;
  }

  if (planId.startsWith(NOTE_PLAN_PREFIX)) {
    const index = Number(planId.slice(NOTE_PLAN_PREFIX.length));
    if (Number.isInteger(index) && item.notes[index] !== undefined) {
      return { ...item, notes: item.notes.filter((_, noteIndex) => noteIndex !== index) };
    }
  }

  return item;
};

export const addPlanToItem = (item: TripItem): TripItem => {
  if (item.parking) {
    if (item.parking.backup === undefined) {
      return { ...item, parking: { ...item.parking, backup: "" } };
    }
    if (item.parking.warning === undefined) {
      return { ...item, parking: { ...item.parking, warning: "" } };
    }
    return item;
  }
  return { ...item, notes: [...item.notes, ""] };
};

const validIsoDate = (value?: string | null): value is string =>
  Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));

const dateIn = (timeZone: string): string => {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((entry) => entry.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
};

export const itineraryDates = (
  items: TripItem[],
  startDate: string | null,
  endDate: string | null,
  timeZone: string,
): string[] => {
  const dates = new Set(items.map((item) => item.date).filter(validIsoDate));

  if (validIsoDate(startDate) && validIsoDate(endDate) && startDate <= endDate) {
    const cursor = new Date(`${startDate}T00:00:00Z`);
    const last = new Date(`${endDate}T00:00:00Z`);
    for (let count = 0; cursor <= last && count < 366; count += 1) {
      dates.add(cursor.toISOString().slice(0, 10));
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  } else {
    if (validIsoDate(startDate)) dates.add(startDate);
    if (validIsoDate(endDate)) dates.add(endDate);
  }

  if (dates.size === 0) dates.add(dateIn(timeZone));
  return [...dates].sort();
};
