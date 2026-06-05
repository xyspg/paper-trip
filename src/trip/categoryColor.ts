import type { TripItem } from "./types";

// Accent CSS custom-property name per itinerary category, shared by the timeline
// and the admin review queue. Values are bare var names; wrap with `var(...)` at
// the use site.
export const categoryColor: Record<TripItem["category"], string> = {
  flight: "--cyan",
  drive: "--cyan",
  food: "--yellow",
  event: "--magenta",
  hotel: "--violet",
  errand: "--green",
};
