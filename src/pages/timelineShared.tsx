import { t } from "@lingui/core/macro";
import type { ReactNode } from "react";
import type { TripItem } from "../trip/types";

// Presentation helpers for the trip timeline. Data shaping and lightweight
// rich-text rendering live here so the page stays focused on layout.

export type StopPlan = { kind: "main" | "alt"; label: string; text: string };

export const hasRichParking = (item: TripItem): boolean =>
  Boolean(
    item.parking &&
    (item.parking.reservationId ||
      item.parking.address ||
      item.parking.validFrom ||
      item.parking.price),
  );

export const itemPlans = (item: TripItem): StopPlan[] => {
  if (item.parking) {
    const plans: StopPlan[] = hasRichParking(item)
      ? []
      : [{ kind: "main", label: t`主方案`, text: item.parking.primary }];
    if (item.parking.backup) plans.push({ kind: "alt", label: t`备用`, text: item.parking.backup });
    if (item.parking.warning && !hasRichParking(item)) {
      plans.push({ kind: "alt", label: t`提醒`, text: item.parking.warning });
    }
    return plans;
  }
  // Every note renders: the timeline is the trip's operational sheet, so
  // silently dropping notes past the second hid things like cancellation
  // windows from the public page while the admin console still showed them.
  return item.notes.map((text, index) => ({
    kind: index === 0 ? "main" : "alt",
    label: index === 0 ? t`提示` : t`备注`,
    text,
  }));
};

export const formatDayDate = (iso: string): string => {
  const date = new Date(`${iso}T00:00:00`);
  const md = `${date.getMonth() + 1}/${date.getDate()}`;
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${md} · ${weekday}`;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Timeline sections only render dates that contain stops, but their DAY number
// still belongs to the trip's full calendar range. UTC keeps the date-only
// arithmetic stable across daylight-saving changes in either viewer timezone.
export const tripDayNumber = (tripStart: string, date: string): number => {
  const startMs = Date.parse(`${tripStart}T00:00:00Z`);
  const dateMs = Date.parse(`${date}T00:00:00Z`);
  if (!Number.isFinite(startMs) || !Number.isFinite(dateMs)) return 1;
  return Math.round((dateMs - startMs) / MS_PER_DAY) + 1;
};

// Render lightweight **bold** spans inside an otherwise plain editorial string.
// Each layout passes its own bold styling.
export const renderRich = (text: string, boldClassName = "font-extrabold"): ReactNode[] =>
  text.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 1 ? (
      <b key={index} className={boldClassName}>
        {part}
      </b>
    ) : (
      part
    ),
  );
