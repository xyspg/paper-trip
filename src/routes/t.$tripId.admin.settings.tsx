import { createFileRoute } from "@tanstack/react-router";
import { SettingsSection } from "../admin/SettingsSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/t/$tripId/admin/settings")({
  component: SettingsRoute,
});

function SettingsRoute() {
  const { toast } = useAdmin();
  return <SettingsSection toast={toast} />;
}
