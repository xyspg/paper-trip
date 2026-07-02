import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { STOPS_SEED } from "../admin/adminData";
import type { AdminMember, Stop } from "../admin/adminData";
import { useAudit, useBackups, useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { Avatar } from "../admin/Avatar";
import { Icons } from "../admin/AdminIcons";
import type { IconName } from "../admin/AdminIcons";
import { AdminLogin } from "../admin/AdminLogin";
import { ADMIN_SESSION_KEY, adminLogout, useAdminUser } from "../admin/auth";
import { AdminProvider } from "../admin/AdminContext";
import { useAdminToasts } from "../admin/useAdminToasts";

type SectionKey = "itinerary" | "suggestions" | "split" | "backups" | "audit" | "agent";
type NavEntry = {
  key: SectionKey;
  to: string;
  label: string;
  icon: IconName;
  badge?: boolean;
};

// Each section lives at its own route (`/admin/itinerary` …) so a refresh or
// shared link lands on the right tab without a `?tab=` search param.
const NAV: NavEntry[] = [
  { key: "itinerary", to: "/admin/itinerary", label: "行程停靠点", icon: "route" },
  { key: "suggestions", to: "/admin/suggestions", label: "待审建议", icon: "chat", badge: true },
  { key: "split", to: "/admin/split", label: "分账金额", icon: "wallet" },
  { key: "backups", to: "/admin/backups", label: "备份恢复", icon: "repo" },
  { key: "audit", to: "/admin/audit", label: "操作记录", icon: "repo" },
  { key: "agent", to: "/admin/agent", label: "Agent 协作", icon: "sparkle" },
];

const ADMIN_SHELL = "min-h-screen text-ink font-sans leading-normal bg-paper";

export function AdminPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useAdminUser();
  // Active tab is derived from the current path so the sidebar highlights the
  // section the router is actually showing.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [stops, setStops] = useState<Stop[]>(STOPS_SEED);
  const { toasts, toast } = useAdminToasts();

  // Suggestions are the live trip's comments, submitted from the public timeline.
  useTripLiveSync();
  const { data: tripSnap } = useTrip();
  const { data: auditEntries } = useAudit(Boolean(user));
  const { data: backups } = useBackups(Boolean(user));
  const tripOp = useTripOp();
  const suggestions = tripSnap?.trip.suggestions ?? [];
  const tripItems = tripSnap?.trip.items ?? [];
  const expenses = tripSnap?.trip.expenses ?? [];

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  // `null` = this section has no meaningful count, so the sidebar hides the chip.
  const counts: Record<SectionKey, number | null> = {
    itinerary: stops.length,
    suggestions: pendingCount,
    split: expenses.length,
    backups: backups?.length ?? 0,
    audit: auditEntries?.length ?? 0,
    agent: null,
  };

  if (isLoading) {
    return (
      <div className={ADMIN_SHELL}>
        <div className="min-h-screen grid place-items-center p-[clamp(16px,4vw,48px)]">
          <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
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
        <header className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 py-3 bg-[#fdfdfb] border-b border-[#ebe9e3]">
          <Link
            to="/"
            className="flex items-center gap-3 min-w-0 text-inherit no-underline"
            title="返回主页"
            aria-label="返回主页"
          >
            <span className="shrink-0 w-9 h-9 rounded-[9px] bg-[#1c1b19] text-[#fafaf8] grid place-items-center font-grotesk font-bold text-[15px]">
              AX
            </span>
            <span className="min-w-0">
              <span className="block font-sans font-bold text-[14.5px] tracking-tight truncate">
                行程作战表 · 后台
              </span>
              <span className="block font-grotesk text-[10px] tracking-[0.12em] uppercase text-[#9b988f] mt-0.5 max-[380px]:hidden">
                Anime Expo 2026 Admin
              </span>
            </span>
          </Link>
          <span className="hidden min-[860px]:inline-flex items-center gap-2 ml-2 font-mono text-[12px] text-[#76726a] border border-[#ebe9e3] rounded-full px-3 py-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Icons.repo sw={2} />
            xyspg/anime-expo-2026
          </span>
          <span className="ml-auto" />
          <div className="flex items-center gap-2.5">
            <div className="text-right leading-tight max-[420px]:hidden">
              <div className="font-cjk font-bold text-[12.5px] whitespace-nowrap">
                {me.name} · {me.role}
              </div>
              <div className="font-mono text-[10.5px] text-[#9b988f]">@{me.handle}</div>
            </div>
            <Avatar m={me} size="sm" />
          </div>
          <button
            className="shrink-0 w-[34px] h-[34px] grid place-items-center rounded-full border border-[#ebe9e3] bg-transparent text-[#76726a] cursor-pointer transition-colors hover:bg-[#c2553f] hover:text-white hover:border-[#c2553f] [&_svg]:w-4 [&_svg]:h-4"
            title="退出登录"
            onClick={logout}
          >
            <Icons.logout sw={2.2} />
          </button>
        </header>

        <div className="flex items-start">
          <aside className="shrink-0 w-[228px] sticky top-[57px] self-start h-[calc(100vh_-_57px)] px-4 py-5 border-r border-[#ebe9e3] flex flex-col gap-1 max-[760px]:hidden">
            <div className="font-grotesk text-[10px] tracking-[0.16em] uppercase text-[#9b988f] px-2.5 pb-1">
              管理区
            </div>
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              const badge = Boolean(n.badge) && (counts[n.key] ?? 0) > 0;
              const Ico = Icons[n.icon];
              return (
                <Link
                  key={n.key}
                  to={n.to}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-[10px] font-cjk font-semibold text-[14px] no-underline transition-colors ${active ? "bg-[#1c1b19] text-[#fafaf8]" : "text-[#3b3833] hover:bg-[#fafaf8]"}`}
                >
                  <span
                    className={`shrink-0 w-[30px] h-[30px] rounded-[8px] grid place-items-center [&_svg]:w-4 [&_svg]:h-4 ${active ? "bg-white/10 border border-white/[0.16]" : "bg-white border border-[#ebe9e3]"}`}
                  >
                    <Ico sw={2.2} />
                  </span>
                  {n.label}
                  {counts[n.key] !== null && (
                    <span
                      className={`ml-auto font-mono text-[11px] min-w-[22px] h-[22px] px-1.5 grid place-items-center rounded-full ${badge ? "bg-[#c2553f] text-white" : active ? "bg-white/[0.12] text-[#fafaf8]" : "bg-[#fafaf8] text-[#76726a] border border-[#ebe9e3]"}`}
                    >
                      {counts[n.key]}
                    </span>
                  )}
                </Link>
              );
            })}
          </aside>

          <div className="hidden max-[760px]:flex fixed bottom-0 left-0 right-0 z-40 bg-[#fdfdfb] border-t border-[#ebe9e3] px-3 py-2 gap-2">
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              const badge = Boolean(n.badge) && (counts[n.key] ?? 0) > 0;
              const Ico = Icons[n.icon];
              return (
                <Link
                  key={n.key}
                  to={n.to}
                  className={`flex-1 flex flex-col items-center gap-1 py-1.5 rounded-[10px] font-cjk font-semibold text-[11px] no-underline ${active ? "bg-[#1c1b19] text-[#fafaf8]" : "text-[#76726a]"}`}
                >
                  <span className="relative [&_svg]:w-[18px] [&_svg]:h-[18px]">
                    <Ico sw={2.2} />
                    {badge && (
                      <span className="absolute -top-1.5 -right-2 font-mono text-[9px] bg-[#c2553f] text-white rounded-full min-w-[15px] h-[15px] px-1 grid place-items-center">
                        {counts[n.key]}
                      </span>
                    )}
                  </span>
                  {n.label}
                </Link>
              );
            })}
          </div>

          <main className="flex-1 min-w-0 w-full max-w-[1040px] mx-auto px-5 sm:px-8 py-6 sm:py-8 max-[760px]:pb-24">
            <Outlet />
          </main>
        </div>

        <div className="fixed left-1/2 bottom-6 -translate-x-1/2 z-[80] flex flex-col gap-2 items-center pointer-events-none max-[760px]:bottom-20">
          {toasts.map((t) => (
            <div
              key={t.id}
              style={{ boxShadow: "0 18px 40px -18px rgba(20,20,30,0.7)" }}
              className="flex items-center gap-2.5 bg-[#1c1b19] text-[#fafaf8] rounded-full px-5 py-2.5 font-cjk font-semibold text-[13px] animate-toast-in"
            >
              <span
                className={`w-5 h-5 rounded-full grid place-items-center shrink-0 text-white font-bold text-[11px] [&_svg]:w-3 [&_svg]:h-3 ${t.kind === "warn" ? "bg-[#b08648]" : "bg-[#3f6f5b]"}`}
              >
                {t.kind === "warn" ? "!" : <Icons.check sw={3} />}
              </span>
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </AdminProvider>
  );
}
