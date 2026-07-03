import { isLegacyTrip } from "./legacy"
import type { Trip } from "./types"
import { MEMBERS as LEGACY_MEMBERS } from "../admin/adminData"
import type { AdminMember } from "../admin/adminData"

// Single source for roster swatches: the worker assigns them round-robin as
// members join (worker/registry.ts re-exports this), and the client falls back
// to the same palette by index, so both sides always agree.
export const MEMBER_COLORS = ["#3f6f5b", "#5b7a99", "#b08648", "#7a5c84", "#c2553f"]

// The people money can be split across, derived from the synced trip document
// (trip.members is registry-owned, pushed by the worker on every membership
// change). The hardcoded pair remains only as a fallback for the legacy trip
// before its roster backfill has run.
export function tripTravelers(trip: Trip): AdminMember[] {
  const members = trip.members ?? []
  if (members.length === 0) return isLegacyTrip(trip.id) ? LEGACY_MEMBERS : []
  return members.map((m, i) => ({
    id: m.id,
    name: m.name,
    handle: m.name,
    role: "同行",
    color: m.color ?? MEMBER_COLORS[i % MEMBER_COLORS.length],
    traveler: true,
    initials: m.name.slice(0, 2).toUpperCase(),
    avatarUrl: m.avatarUrl,
  }))
}

export const travelerIds = (travelers: AdminMember[]): string[] => travelers.map((m) => m.id)
