import type { AdminMember } from "./adminData";

export function Avatar({ m, size = "sm" }: { m: AdminMember; size?: "xs" | "sm" | "md" }) {
  return (
    <span className={`avatar ${size}`} style={{ background: m.color }}>
      {m.avatarUrl ? (
        <img className="avatar-img" src={m.avatarUrl} alt="" draggable={false} />
      ) : (
        m.initials
      )}
    </span>
  );
}
