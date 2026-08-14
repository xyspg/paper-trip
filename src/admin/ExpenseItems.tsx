import { fmtMoney } from "./adminData";
import type { AdminMember } from "./adminData";
import { Avatar } from "./Avatar";
import type { ExpenseItem } from "../trip/types";

// Read-only itemized receipt breakdown, shared by the admin split view and the
// public ledger (and mirrored in the PDF export). Renders nothing when the
// expense has no scanned items. `who` is shown only when a dish is split among a
// subset of travelers — AA dishes (undefined/all) stay uncluttered.
export function ExpenseItems({
  items,
  travelers,
  currency,
}: {
  items?: ExpenseItem[];
  travelers: AdminMember[];
  // The parent expense's recorded currency (item prices share it).
  currency?: string;
}) {
  if (!items || items.length === 0) return null;
  return (
    <ul className="flex flex-col gap-1.5 mt-2.5 py-[9px] px-[11px] list-none bg-ink/4 border-[1.5px] border-dashed border-ink rounded-[10px]">
      {items.map((it, i) => {
        const sharers =
          it.who && it.who.length ? travelers.filter((m) => it.who!.includes(m.id)) : null;
        return (
          <li
            className="flex gap-2.5 items-center text-ink-soft font-cjk text-[12.5px] font-semibold"
            key={`${it.name}-${i}`}
          >
            <span className="inline-flex flex-1 min-w-0 gap-[5px] items-baseline">
              {it.quantity > 1 && (
                <b className="shrink-0 text-magenta font-mono font-black">{it.quantity}×</b>
              )}
              <span className="overflow-hidden text-ink text-ellipsis whitespace-nowrap">
                {it.name}
              </span>
            </span>
            {sharers && (
              <span className="inline-flex shrink-0" title={sharers.map((m) => m.name).join(" · ")}>
                {sharers.map((m) => (
                  <Avatar
                    key={m.id}
                    m={m}
                    className="w-[18px] h-[18px] text-[9px] border-[1.5px] border-paper -ml-[5px] first:ml-0"
                  />
                ))}
              </span>
            )}
            <span className="shrink-0 text-ink font-mono text-[12.5px] font-bold">
              {fmtMoney(it.price, currency)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
