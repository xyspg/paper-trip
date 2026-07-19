// Recovery for stale or poisoned hashed assets, surfaced through React.
//
// iOS Safari / WKWebView caches the immutable `/assets/*` files aggressively and
// can serve a corrupt or empty copy without revalidating. When that happens to a
// code-split route chunk, WebKit resolves its dynamic `import()` to `undefined`
// instead of rejecting, so TanStack Router's `lazyRouteComponent` throws while
// reading the component export off the missing module namespace:
//
//   undefined is not an object (evaluating 'e[t ?? "default"]')
//
// That `TypeError` is not one of the "…dynamically imported module…" messages
// TanStack recognises for its built-in reload-once, and it is not a rejected
// import, so neither the router nor the pre-React handler in index.html reacts to
// it. The page dead-ends on the router error boundary and a plain refresh
// re-serves the same poisoned chunk. These helpers detect that failure and run
// the same clear-caches-and-reload recovery the pre-React shell uses.

const RECOVERY_PARAM = "_papertrip_recover";

// A rejected chunk import (network or parse failure). Mirrors TanStack Router's
// `isModuleNotFoundError`.
function isModuleFetchError(message: string): boolean {
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message)
  );
}

// A chunk that resolved to `undefined` (WebKit poisoned-cache bug), surfaced as a
// TypeError while reading the route component off the missing module. The exact
// wording differs per engine, so match the shape rather than one literal string:
//   WebKit:   undefined is not an object (evaluating 'e[t ?? "default"]')
//   Chromium: Cannot read properties of undefined (reading 'default')
function isMissingModuleExportError(message: string): boolean {
  if (!/default|component/i.test(message)) return false;
  return (
    /(?:undefined|null) is not an object/i.test(message) ||
    /cannot read propert(?:y|ies) of (?:undefined|null)/i.test(message)
  );
}

export function isAssetLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = String((error as { message?: unknown }).message ?? error);
  return isModuleFetchError(message) || isMissingModuleExportError(message);
}

// True once a clear-and-reload recovery has already run for this document, so we
// avoid an infinite reload loop and switch to showing guidance instead.
export function hasAttemptedRecovery(): boolean {
  try {
    return new URL(window.location.href).searchParams.has(RECOVERY_PARAM);
  } catch {
    return false;
  }
}

// Unregister service workers and clear the Cache Storage API entries, then reload
// once with a document cache-buster. Self-contained (rather than reusing the
// pre-React `window.__papertripAssetLoadFailed`) so the manual retry button never
// trips that handler's "already recovering" branch, which would overwrite the
// React tree in `#root`.
export function recoverStaleAssets(): void {
  const cleanup: Array<Promise<unknown>> = [];

  if ("serviceWorker" in navigator && navigator.serviceWorker.getRegistrations) {
    cleanup.push(
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) =>
          Promise.all(registrations.map((registration) => registration.unregister())),
        )
        .catch(() => {}),
    );
  }
  if ("caches" in window) {
    cleanup.push(
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        .catch(() => {}),
    );
  }

  void Promise.all(cleanup).then(() => {
    const url = new URL(window.location.href);
    url.searchParams.set(RECOVERY_PARAM, Date.now().toString(36));
    window.location.replace(url.toString());
  });
}
