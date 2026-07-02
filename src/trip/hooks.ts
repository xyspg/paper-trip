import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMountEffect } from "../useMountEffect";
import {
  createBackup,
  deleteBackup,
  fetchAudit,
  fetchBackups,
  fetchCreditCards,
  fetchTrip,
  fetchTripMeta,
  fetchTrips,
  restoreBackup,
  sendOp,
  tripWsUrl,
  type TripSnapshot,
} from "./api";
import { applyOp, type TripOp } from "./ops";
import type { Trip } from "./types";

// Every trip-scoped key is namespaced by tripId so switching trips can never
// bleed one trip's cache into another's.
const tripKey = (tripId: string) => ["trip", tripId] as const;
const backupsKey = (tripId: string) => ["trip-backups", tripId] as const;
const auditKey = (tripId: string) => ["audit", tripId] as const;
export const tripsKey = ["trips"] as const;
export const tripMetaKey = (tripId: string) => ["trip-meta", tripId] as const;

export const useTrip = (tripId: string) =>
  useQuery({ queryKey: tripKey(tripId), queryFn: () => fetchTrip(tripId) });

// Registry metadata (title/visibility/dates/my role). retry: false — a 401/403
// is an access verdict, not a transient failure.
export const useTripMeta = (tripId: string) =>
  useQuery({
    queryKey: tripMetaKey(tripId),
    queryFn: () => fetchTripMeta(tripId),
    retry: false,
    staleTime: 30_000,
  });

export const useTrips = (enabled = true) =>
  useQuery({ queryKey: tripsKey, queryFn: fetchTrips, enabled, retry: false });

// Member-only audit trail. Gated by `enabled` so it never fires on a public or
// unauthenticated /admin load (the endpoint 403s for non-members); `retry: false`
// because a 403 is authoritative, not a transient error worth re-issuing.
export const useAudit = (tripId: string, enabled = true) =>
  useQuery({
    queryKey: auditKey(tripId),
    queryFn: () => fetchAudit(tripId),
    enabled,
    retry: false,
    staleTime: 30_000,
  });

export const useBackups = (tripId: string, enabled = true) =>
  useQuery({
    queryKey: backupsKey(tripId),
    queryFn: () => fetchBackups(tripId),
    enabled,
    retry: false,
    staleTime: 30_000,
  });

export const useCreateBackup = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (label?: string) => createBackup(tripId, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupsKey(tripId) });
      queryClient.invalidateQueries({ queryKey: auditKey(tripId) });
    },
  });
};

export const useDeleteBackup = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteBackup(tripId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: backupsKey(tripId) });
      queryClient.invalidateQueries({ queryKey: auditKey(tripId) });
    },
  });
};

export const useRestoreBackup = (tripId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => restoreBackup(tripId, id),
    onSuccess: (snapshot) => {
      // Restore only bumps rev + writes one audit row; the backups list is
      // unchanged, so don't invalidate it (avoids a redundant refetch).
      queryClient.setQueryData<TripSnapshot>(tripKey(tripId), snapshot);
      queryClient.invalidateQueries({ queryKey: auditKey(tripId) });
    },
  });
};

// Resolve a card's art by its catalog name. The card list rarely changes, so it
// is cached indefinitely; cards missing from the catalog (or before the fetch
// resolves) return undefined and fall back to a swatch.
export const useCardImage = (): ((name?: string) => string | undefined) => {
  const { data } = useQuery({
    queryKey: ["credit-cards"],
    queryFn: fetchCreditCards,
    staleTime: Infinity,
  });
  return (name) => (name ? data?.find((card) => card.name === name)?.imageUrl : undefined);
};

export const useTripOp = (tripId: string) => {
  const queryClient = useQueryClient();
  const key = tripKey(tripId);

  return useMutation({
    mutationFn: (op: TripOp) => sendOp(tripId, op),
    onMutate: async (op: TripOp) => {
      await queryClient.cancelQueries({ queryKey: key });
      const prev = queryClient.getQueryData<TripSnapshot>(key);
      if (prev) {
        queryClient.setQueryData<TripSnapshot>(key, {
          rev: prev.rev,
          trip: applyOp(prev.trip, op),
        });
      }
      return { prev };
    },
    onError: (_err, _op, context) => {
      if (context?.prev) queryClient.setQueryData(key, context.prev);
    },
    // Guard against out-of-order responses (e.g. two quick edits whose POSTs
    // resolve in reverse): never let an older server snapshot overwrite a newer
    // one already in the cache.
    onSuccess: (snapshot) =>
      queryClient.setQueryData<TripSnapshot>(key, (prev) =>
        prev && prev.rev > snapshot.rev ? prev : snapshot,
      ),
  });
};

type ServerMessage = { type: "snapshot" | "update"; rev: number; trip: Trip };

// Mount-scoped WebSocket sync. tripId is captured at mount; callers that can
// switch trips must remount (key by tripId) rather than expect a live re-bind.
export const useTripLiveSync = (tripId: string) => {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    const ws = new WebSocket(tripWsUrl(tripId));

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;

      const current = queryClient.getQueryData<TripSnapshot>(tripKey(tripId));

      if (!current) {
        // First data for this trip (e.g. the WS snapshot beat the HTTP fetch).
        queryClient.setQueryData<TripSnapshot>(tripKey(tripId), {
          rev: message.rev,
          trip: message.trip,
        });
        return;
      }

      if (message.rev > current.rev) {
        queryClient.setQueryData<TripSnapshot>(tripKey(tripId), {
          rev: message.rev,
          trip: message.trip,
        });
      }
    };

    return () => ws.close();
  });
};
