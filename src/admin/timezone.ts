export const timezoneOptions: string[] = Intl.supportedValuesOf("timeZone");

export function timezoneOptionsForValue(value: string): string[] {
  if (!value || timezoneOptions.includes(value)) return timezoneOptions;
  return [value, ...timezoneOptions];
}

const normalizeTimezoneText = (value: string) =>
  value
    .normalize("NFKD")
    .toLocaleLowerCase()
    .replace(/[_/+-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export function timezoneMatchesQuery(timezone: string, query: string): boolean {
  const normalizedTimezone = normalizeTimezoneText(timezone);
  const normalizedQuery = normalizeTimezoneText(query);
  if (!normalizedQuery) return true;
  return (
    normalizedTimezone.includes(normalizedQuery) ||
    normalizedTimezone.replaceAll(" ", "").includes(normalizedQuery.replaceAll(" ", ""))
  );
}

export const timezoneDisplayName = (timezone: string): string => timezone.replaceAll("_", " ");
