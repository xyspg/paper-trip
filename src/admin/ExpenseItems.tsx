import { fmtMoney, TRAVELERS } from "./adminData"
import { Avatar } from "./Avatar"
import type { ExpenseItem } from "../trip/types"

// Read-only itemized receipt breakdown, shared by the admin split view and the
// public ledger (and mirrored in the PDF export). Renders nothing when the
// expense has no scanned items. `who` is shown only when a dish is split among a
// subset of travelers — AA dishes (undefined/all) stay uncluttered.
export function ExpenseItems({ items }: { items?: ExpenseItem[] }) {
  if (!items || items.length === 0) return null
  return (
    <ul className="exp-items">
      {items.map((it, i) => {
        const sharers =
          it.who && it.who.length ? TRAVELERS.filter((m) => it.who!.includes(m.id)) : null
        return (
          <li className="exp-item" key={`${it.name}-${i}`}>
            <span className="exp-item-label">
              {it.quantity > 1 && <b className="exp-item-qty">{it.quantity}×</b>}
              <span className="exp-item-name">{it.name}</span>
            </span>
            {sharers && (
              <span className="exp-item-who" title={sharers.map((m) => m.name).join(" · ")}>
                {sharers.map((m) => (
                  <Avatar key={m.id} m={m} size="xs" />
                ))}
              </span>
            )}
            <span className="exp-item-price">{fmtMoney(it.price)}</span>
          </li>
        )
      })}
    </ul>
  )
}
