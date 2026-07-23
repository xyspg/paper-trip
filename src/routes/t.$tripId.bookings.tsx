import { createFileRoute } from "@tanstack/react-router";
import { BookingsPage } from "../pages/BookingsPage";
import { BaseWebProvider } from "../admin/baseweb";

export const Route = createFileRoute("/t/$tripId/bookings")({
  component: BookingsRoute,
});

function BookingsRoute() {
  const { tripId } = Route.useParams();
  return (
    <BaseWebProvider>
      <BookingsPage tripId={tripId} />
    </BaseWebProvider>
  );
}
