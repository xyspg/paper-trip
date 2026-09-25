import { t } from "@lingui/core/macro";
import { intlLocale } from "../locale";
import type { Trip, TripItem } from "./types";

// Built per call so the weekday/month names follow the active UI language.
export const formatDate = (value: string) =>
  new Intl.DateTimeFormat(intlLocale(), {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${value}T12:00:00`));

export const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  if (hours === 0) {
    return t`${remainder} 分钟`;
  }

  if (remainder === 0) {
    return t`${hours} 小时`;
  }

  return t`${hours} 小时 ${remainder} 分钟`;
};

export const groupItemsByDate = (items: TripItem[]) => {
  return items.reduce<Record<string, TripItem[]>>((groups, item) => {
    groups[item.date] = [...(groups[item.date] ?? []), item].sort((a, b) =>
      a.time.localeCompare(b.time),
    );
    return groups;
  }, {});
};

const parkingLines = (parking: NonNullable<TripItem["parking"]>) => {
  const { primary, reservationId, address, validFrom, validTo, price, backup, warning } = parking;
  const priceText = typeof price === "number" ? `$${price.toFixed(2)}` : "";
  return [
    `    - ${t`停车：${primary}`}`,
    reservationId ? `    - ${t`预订号：${reservationId}`}` : "",
    address ? `    - ${t`停车地址：${address}`}` : "",
    validFrom && validTo ? `    - ${t`有效时间：${validFrom} - ${validTo}`}` : "",
    priceText ? `    - ${t`价格：${priceText}`}` : "",
    parking.inOutAllowed ? "    - In & Out Allowed" : "",
    backup ? `    - ${t`备用停车：${backup}`}` : "",
    warning ? `    - ${t`提醒：${warning}`}` : "",
    ...(parking.notes ?? []).map((note) => `    - ${note}`),
  ]
    .filter(Boolean)
    .join("\n");
};

export const toMarkdown = (trip: Trip) => {
  const days = groupItemsByDate(trip.items);
  const dayBlocks = Object.entries(days)
    .map(([date, items]) => {
      const itemLines = items
        .map((item) => {
          const notes = item.notes.map((note) => `    - ${note}`).join("\n");
          const parking = item.parking ? parkingLines(item.parking) : "";
          const { location, address, leaveBy } = item;

          return [
            `- ${item.time} ${item.title}`,
            `  - ${t`地点：${location}`}`,
            `  - ${t`地址：${address}`}`,
            leaveBy ? `  - ${t`最晚离开：${leaveBy}`}` : "",
            notes ? `  - ${t`备注：`}\n${notes}` : "",
            parking ? `  - ${t`后勤：`}\n${parking}` : "",
          ]
            .filter(Boolean)
            .join("\n");
        })
        .join("\n\n");

      return `## ${formatDate(date)}\n\n${itemLines}`;
    })
    .join("\n\n");

  const checklists = trip.checklists
    .map((checklist) => {
      const items = checklist.items
        .map((item) => `- [${item.checked ? "x" : " "}] ${item.label}`)
        .join("\n");
      return `## ${checklist.title}\n\n${items}`;
    })
    .join("\n\n");

  const { hotel, car } = trip.base;
  return `# ${trip.title}\n\n${trip.subtitle}\n\n${t`据点：${hotel}`}\n${t`车辆：${car}`}\n\n${dayBlocks}\n\n# ${t`清单`}\n\n${checklists}\n`;
};

export const downloadText = (filename: string, text: string, type = "text/plain") => {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};
