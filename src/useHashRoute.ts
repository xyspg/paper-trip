import { useSyncExternalStore } from 'react'
import { resolveRoute, type RouteConfig } from './routes'

const subscribe = (callback: () => void) => {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}

const getSnapshot = () => window.location.hash

// Hash routing keeps back/forward and shareable URLs working without pulling in
// a router dependency. useSyncExternalStore is the idiomatic primitive for
// subscribing to an external store (location.hash) — no effect needed.
export function useActiveRoute(): RouteConfig {
  const hash = useSyncExternalStore(subscribe, getSnapshot, () => '')
  return resolveRoute(hash)
}
