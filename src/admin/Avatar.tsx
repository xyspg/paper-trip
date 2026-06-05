import type { AdminMember } from "./adminData";

export function Avatar({ m, size = "sm" }: { m: AdminMember; size?: "xs" | "sm" | "md" }) {
  return (
    <span className={`avatar ${size}`} style={{ background: m.color }}>
      {m.initials}
    </span>
  );
}
