type TripMetadataInput = {
  title: string;
  startDate: string | null;
  endDate: string | null;
};

const formatDate = (iso: string): string => {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
};

const formatDateRange = ({ startDate, endDate }: TripMetadataInput): string | null => {
  if (startDate && endDate) return `${formatDate(startDate)}–${formatDate(endDate)}`;
  if (startDate) return `${formatDate(startDate)}起`;
  if (endDate) return `截至 ${formatDate(endDate)}`;
  return null;
};

export function tripDocumentMetadata(trip: TripMetadataInput): {
  title: string;
  description: string;
} {
  const dates = formatDateRange(trip);
  return {
    title: `${trip.title} · Papertrip`,
    description: dates
      ? `${trip.title} · ${dates}。在 Papertrip 查看时间线、预订与分账。`
      : `${trip.title} 的行程页面：在 Papertrip 查看时间线、预订与分账。`,
  };
}
