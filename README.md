# PaperTrip

A multi-tenant trip planner for shared timelines, bookings, expenses, and agent-assisted editing. The React client and Cloudflare Worker share one trip-scoped data model backed by D1 and one Durable Object per trip.

## Features

- Trip-scoped public timeline and admin console
- Shared itinerary, parking details, checklists, and suggestions
- Multi-person expenses, receipt scanning, and PDF statements
- GitHub sign-in, roles, invites, and private/public trips
- Local agent tokens with scoped write permissions and audit logs
- Real-time synchronization through Cloudflare Durable Objects

## Stack

- Vite 8
- React 19
- Tailwind CSS 4 via `@tailwindcss/vite`
- TypeScript
- Cloudflare Workers, Durable Objects, and D1
- better-auth

## Commands

```bash
bun install
bun run dev
bun run build
bun run lint
bun run typecheck:worker
```

## Local URL

The preferred local flow uses Portless:

```bash
portless papertrip vite
```
