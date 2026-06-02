# Trip Ops

Trip Ops is a local-first travel planner for detailed execution plans: day timelines, parking backups, checklists, documents, route links, and Markdown/JSON export.

## Stack

- Vite + React
- TanStack React Query for app state and persistence flows
- Hono Worker API in `worker/index.ts`
- Cloudflare Workers assets via `wrangler.jsonc`
- Oxlint and ESLint for validation

## Run

```bash
bun install
bun run dev --host 0.0.0.0
```

The Vite app runs at `http://localhost:5173/`.

## Verify

```bash
bun run build
bun run lint
bun run lint:ox
bun run typecheck:worker
bunx wrangler deploy --dry-run
```

## Deploy

```bash
bun run build
bun run worker:deploy
```

The current Worker stores sample API state in memory. The web app itself is local-first and persists edits in browser `localStorage`, so it can be used immediately without a Cloudflare database. D1/R2 can be added behind the existing Hono routes when multi-device sync and uploaded attachments are needed.
