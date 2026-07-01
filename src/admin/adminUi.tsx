import type { ReactNode } from "react";

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

export type MetricItem = { k: string; v: number | string; sub?: string; color?: string };

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
