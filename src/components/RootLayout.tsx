import { Outlet, useRouterState } from "@tanstack/react-router";
import { routes } from "../routes";
import { PageNav } from "./PageNav";

export function RootLayout() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const route = routes.find((item) => item.path === pathname);

  return (
    <main className="ax-page">
      <div className={`wrap ${route?.narrow ? "wrap-narrow" : ""}`}>
        <PageNav />
        <Outlet />
      </div>
    </main>
  );
}
