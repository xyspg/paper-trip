import { createFileRoute } from "@tanstack/react-router";
import { AuditSection } from "../admin/AuditSection";

export const Route = createFileRoute("/admin/audit")({
  component: AuditSection,
});
