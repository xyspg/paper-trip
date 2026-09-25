import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { i18n } from "@lingui/core";
import { I18nProvider } from "@lingui/react";
import "./index.css";
import { activateLocale, detectLocale } from "./i18n";
import { routeTree } from "./routeTree.gen";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

declare global {
  interface Window {
    // Read by the boot watchdog in index.html: once the entry module has
    // executed, an empty #root means chunks/data are still loading, not that
    // the build is poisoned, so the watchdog must not clear caches and reload.
    __papertripEntryExecuted?: boolean;
  }
}

window.__papertripEntryExecuted = true;

if (new URL(window.location.href).searchParams.has("_papertrip_recover")) {
  window.setTimeout(() => {
    const recoveredUrl = new URL(window.location.href);
    if (!recoveredUrl.searchParams.has("_papertrip_recover")) return;
    recoveredUrl.searchParams.delete("_papertrip_recover");
    window.history.replaceState(
      null,
      "",
      `${recoveredUrl.pathname}${recoveredUrl.search}${recoveredUrl.hash}`,
    );
  }, 10_000);
}

// Must run before anything renders. Module-level code never translates (it
// would evaluate before this line); it defines `msg` descriptors instead.
activateLocale(detectLocale());

const queryClient = new QueryClient();

const router = createRouter({
  routeTree,
  // Poisoned/stale route chunks on iOS Safari surface here as an uncaught error;
  // AppErrorBoundary clears caches and reloads once, then shows localized
  // guidance instead of the raw router error panel.
  defaultErrorComponent: AppErrorBoundary,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nProvider>
  </StrictMode>,
);
