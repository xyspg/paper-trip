import { createContext, useContext, useState, type ReactNode } from "react"
import { applyTheme, DEFAULT_THEME, persistTheme, type Theme } from "./theme"

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // The active theme is already on <html> (set synchronously in main.tsx before
  // render), so state derives from there; no mount effect, no flash.
  const [theme, setThemeState] = useState<Theme>(
    () =>
      (typeof document !== "undefined"
        ? (document.documentElement.dataset.theme as Theme | undefined)
        : undefined) ?? DEFAULT_THEME,
  )

  // Event handler, not a reactive effect: DOM + persistence sync happens here.
  const setTheme = (next: Theme) => {
    setThemeState(next)
    applyTheme(next)
    persistTheme(next)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider")
  return ctx
}
