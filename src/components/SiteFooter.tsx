import { useTheme } from "../theme/ThemeProvider"
import { THEMES, themeLabel } from "../theme/theme"

export function SiteFooter() {
  const { theme, setTheme } = useTheme()

  return (
    <footer className="mt-10 pt-5 border-t-2 border-ink flex flex-wrap items-center justify-between gap-3">
      <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        Anime Expo 2026
      </span>

      <div
        className="inline-flex items-center gap-1 p-1 bg-paper-2 border-2 border-ink rounded-full shadow-hard-sm"
        role="group"
        aria-label="主题切换"
      >
        {THEMES.map((t) => {
          const active = theme === t
          return (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              aria-pressed={active}
              className={`px-3 py-1 rounded-full font-grotesk text-[12px] font-extrabold uppercase tracking-[0.1em] transition-colors ${
                active ? "bg-ink text-yellow" : "text-ink-soft hover:text-ink"
              }`}
            >
              {themeLabel(t)}
            </button>
          )
        })}
      </div>
    </footer>
  )
}
