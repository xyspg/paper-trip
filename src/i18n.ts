import { i18n, type Messages } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages.po";
import { messages as zhMessages } from "./locales/zh/messages.po";

export const LOCALES = ["zh", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = { zh: "中文", en: "English" };

const LOCALE_STORAGE_KEY = "papertrip.locale";

// Both catalogs ship in the entry chunk: a lazily imported catalog is one more
// request that can fail or hang before first render in flaky in-app webviews.
const CATALOGS: Record<Locale, Messages> = { zh: zhMessages, en: enMessages };

// Lingui locales stay short; Intl formatters and <html lang> want a region.
const INTL_LOCALES: Record<Locale, string> = { zh: "zh-CN", en: "en-US" };

function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function detectLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Storage can be blocked (private mode, webviews); fall back to the browser.
  }
  const preferred = navigator.languages?.length ? navigator.languages : [navigator.language];
  for (const tag of preferred) {
    const base = tag?.toLowerCase().split("-")[0];
    if (isLocale(base)) return base;
  }
  return "en";
}

export function activateLocale(locale: Locale) {
  i18n.loadAndActivate({ locale, messages: CATALOGS[locale] });
  document.documentElement.lang = INTL_LOCALES[locale];
}

// Switching reloads instead of re-rendering in place: module-level Intl
// formatters and React Compiler memo caches would otherwise keep the old
// language until something unrelated re-renders them.
export function switchLocale(locale: Locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    return;
  }
  window.location.reload();
}

export function currentLocale(): Locale {
  return isLocale(i18n.locale) ? i18n.locale : "zh";
}

/** BCP 47 tag for `Intl.*` / `toLocale*` calls that should follow the UI language. */
export function intlLocale(): string {
  return INTL_LOCALES[currentLocale()];
}
