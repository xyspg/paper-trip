import type { ReactNode } from "react";
import { CATS, CAT_KEYS } from "./adminData";
import type { StopCat } from "./adminData";
import { Icons } from "./AdminIcons";

// Calm editorial admin primitives shared by every section (itinerary /
// suggestions / split / audit). Ported from the "管理后台" Claude Design system.

export const BTN =
  "inline-flex items-center gap-2 font-sans font-semibold text-[13px] rounded-[10px] px-4 py-2.5 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed";
export const BTN_SM =
  "inline-flex items-center gap-1.5 font-sans font-semibold text-[12px] rounded-[9px] px-3 py-2 transition-colors whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed";
export const BTN_INK = "bg-[#1c1b19] text-white hover:bg-black";
export const BTN_GHOST = "bg-white border border-[#ebe9e3] text-[#3b3833] hover:border-[#1c1b19]";
export const BTN_DANGER =
  "bg-white border border-[#ecccc2] text-[#c2553f] hover:bg-[#c2553f] hover:text-white";
export const BTN_ACCENT = "bg-[#3f6f5b] text-white hover:brightness-95";

// Shared modal form-field recipes (label + text/select/number input), so every
// admin dialog renders identical calm fields.
export const FIELD_LABEL =
  "font-grotesk font-semibold text-[10px] tracking-[0.12em] uppercase text-[#9b988f]";
export const FIELD_INPUT =
  "font-cjk font-medium text-[14px] text-[#1c1b19] bg-white border border-[#ebe9e3] rounded-[10px] px-3 py-2.5 outline-none w-full transition-colors focus:border-[#1c1b19] placeholder:text-[#9b988f]";

// Selected / unselected color fork for a toggle "pill" (mode switch, payer chip,
// per-dish sharer). Callers own the pill's shape (padding/gap/font); this pair
// carries only the on/off palette so it stays in sync across every chip.
export const CHIP_ON = "bg-[#1c1b19] text-[#fafaf8] border-[#1c1b19]";
export const CHIP_OFF = "bg-white text-[#3b3833] border-[#ebe9e3] hover:border-[#1c1b19]";

// Dashed empty / loading / error card, shared by the audit and backup sections
// (and the suggestions inbox). `warn` swaps the icon chip to the alert tint.
export function AdminEmptyState({
  title,
  body,
  warn,
  icon,
}: {
  title: string;
  body: string;
  warn?: boolean;
  icon?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-6 border border-dashed border-[#ebe9e3] rounded-[14px] bg-white">
      <div
        className={`w-14 h-14 mx-auto mb-3.5 rounded-[14px] grid place-items-center [&_svg]:size-[26px] ${warn ? "bg-[#f7e9e4] text-[#c2553f]" : "bg-[#eef4f0] text-[#3f6f5b]"}`}
      >
        {icon ?? (warn ? <Icons.x sw={2.4} /> : <Icons.check sw={2.4} />)}
      </div>
      <div className="font-sans font-bold text-[17px]">{title}</div>
      <div className="font-cjk text-[13px] text-[#76726a] mt-2">{body}</div>
    </div>
  );
}

// Ghost refresh button used in the audit and backup section heads.
export function RefreshButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button className={`${BTN} ${BTN_GHOST} [&_svg]:size-3.5`} onClick={onClick} disabled={busy}>
      <Icons.swap sw={2.2} />
      {busy ? "刷新中" : "刷新"}
    </button>
  );
}

// Shared modal chrome. Every admin dialog uses the same header (icon chip + title
// + close X) and footer bar; `tone="alert"` tints the icon chip for destructive
// confirmations. Footer children own the button layout.
export function ModalHeader({
  icon,
  title,
  onClose,
  tone = "ink",
}: {
  icon: ReactNode;
  title: string;
  onClose: () => void;
  tone?: "ink" | "alert";
}) {
  const chip = tone === "alert" ? "bg-[#f7e9e4] text-[#c2553f]" : "bg-[#1c1b19] text-[#fafaf8]";
  return (
    <div className="flex items-center gap-3 px-[18px] py-4 border-b border-[#ebe9e3]">
      <span
        className={`shrink-0 w-9 h-9 rounded-[10px] grid place-items-center [&_svg]:size-[17px] ${chip}`}
      >
        {icon}
      </span>
      <span className="font-sans font-bold text-[16px] tracking-tight">{title}</span>
      <button
        type="button"
        className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border border-[#ebe9e3] bg-white text-[#76726a] cursor-pointer [&_svg]:size-[15px] hover:border-[#1c1b19] hover:text-[#1c1b19] transition-colors"
        title="关闭"
        onClick={onClose}
      >
        <Icons.x sw={2.6} />
      </button>
    </div>
  );
}

export function ModalFooter({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-t border-[#ebe9e3] bg-[#fdfdfb]">
      {children}
    </div>
  );
}

// Category picker chips (add / edit expense + stop). Selected fills in the
// category hue; unselected is a ghost pill with a colored dot.
export function CategoryChips({
  value,
  onChange,
}: {
  value: StopCat;
  onChange: (cat: StopCat) => void;
}) {
  return (
    <div className="flex flex-wrap gap-[7px]">
      {CAT_KEYS.map((k) => {
        const on = value === k;
        return (
          <button
            type="button"
            key={k}
            className={`inline-flex items-center gap-2 font-grotesk font-semibold text-[11px] tracking-[0.03em] px-3 py-[7px] rounded-full border transition-colors ${on ? "text-white" : `${CHIP_OFF}`}`}
            style={on ? { background: CATS[k].color, borderColor: CATS[k].color } : undefined}
            onClick={() => onChange(k)}
          >
            <span
              className="size-2 rounded-full"
              style={{ background: on ? "rgba(255,255,255,0.85)" : CATS[k].color }}
            />
            {CATS[k].label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionHead({
  kicker,
  title,
  desc,
  actions,
}: {
  kicker: string;
  title: string;
  desc: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="font-grotesk text-[11px] tracking-[0.18em] uppercase text-[#3f6f5b]">
          {kicker}
        </div>
        <h1 className="font-sans font-bold text-[28px] tracking-tight mt-2">{title}</h1>
        <p className="font-cjk text-[13.5px] text-[#76726a] mt-2">{desc}</p>
      </div>
      {actions && <div className="ml-auto flex gap-2.5 flex-wrap">{actions}</div>}
    </div>
  );
}

type MetricItem = { k: string; v: number | string; sub?: string; color?: string };

// Bordered metric strip. The inner grid is nudged -1px right/down so each cell's
// right/bottom rule is clipped at the rounded container edge, leaving only clean
// interior dividers at any column/row count.
export function Metrics({ items }: { items: MetricItem[] }) {
  return (
    <div className="mt-6 border border-[#ebe9e3] rounded-[14px] overflow-hidden">
      <div className="grid grid-cols-2 min-[560px]:grid-cols-4 -mr-px -mb-px">
        {items.map((m) => (
          <div key={m.k} className="px-5 py-4 border-r border-b border-[#ebe9e3]">
            <div className="font-grotesk text-[10px] tracking-[0.12em] uppercase text-[#9b988f]">
              {m.k}
            </div>
            <div
              className="font-sans font-bold text-[27px] mt-2 leading-none"
              style={m.color ? { color: m.color } : undefined}
            >
              {m.v}
            </div>
            {m.sub && <div className="font-cjk text-[11.5px] text-[#76726a] mt-1.5">{m.sub}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
