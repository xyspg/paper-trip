import { createFileRoute } from "@tanstack/react-router";
import { MembersSection } from "../admin/MembersSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/t/$tripId/admin/members")({
  component: MembersRoute,
});

function MembersRoute() {
  const { toast } = useAdmin();
  return <MembersSection toast={toast} />;
}
