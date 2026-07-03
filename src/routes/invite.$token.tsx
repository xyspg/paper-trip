import { createFileRoute } from "@tanstack/react-router";
import { InviteAcceptPage } from "../pages/InviteAcceptPage";

export const Route = createFileRoute("/invite/$token")({
  component: InviteRoute,
});

function InviteRoute() {
  const { token } = Route.useParams();
  return <InviteAcceptPage token={token} />;
}
