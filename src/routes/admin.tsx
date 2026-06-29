import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "../pages/AdminPage";
import { BaseWebProvider } from "../admin/baseweb";

// The admin tab lives in the URL (`/admin?tab=split`) so a refresh keeps the
// active section instead of snapping back to the default. Unknown values fall
// back to the itinerary tab.
export const ADMIN_TABS = ["itinerary", "suggestions", "split"] as const;
export type AdminTab = (typeof ADMIN_TABS)[number];

export const Route = createFileRoute("/admin")({
  validateSearch: (search: Record<string, unknown>): { tab: AdminTab } => {
    const tab = search.tab as AdminTab;
    return { tab: ADMIN_TABS.includes(tab) ? tab : "itinerary" };
  },
  component: () => (
    <BaseWebProvider>
      <AdminPage />
    </BaseWebProvider>
  ),
});
