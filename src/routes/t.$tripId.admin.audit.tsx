import { createFileRoute } from "@tanstack/react-router";
import { AuditSection } from "../admin/AuditSection";

export const Route = createFileRoute("/t/$tripId/admin/audit")({
  component: AuditSection,
});
