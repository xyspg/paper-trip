import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "../pages/AdminPage";
import { BaseWebProvider } from "../admin/baseweb";

// `/admin` is a layout route: it renders the shared chrome (topbar, sidebar,
// auth gate) and an <Outlet />. The active section lives in the path
// (`/admin/itinerary` …) so a refresh keeps the section instead of needing a
// `?tab=` search param.
export const Route = createFileRoute("/admin")({
  component: () => (
    <BaseWebProvider>
      <AdminPage />
    </BaseWebProvider>
  ),
});
