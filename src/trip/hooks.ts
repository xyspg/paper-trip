import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMountEffect } from "../useMountEffect";
import { fetchCreditCards, fetchTrip, sendOp, tripWsUrl, type TripSnapshot } from "./api";
import { applyOp, type TripOp } from "./ops";
import type { Trip } from "./types";

const tripKey = ["trip"] as const;

export const useTrip = () => useQuery({ queryKey: tripKey, queryFn: fetchTrip });

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

export const useTripOp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendOp,
    onMutate: async (op: TripOp) => {
      await queryClient.cancelQueries({ queryKey: tripKey });
      const prev = queryClient.getQueryData<TripSnapshot>(tripKey);
      if (prev) {
        queryClient.setQueryData<TripSnapshot>(tripKey, {
          rev: prev.rev,
          trip: applyOp(prev.trip, op),
        });
      }
      return { prev };
    },
    onError: (_err, _op, context) => {
      if (context?.prev) queryClient.setQueryData(tripKey, context.prev);
    },
    // Guard against out-of-order responses (e.g. two quick edits whose POSTs
    // resolve in reverse): never let an older server snapshot overwrite a newer
    // one already in the cache.
    onSuccess: (snapshot) =>
      queryClient.setQueryData<TripSnapshot>(tripKey, (prev) =>
        prev && prev.rev > snapshot.rev ? prev : snapshot,
      ),
  });
};

type ServerMessage = { type: "snapshot" | "update"; rev: number; trip: Trip };

export const useTripLiveSync = () => {
  const queryClient = useQueryClient();

  useMountEffect(() => {
    const ws = new WebSocket(tripWsUrl());

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data) as ServerMessage;

      const current = queryClient.getQueryData<TripSnapshot>(tripKey);

      if (!current) return;

      if (message.rev > current.rev) {
        queryClient.setQueryData<TripSnapshot>(tripKey, { rev: message.rev, trip: message.trip });

      }
    };

    return () => ws.close();
  });
};
