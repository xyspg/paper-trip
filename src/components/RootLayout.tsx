import { Outlet } from "@tanstack/react-router";
import { PageNav } from "./PageNav";

export function RootLayout() {
  return (
    <main className="ax-page">
      <div className="wrap">
        <PageNav />
        <Outlet />
      </div>
    </main>
  );
}
