import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "../pages/BookingsPage";

export const Route = createFileRoute("/t/$tripId/bookings")({
  component: BookingsRoute,
});

function BookingsRoute() {
  return <BookingsPage />;
}
