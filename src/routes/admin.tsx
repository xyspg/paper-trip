import { createFileRoute } from "@tanstack/react-router";
import { AdminPage } from "../pages/AdminPage";
import { BaseWebProvider } from "../admin/baseweb";

export const Route = createFileRoute("/admin")({
  component: () => (
    <BaseWebProvider>
      <AdminPage />
    </BaseWebProvider>
  ),
});
