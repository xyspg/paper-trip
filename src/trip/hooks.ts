import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMountEffect } from "../useMountEffect";
import { fetchTrip, sendOp, tripWsUrl, type TripSnapshot } from "./api";
import { applyOp, type TripOp } from "./ops";
import type { Trip } from "./types";

const tripKey = ["trip"] as const;

export const useTrip = () => useQuery({ queryKey: tripKey, queryFn: fetchTrip });

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
    onSuccess: (snapshot) => queryClient.setQueryData(tripKey, snapshot),
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
