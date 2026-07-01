import type { AdminMember } from "./adminData";

// Shorthand size presets (the admin defaults). Contexts that differ — the public
// ledger's ink border, the -5px overlap in expense rows — omit `size` and pass a
// full `className` instead, so conflicting width/border utilities are never both
// present (deterministic, no cascade-order surprises).
const SIZE: Record<"xs" | "sm" | "md", string> = {
  xs: "w-6 h-6 text-[9px] border-[1.5px] border-paper",
  sm: "w-[30px] h-[30px] text-[11px] border-2 border-paper",
  md: "w-[38px] h-[38px] text-[13px] border-2 border-paper",
};

export function Avatar({
  m,
  size,
  className = "",
}: {
  m: AdminMember;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full text-ink font-grotesk font-black tracking-[0.02em] ${size ? SIZE[size] : ""} ${className}`}
      style={{ background: m.color }}
    >
      {m.avatarUrl ? (
        // Absolutely fill the fixed-size circle so the image stays fully opaque
        // and correctly sized (a percentage h-full on a grid child mis-resolves).
        // Never a background or transparency behind it — m.color is only the
        // initials fallback, hidden once the photo covers the circle.
        <img
          className="absolute inset-0 h-full w-full object-cover"
          src={m.avatarUrl}
          alt=""
          draggable={false}
        />
      ) : (
        m.initials
      )}
    </span>
  );
}
