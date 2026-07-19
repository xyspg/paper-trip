import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import "./index.css";
import { routeTree } from "./routeTree.gen";
import { AppErrorBoundary } from "./components/AppErrorBoundary";

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
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
