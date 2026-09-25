import { i18n } from "@lingui/core";

// DOM-free and catalog-free, so shared modules (including ones the Worker
// type-checks and ones bun test loads) can ask for the active locale.

export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

// Lingui locales stay short; Intl formatters and <html lang> want a region.
export const INTL_LOCALES: Record<Locale, string> = { zh: "zh-CN", en: "en-US" };

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function currentLocale(): Locale {
  return isLocale(i18n.locale) ? i18n.locale : "zh";
}

/** BCP 47 tag for `Intl.*` / `toLocale*` calls that should follow the UI language. */
export function intlLocale(): string {
  return INTL_LOCALES[currentLocale()];
}
