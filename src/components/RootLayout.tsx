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
    <main className="ax-page">
      <div className="wrap">
        <PageNav />
        <Outlet />
      </div>
    </main>
  );
}
