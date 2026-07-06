import { createFileRoute } from "@tanstack/react-router";
import { AgentSection } from "../admin/AgentSection";
import { useAdmin } from "../admin/AdminContext";

export const Route = createFileRoute("/t/$tripId/admin/agent")({
  component: AgentRoute,
});

function AgentRoute() {
  const { toast } = useAdmin();
  return <AgentSection toast={toast} />;
}
