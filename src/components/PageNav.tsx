import { Link } from "@tanstack/react-router";
import { routes } from "../routes";

export function PageNav() {
  return (
    <nav className="flex flex-wrap gap-2 mb-[26px]" aria-label="页面导航">
      {routes.map((route) => (
        <Link
          key={route.id}
          to={route.path}
          className="py-2 px-[15px] whitespace-nowrap no-underline tracking-[0.04em] border rounded-full transition-colors font-grotesk text-[12px] font-semibold"
          activeOptions={{ exact: true }}
          activeProps={{ className: "text-[#fafaf8] bg-[#1c1b19] border-[#1c1b19]" }}
          inactiveProps={{
            className: "text-[#3b3833] bg-white border-[#ebe9e3] hover:border-[#1c1b19]",
          }}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
