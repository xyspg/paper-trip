import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { UserRound } from "lucide-react";
import { routes } from "../routes";
import { openAdminLogin, useAdminUser } from "../admin/auth";

export function PageNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2 mb-[26px]" aria-label="页面导航">
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
      <SessionButton />
    </nav>
  );
}

// GitHub avatar when signed in (opens /admin in a new tab — the admin shell is
// separate chrome, so it never goes through the SPA router), login prompt when
// not. Hidden while the probe is in flight to avoid a wrong-state flash.
function SessionButton() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useAdminUser();
  if (isLoading) return null;

  const base =
    "grid place-items-center w-9 h-9 ml-auto p-0 overflow-hidden rounded-full border bg-white cursor-pointer transition-colors";
  return user ? (
    <button
      type="button"
      className={`${base} border-[#ebe9e3] hover:border-[#1c1b19]`}
      title={`${user.login} · 打开管理后台`}
      aria-label="打开管理后台"
      onClick={() => window.open("/admin", "_blank")}
    >
      <img className="h-full w-full object-cover" src={user.avatarUrl} alt="" draggable={false} />
    </button>
  ) : (
    <button
      type="button"
      className={`${base} border-[#ebe9e3] text-[#76726a] hover:border-[#1c1b19] hover:text-[#1c1b19]`}
      title="使用 GitHub 登录"
      aria-label="使用 GitHub 登录"
      onClick={() => openAdminLogin(queryClient)}
    >
      <UserRound size={17} strokeWidth={2.2} />
    </button>
  );
}
