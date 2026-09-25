import { i18n, type Messages } from "@lingui/core";
import { messages as enMessages } from "./locales/en/messages.po";
import { messages as zhMessages } from "./locales/zh/messages.po";
import { INTL_LOCALES, isLocale, type Locale } from "./locale";

// Browser boot and switching only. Shared code reads the active locale from
// ./locale instead, which pulls in neither the DOM nor the catalogs.

const LOCALE_STORAGE_KEY = "papertrip.locale";

// Both catalogs ship in the entry chunk: a lazily imported catalog is one more
// request that can fail or hang before first render in flaky in-app webviews.
const CATALOGS: Record<Locale, Messages> = { zh: zhMessages, en: enMessages };

// index.html mirrors this for the pre-boot failure page; keep them in sync.
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
