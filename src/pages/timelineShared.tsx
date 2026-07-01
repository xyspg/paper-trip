import type { ReactNode } from "react"
import type { TripItem } from "../trip/types"

// Presentation helpers shared by both timeline layouts (anime = TimelinePage,
// paper = PaperTimeline). The two render very different chrome, but the data
// shaping (stop plans, day-date formatting, inline **bold** spans) and the
// per-day editorial labels are identical, so they live here as one source.

export type StopPlan = { kind: "main" | "alt"; label: string; text: string }

export const hasRichParking = (item: TripItem): boolean =>
  Boolean(
    item.parking &&
      (item.parking.passUrl ||
        item.parking.reservationId ||
        item.parking.address ||
        item.parking.validFrom ||
        item.parking.price),
  )

export const itemPlans = (item: TripItem): StopPlan[] => {
  if (item.parking) {
    const plans: StopPlan[] = hasRichParking(item)
      ? []
      : [{ kind: "main", label: "主方案", text: item.parking.primary }]
    if (item.parking.backup) plans.push({ kind: "alt", label: "备用", text: item.parking.backup })
    if (item.parking.warning && !hasRichParking(item)) {
      plans.push({ kind: "alt", label: "提醒", text: item.parking.warning })
    }
    return plans
  }
  return item.notes.slice(0, 2).map((text, index) => ({
    kind: index === 0 ? "main" : "alt",
    label: index === 0 ? "提示" : "备注",
    text,
  }))
}

export const formatDayDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`)
  const md = `${date.getMonth() + 1}/${date.getDate()}`
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase()
  return `${md} · ${weekday}`
}

// Render lightweight **bold** spans inside an otherwise plain editorial string.
// Each layout passes its own bold styling.
export const renderRich = (text: string, boldClassName = "font-extrabold"): ReactNode[] =>
  text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, index) =>
      index % 2 === 1 ? (
        <b key={index} className={boldClassName}>
          {part}
        </b>
      ) : (
        part
      ),
    )

// Per-day editorial label + tag, keyed by the real trip dates.
export const dayLabels: Record<string, { label: string; tag: string }> = {
  "2026-07-03": { label: "抵达 + Anime Expo 第一天", tag: "Arrival Day" },
  "2026-07-04": { label: "Anime Expo 全天", tag: "Main Event" },
  "2026-07-05": { label: "返程缓冲", tag: "Departure" },
}
