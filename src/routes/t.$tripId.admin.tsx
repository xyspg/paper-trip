import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "../pages/AdminPage";
import { BaseWebProvider } from "../admin/baseweb";

// The trip's admin console is a layout route: it renders the shared chrome
// (topbar, sidebar, auth gate) and an <Outlet />. The active section lives in
// the path (`…/admin/itinerary` …) so a refresh keeps the section instead of
// needing a `?tab=` search param.
export const Route = createFileRoute("/t/$tripId/admin")({
  component: AdminRoute,
});

function AdminRoute() {
  const { tripId } = Route.useParams();
  return (
    <BaseWebProvider>
      <AdminPage tripId={tripId} />
    </BaseWebProvider>
  );
}
