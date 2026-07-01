# Plain CSS → Tailwind v4 migration

Date: 2026-06-30
Status: DONE — App.css (2706) + admin.css (3040) deleted; CSS now 91 lines
(index.css: @theme tokens + paper-grid + toastIn keyframe). All 7 routes verified
faithful at 390px + 1280px. Avatar refactored to self-contained + fixed an
`h-full`-on-grid-child bug that distorted/hid the photo (now `absolute inset-0`).

## Goal

Migrate all hand-written CSS (`src/App.css` ~2.7k lines, `src/styles/admin.css`
~3.0k lines) to Tailwind v4 utilities, driving everything from `@theme` design
tokens. `src/index.css` already hosts the Tailwind entry. Net result: CSS files
shrink to a token block + a thin "floor" of things utilities can't express;
styling lives inline in JSX as utility classes.

## Strategy (chosen)

Inline utilities in JSX, keep a thin CSS floor. Not `@apply`, not a permanent
hybrid.

## Token foundation

The existing `:root` block (App.css:1-20) is already a clean design system. Move
it into `@theme` so Tailwind generates utilities:

- Colors → `--color-paper`, `--color-paper-2`, `--color-ink`, `--color-ink-soft`,
  `--color-magenta`, `--color-cyan`, `--color-yellow`, `--color-violet`,
  `--color-green`, `--color-amber`, `--color-red`, `--color-jetblue`.
  Yields `bg-*`, `text-*`, `border-*`.
- Shadows → `--shadow-hard: 6px 6px 0 var(--color-ink)`,
  `--shadow-hard-sm: 4px 4px 0 var(--color-ink)`. Yields `shadow-hard`,
  `shadow-hard-sm`.
- Radius → `--radius-card: 16px`. Yields `rounded-card`.
- Fonts → `--font-display`, `--font-grotesk`, `--font-cjk`, `--font-mono`.

`@theme` is the single source of truth.

### Transitional aliases (migration-only)

While App.css/admin.css still contain un-migrated rules referencing
`var(--ink)`, `var(--shadow)`, etc., keep a legacy `:root` alias block:
`--ink: var(--color-ink)`, `--magenta: var(--color-magenta)`,
`--shadow: var(--shadow-hard)`, etc. This bridges the transition so nothing
breaks mid-migration. Removed in the final cleanup once no consumer remains
(or kept only for the handful of inline-style/local-var consumers, repointed to
`--color-*`).

## Dynamic color plumbing

`categoryColor.ts` returns bare var names (`--cyan`…), consumed by inline `style`
setting local vars (`--cat`, `--accent`, `--pw`, `--c`, `--brand`). These keep
working through the migration via aliases; inlined utilities read the local var
via arbitrary values, e.g. `bg-[var(--cat)]`. In cleanup, repoint the map +
~6 inline sites to `--color-*`.

## Breakpoints

CSS uses one-off `max-width` queries (380/440/480/560/600/620/720/760) and one
`min-width:860`. Use Tailwind v4 arbitrary variants for exact parity:
`max-[760px]:…`, `min-[860px]:…`. No logic inversion, no invented named
breakpoints.

## Thin floor (kept in CSS)

- `@keyframes toastIn` (toast slide-in). `spin`/`rcpt-spin` → built-in
  `animate-spin`.
- Dotted-grid page background (`radial-gradient` + `background-size`) → one
  small `@utility paper-grid`.
- Decorative `::before`/`::after` become `before:`/`after:` utilities where
  reasonable; anything genuinely awkward stays as a tiny utility.

## Order & execution (conflict-safe)

Two surfaces, each gated by screenshots:

- Surface A — public app (App.css): RootLayout, PageNav, AddressLink,
  SuggestBox, TimelinePage, BookingsPage, LedgerPage.
- Surface B — admin (admin.css): AdminPage + `src/admin/*`.

Per surface: parallel agents edit **disjoint `.tsx` files** (add utilities, drop
old class names) and report released CSS selectors; a **single serialized step**
deletes fully-released selectors from the shared CSS file; then `bun run build` +
`bun run lint`; then screenshot-verify.

## Verification

Before/after screenshots at 390px + 1280px for `/`, `/timeline`, `/bookings`,
`/ledger`, `/admin`, `/admin/itinerary`, `/admin/split`, `/admin/audit`,
`/admin/suggestions`. App served at `https://ax26.localhost`. Admin routes via
the user's authenticated Chrome (claude-in-chrome).

## Risks

- Utility miscomputation → visual drift. Mitigated by screenshot gates.
- Selector specificity during transition: plain `.class` selectors outrank
  layered utilities, so old CSS wins until its rule is deleted — verify only
  after deletion.
- Admin auth required for admin screenshots (user logs in).
