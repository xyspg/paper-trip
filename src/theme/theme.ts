// Theme tokens live in src/index.css: the default `anime` look is the untouched
// @theme block, and `[data-theme="paper"]` overrides those CSS variables. This
// module only decides which theme is active and reflects it onto <html>.

export const THEMES = ["anime", "paper"] as const
export type Theme = (typeof THEMES)[number]

export const DEFAULT_THEME: Theme = "paper"
export const THEME_KEY = "ax26-theme"

const THEME_LABELS: Record<Theme, string> = {
  anime: "Anime",
  paper: "Paper",
}

export function themeLabel(theme: Theme) {
  return THEME_LABELS[theme]
}

function isTheme(value: string | null): value is Theme {
  return value != null && (THEMES as readonly string[]).includes(value)
}

// Resolve priority: ?theme= param → localStorage → default. A valid param is
// persisted so it survives later navigation without the query string.
export function resolveInitialTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME

  const param = new URLSearchParams(window.location.search).get("theme")
  if (isTheme(param)) {
    try {
      window.localStorage.setItem(THEME_KEY, param)
    } catch {
      // ignore storage failures (private mode, quota)
    }
    return param
  }

  try {
    const stored = window.localStorage.getItem(THEME_KEY)
    if (isTheme(stored)) return stored
  } catch {
    // ignore storage failures
  }

  return DEFAULT_THEME
}

// Reflect the active theme onto <html>. Pure DOM sync with no persistence, so
// the default theme on a fresh visit never mutates localStorage or the URL.
// Called at module init (before render) and from setTheme.
export function applyTheme(theme: Theme) {
  if (typeof document !== "undefined") {
    document.documentElement.dataset.theme = theme
  }
}

// Persist an explicit choice: remember it in localStorage and mirror it into the
// ?theme= query param so a shared or reloaded URL stays consistent. Called only
// from setTheme (a deliberate footer toggle), never on the default load path.
export function persistTheme(theme: Theme) {
  if (typeof window === "undefined") return

  try {
    window.localStorage.setItem(THEME_KEY, theme)
  } catch {
    // ignore storage failures
  }

  const url = new URL(window.location.href)
  if (url.searchParams.get("theme") === theme) return
  url.searchParams.set("theme", theme)
  window.history.replaceState(window.history.state, "", url)
}
