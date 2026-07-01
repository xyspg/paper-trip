import { Outlet, useRouterState } from "@tanstack/react-router";
import { PageNav } from "./PageNav";

export function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // The admin backend renders its own full-bleed chrome (topbar + sidebar), so it
  // opts out of the shared page shell and nav.
  if (pathname.startsWith("/admin")) {
    return <Outlet />;
  }

  return (
    <main className="min-h-svh p-[clamp(14px,3vw,40px)] overflow-x-clip bg-paper paper-grid text-ink font-grotesk leading-normal">
      <div className="w-[min(1040px,100%)] mx-auto">
        <PageNav />
        <Outlet />
      </div>
    </main>
  );
}
