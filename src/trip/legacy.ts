// The pre-multi-tenant trip. Its Durable Object keeps this name (so its
// state/audit/backups survived the migration), its expenses reference the
// historical member keys 'you'/'spr', and a handful of curated surfaces
// (bookings, day labels, card recommendations) are hardcoded to it. New trips
// get the generic empty-state versions of those surfaces.
export const LEGACY_TRIP_ID = "anime-expo-2026";

export const isLegacyTrip = (tripId: string): boolean => tripId === LEGACY_TRIP_ID;
