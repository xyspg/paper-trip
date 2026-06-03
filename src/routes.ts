import type { ComponentType } from 'react'
import { TimelinePage } from './pages/TimelinePage'
import { BookingsPage } from './pages/BookingsPage'
import { LedgerPage } from './pages/LedgerPage'

export type RouteConfig = {
  id: string
  label: string
  Component: ComponentType
  narrow?: boolean
}

// Single source of truth for the app's pages. Adding a page = one entry here;
// nav, routing, and layout all derive from it.
export const routes: RouteConfig[] = [
  { id: 'timeline', label: '行程时间线', Component: TimelinePage },
  { id: 'bookings', label: '预订信息', Component: BookingsPage },
  { id: 'ledger', label: '账目明细', Component: LedgerPage, narrow: true },
]

const defaultRoute = routes[0]

// Match the first path segment of the hash against a known route, so a route
// name appearing in a query param or longer fragment can't be mistaken for it.
export const resolveRoute = (hash: string): RouteConfig => {
  const segment = hash.replace(/^#\/?/, '').split(/[/?]/)[0]
  return routes.find((route) => route.id === segment) ?? defaultRoute
}
