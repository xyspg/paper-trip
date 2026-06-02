import { sampleTrip } from './sampleTrip'
import type { ChecklistItem, ItemStatus, Trip, TripItem } from './types'

const storageKey = 'trip-ops:v1'

const stamp = (trip: Trip): Trip => ({
  ...trip,
  updatedAt: new Date().toISOString(),
})

export const cloneTrip = (trip: Trip): Trip => JSON.parse(JSON.stringify(trip)) as Trip

export const loadTrip = async (): Promise<Trip> => {
  const stored = window.localStorage.getItem(storageKey)

  if (!stored) {
    return cloneTrip(sampleTrip)
  }

  try {
    return JSON.parse(stored) as Trip
  } catch {
    window.localStorage.removeItem(storageKey)
    return cloneTrip(sampleTrip)
  }
}

export const saveTrip = async (trip: Trip): Promise<Trip> => {
  const nextTrip = stamp(trip)
  window.localStorage.setItem(storageKey, JSON.stringify(nextTrip))
  return nextTrip
}

export const resetTrip = async (): Promise<Trip> => saveTrip(cloneTrip(sampleTrip))

export const updateTripItem = async (trip: Trip, item: TripItem): Promise<Trip> => {
  return saveTrip({
    ...trip,
    items: trip.items.map((candidate) => (candidate.id === item.id ? item : candidate)),
  })
}

export const updateTripItemStatus = async (
  trip: Trip,
  itemId: string,
  status: ItemStatus,
): Promise<Trip> => {
  return saveTrip({
    ...trip,
    items: trip.items.map((item) => (item.id === itemId ? { ...item, status } : item)),
  })
}

export const updateChecklistItem = async (
  trip: Trip,
  checklistId: string,
  checklistItem: ChecklistItem,
): Promise<Trip> => {
  return saveTrip({
    ...trip,
    checklists: trip.checklists.map((checklist) =>
      checklist.id === checklistId
        ? {
            ...checklist,
            items: checklist.items.map((item) =>
              item.id === checklistItem.id ? checklistItem : item,
            ),
          }
        : checklist,
    ),
  })
}
