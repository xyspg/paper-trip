import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { STOPS_SEED } from "../admin/adminData";
import type { AdminMember, Stop } from "../admin/adminData";
import { useAudit, useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { Avatar } from "../admin/Avatar";
import { Icons } from "../admin/AdminIcons";
import type { IconName } from "../admin/AdminIcons";
import { AdminLogin } from "../admin/AdminLogin";
import { ADMIN_SESSION_KEY, adminLogout, fetchAdminUser } from "../admin/auth";
import { AdminProvider } from "../admin/AdminContext";
import { cssVars } from "../admin/style";
import { useAdminToasts } from "../admin/useAdminToasts";

type SectionKey = "itinerary" | "suggestions" | "split" | "audit";
type NavEntry = {
  key: SectionKey;
  to: string;
  label: string;
  icon: IconName;
  accent: string;
  badge?: boolean;
};

// Each section now lives at its own route (`/admin/itinerary` …) so a refresh or
// shared link lands on the right tab without a `?tab=` search param.
const NAV: NavEntry[] = [
  { key: "itinerary", to: "/admin/itinerary", label: "行程停靠点", icon: "route", accent: "var(--color-magenta)" },
  { key: "suggestions", to: "/admin/suggestions", label: "待审建议", icon: "chat", accent: "var(--color-violet)", badge: true },
  { key: "split", to: "/admin/split", label: "分账金额", icon: "wallet", accent: "var(--color-yellow)" },
  { key: "audit", to: "/admin/audit", label: "操作记录", icon: "repo", accent: "var(--color-cyan)" },
];

const ADMIN_SHELL =
  "admin-app min-h-screen text-ink font-grotesk leading-normal bg-paper paper-grid";

export function AdminPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: fetchAdminUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  // Active tab is derived from the current path so the sidebar highlights the
  // section the router is actually showing.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [stops, setStops] = useState<Stop[]>(STOPS_SEED);
  const { toasts, toast } = useAdminToasts();

  // Suggestions are the live trip's comments, submitted from the public timeline.
  useTripLiveSync();
  const { data: tripSnap } = useTrip();
  const { data: auditEntries } = useAudit(Boolean(user));
  const tripOp = useTripOp();
  const suggestions = tripSnap?.trip.suggestions ?? [];
  const tripItems = tripSnap?.trip.items ?? [];
  const expenses = tripSnap?.trip.expenses ?? [];

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const counts: Record<SectionKey, number> = {
    itinerary: stops.length,
    suggestions: pendingCount,
    split: expenses.length,
    audit: auditEntries?.length ?? 0,
  };

  if (isLoading) {
    return (
      <div className={ADMIN_SHELL}>
        <div className="min-h-screen grid place-items-center p-[clamp(16px,4vw,48px)]">
          <span className="w-8 h-8 rounded-full border-4 border-[rgba(20,18,16,0.14)] border-t-magenta animate-[spin_0.7s_linear_infinite]" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className={ADMIN_SHELL}>
        <AdminLogin />
      </div>
    );
  }

  const display = user.name?.trim() || user.login;
  const me: AdminMember = {
    id: "me",
    name: display,
    handle: user.login,
    role: "管理员",
    color: "var(--color-magenta)",
    traveler: true,
    initials: display.slice(0, 2).toUpperCase(),
    avatarUrl: user.avatarUrl,
  };

  const logout = async () => {
    await adminLogout();
    queryClient.setQueryData(ADMIN_SESSION_KEY, null);
    toast("已退出登录", "warn");
  };

  return (
    <AdminProvider
      value={{ toast, stops, setStops, suggestions, items: tripItems, expenses, tripOp }}
    >
      <div className={ADMIN_SHELL}>
        <header className="sticky top-0 z-40 flex items-center gap-3.5 bg-ink text-paper border-b-[3px] border-ink py-[11px] px-[clamp(14px,3vw,26px)] max-[560px]:gap-[9px] max-[560px]:py-[9px] max-[560px]:px-[13px]">
          <Link
            to="/"
            className="flex items-center gap-[11px] min-w-0 text-inherit no-underline rounded-xl transition-[opacity,transform] duration-[0.12s] hover:opacity-85 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-[3px]"
            title="返回主页"
            aria-label="返回主页"
          >
            <span className="shrink-0 w-[38px] h-[38px] rounded-[10px] bg-magenta border-2 border-paper grid place-items-center font-display font-black text-[17px] text-ink">
              AX
            </span>
            <div className="min-w-0">
              <div className="font-display font-black text-[15px] uppercase tracking-[0.02em] leading-none whitespace-nowrap overflow-hidden text-ellipsis">后台</div>
              <div className="font-grotesk font-bold text-[10.5px] tracking-[0.12em] uppercase text-paper/60 mt-[3px] max-[380px]:hidden">Anime Expo 2026 Admin</div>
            </div>
          </Link>
          <span className="hidden items-center gap-[7px] ml-1.5 font-mono font-bold text-[12px] text-paper/82 bg-paper/8 border-2 border-paper/22 rounded-full py-[5px] px-3 [&_svg]:w-[14px] [&_svg]:h-[14px] min-[860px]:inline-flex">
            <Icons.repo sw={2} />
            aki-zero/anime-expo-2026
          </span>
          <span className="ml-auto" />
          <div className="flex items-center gap-[9px] bg-paper/8 border-2 border-paper/22 rounded-full pt-1 pr-1.5 pb-1 pl-3 max-[560px]:gap-0 max-[560px]:p-[3px]">
            <div className="text-right leading-[1.15] max-[560px]:hidden">
              <div className="font-cjk font-extrabold text-[12.5px] whitespace-nowrap">
                {me.name} · {me.role}
              </div>
              <div className="font-mono font-normal text-[10.5px] text-paper/60">@{me.handle}</div>
            </div>
            <Avatar m={me} size="sm" />
          </div>
          <button
            className="shrink-0 w-[34px] h-[34px] grid place-items-center rounded-full border-2 border-paper/30 bg-transparent text-paper cursor-pointer hover:bg-magenta hover:text-ink hover:border-paper [&_svg]:w-4 [&_svg]:h-4"
            title="退出登录"
            onClick={logout}
          >
            <Icons.logout sw={2.2} />
          </button>
        </header>

        <div className="flex items-start max-[760px]:flex-col">
          <aside className="shrink-0 w-[230px] sticky top-[61px] self-start h-[calc(100vh_-_61px)] py-5 px-4 border-r-[3px] border-ink flex flex-col gap-2 max-[760px]:static max-[760px]:w-full max-[760px]:h-auto max-[760px]:flex-row max-[760px]:flex-wrap max-[760px]:gap-[7px] max-[760px]:border-r-0 max-[760px]:border-b-[3px] max-[760px]:p-3">
            <div className="font-grotesk font-extrabold text-[10px] tracking-[0.18em] uppercase text-ink-soft mt-1.5 mx-2 mb-1 max-[760px]:hidden">管理区</div>
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              const badge = Boolean(n.badge) && counts[n.key] > 0;
              const Ico = Icons[n.icon];
              return (
                <Link
                  key={n.key}
                  to={n.to}
                  className={`flex items-center gap-[11px] py-[11px] px-[13px] rounded-[11px] border-2 cursor-pointer w-full text-left font-cjk font-bold text-[14px] no-underline transition-transform duration-[0.08s] ease-[ease] max-[760px]:w-auto max-[760px]:py-2 max-[760px]:px-3 ${active ? "bg-ink text-paper border-ink shadow-[3px_3px_0_var(--color-ink)]" : "bg-transparent text-ink border-transparent hover:bg-paper-2"}`}
                  style={cssVars({ "--accent": n.accent })}
                >
                  <span className={`shrink-0 w-[30px] h-[30px] rounded-lg border-2 grid place-items-center [&_svg]:w-4 [&_svg]:h-4 max-[760px]:hidden ${active ? "bg-[var(--accent,var(--color-yellow))] border-paper" : "bg-paper-2 border-ink"}`}>
                    <Ico sw={2.2} />
                  </span>
                  {n.label}
                  <span className={`ml-auto shrink-0 font-mono font-bold text-[11px] min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full border-2 ${active ? (badge ? "bg-magenta text-ink border-paper" : "bg-[var(--accent,var(--color-yellow))] border-paper") : "bg-paper-2 border-ink"}`}>{counts[n.key]}</span>
                </Link>
              );
            })}
          </aside>

          <main className="flex-1 min-w-0 p-[clamp(18px,3vw,32px)] max-w-[1080px] mx-auto w-full">
            <Outlet />
          </main>
        </div>

        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[80] flex flex-col gap-[9px] items-center pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="flex items-center gap-2.5 bg-ink text-paper border-2 border-ink rounded-full shadow-hard py-2.5 px-[18px] font-cjk font-bold text-[13px] animate-toast-in"
            >
              <span className={`w-5 h-5 rounded-full shrink-0 grid place-items-center border-2 border-ink ${t.kind === "warn" ? "bg-amber" : "bg-green"} text-ink font-black text-[11px]`}>{t.kind === "warn" ? "!" : <Icons.check sw={3} />}</span>
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </AdminProvider>
  );
}
