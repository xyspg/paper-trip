import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  loadTrip,
  resetTrip,
  saveTrip,
  updateChecklistItem,
  updateTripItem,
  updateTripItemStatus,
} from './storage'
import type { ChecklistItem, ItemStatus, TripItem } from './types'

const tripQueryKey = ['trip']

export const useTrip = () => useQuery({ queryKey: tripQueryKey, queryFn: loadTrip })

export const useSaveTripItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (item: TripItem) => {
      const trip = await loadTrip()
      return updateTripItem(trip, item)
    },
    onSuccess: (trip) => queryClient.setQueryData(tripQueryKey, trip),
  })
}

export const useSetTripItemStatus = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ itemId, status }: { itemId: string; status: ItemStatus }) => {
      const trip = await loadTrip()
      return updateTripItemStatus(trip, itemId, status)
    },
    onSuccess: (trip) => queryClient.setQueryData(tripQueryKey, trip),
  })
}

export const useSetChecklistItem = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      checklistId,
      item,
    }: {
      checklistId: string
      item: ChecklistItem
    }) => {
      const trip = await loadTrip()
      return updateChecklistItem(trip, checklistId, item)
    },
    onSuccess: (trip) => queryClient.setQueryData(tripQueryKey, trip),
  })
}

export const useResetTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: resetTrip,
    onSuccess: (trip) => queryClient.setQueryData(tripQueryKey, trip),
  })
}

export const useReplaceTrip = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: saveTrip,
    onSuccess: (trip) => queryClient.setQueryData(tripQueryKey, trip),
  })
}
