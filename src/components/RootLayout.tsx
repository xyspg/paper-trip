import { Outlet, useRouterState } from "@tanstack/react-router";
import { PageNav } from "./PageNav";

export function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // The admin backend renders its own full-bleed chrome (topbar + sidebar), so it
  // opts out of the shared page shell and nav. Matches both unscoped /admin
  // bookmarks (redirects) and the trip-scoped /t/:tripId/admin console.
  // `/` also opts out: the signed-out landing page is full-bleed with its own
  // nav, and the signed-in dashboard brings its own copy of this shell.
  if (pathname === "/" || /(^|\/)admin(\/|$)/.test(pathname)) {
    return <Outlet />;
  }

  return (
    <main className="min-h-svh p-[clamp(14px,3vw,40px)] overflow-x-clip bg-paper text-ink font-sans leading-normal">
      <div className="w-[min(1040px,100%)] mx-auto">
        <PageNav />
        <Outlet />
      </div>
    </main>
  );
}
