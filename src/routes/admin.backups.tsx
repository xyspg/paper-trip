import { createFileRoute } from "@tanstack/react-router";
import { BackupSection } from "../admin/BackupSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/admin/backups")({
  component: BackupsRoute,
});

function BackupsRoute() {
  const { toast } = useAdmin();
  return <BackupSection toast={toast} />;
}
