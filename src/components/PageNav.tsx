import { Link } from "@tanstack/react-router";
import { routes } from "../routes";

export function PageNav() {
  return (
    <nav className="flex flex-wrap gap-2 mb-4" aria-label="页面导航">
      {routes.map((route) => (
        <Link
          key={route.id}
          to={route.path}
          className="py-2 px-4 text-ink whitespace-nowrap no-underline uppercase tracking-[0.12em] bg-paper-2 border-2 border-ink rounded-full shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] duration-[0.08s] ease-[ease] font-grotesk text-[12px] font-extrabold active:shadow-none active:translate-x-[3px] active:translate-y-[3px]"
          activeOptions={{ exact: true }}
          activeProps={{ className: "text-yellow bg-ink" }}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
