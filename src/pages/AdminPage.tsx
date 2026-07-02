import { useState } from "react";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { STOPS_SEED } from "../admin/adminData";
import type { AdminMember, Stop } from "../admin/adminData";
import { useAudit, useBackups, useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { tripData } from "../trip/tripData";
import { isLegacyTrip } from "../trip/legacy";
import { tripTravelers } from "../trip/roster";
import { Avatar } from "../admin/Avatar";
import { Icons } from "../admin/AdminIcons";
import type { IconName } from "../admin/AdminIcons";
import { AdminLogin } from "../admin/AdminLogin";
import { adminLogout, useAdminUser } from "../admin/auth";
import { AdminProvider } from "../admin/AdminContext";
import { useAdminToasts } from "../admin/useAdminToasts";
import { useTripAccess } from "../components/TripLayout";

type SectionKey =
  | "itinerary"
  | "suggestions"
  | "split"
  | "members"
  | "backups"
  | "audit"
  | "agent"
  | "settings";
type NavEntry = {
  key: SectionKey;
  label: string;
  icon: IconName;
  badge?: boolean;
  // Shown only to the trip's owner (settings).
  ownerOnly?: boolean;
};

// Each section lives at its own route (`…/admin/itinerary` …) so a refresh or
// shared link lands on the right tab without a `?tab=` search param.
const NAV: NavEntry[] = [
  { key: "itinerary", label: "行程停靠点", icon: "route" },
  { key: "suggestions", label: "待审建议", icon: "chat", badge: true },
  { key: "split", label: "分账金额", icon: "wallet" },
  { key: "members", label: "成员", icon: "users" },
  { key: "backups", label: "备份恢复", icon: "repo" },
  { key: "audit", label: "操作记录", icon: "repo" },
  { key: "agent", label: "Agent 协作", icon: "sparkle" },
  { key: "settings", label: "行程设置", icon: "gear", ownerOnly: true },
];

const ADMIN_SHELL = "min-h-screen text-ink font-sans leading-normal bg-paper";

export function AdminPage({ tripId }: { tripId: string }) {
  const { meta } = useTripAccess();
  const { data: user, isLoading } = useAdminUser();
  // Active tab is derived from the current path so the sidebar highlights the
  // section the router is actually showing.
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [stops, setStops] = useState<Stop[]>(STOPS_SEED);
  const { toasts, toast } = useAdminToasts();

  // Suggestions are the live trip's comments, submitted from the public timeline.
  useTripLiveSync(tripId);
  const { data: tripSnap } = useTrip(tripId);
  const member = Boolean(user) && meta.role !== null;
  const { data: auditEntries } = useAudit(tripId, member);
  const { data: backups } = useBackups(tripId, member);
  const tripOp = useTripOp(tripId);
  const trip = tripSnap?.trip ?? (isLegacyTrip(tripId) ? tripData : null);
  const suggestions = trip?.suggestions ?? [];
  const tripItems = trip?.items ?? [];
  const expenses = trip?.expenses ?? [];
  const travelers = trip ? tripTravelers(trip) : [];

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  // `null` = this section has no meaningful count, so the sidebar hides the chip.
  const counts: Record<SectionKey, number | null> = {
    itinerary: stops.length,
    suggestions: pendingCount,
    split: expenses.length,
    members: travelers.length || null,
    backups: backups?.length ?? 0,
    audit: auditEntries?.length ?? 0,
    agent: null,
    settings: null,
  };

  const nav = NAV.filter((n) => !n.ownerOnly || meta.role === "owner");

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

  // Signed in but not on this trip's roster: the worker would 403 every write,
  // so say it up front instead of rendering a console that can't do anything.
  if (meta.role === null) {
    return (
      <div className={ADMIN_SHELL}>
        <div className="min-h-screen grid place-items-center p-[clamp(16px,4vw,48px)]">
          <div className="w-full max-w-[420px] bg-white border border-[#ebe9e3] rounded-[14px] p-7 text-center">
            <div className="font-grotesk text-[11px] tracking-[0.16em] uppercase text-[#3f6f5b]">
              No Access
            </div>
            <h1 className="mt-2 font-sans font-bold text-[22px] tracking-tight">
              你不是该行程的成员
            </h1>
            <p className="mt-3 font-cjk text-[13.5px] text-[#76726a] leading-relaxed">
              向行程创建者索取邀请链接后即可进入后台。
            </p>
            <Link
              to="/t/$tripId/timeline"
              params={{ tripId }}
              className="mt-5 inline-flex items-center justify-center py-2.5 px-5 rounded-[10px] border border-[#ebe9e3] bg-white text-[#1c1b19] no-underline font-sans font-semibold text-[13px] hover:border-[#1c1b19]"
            >
              返回行程页
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const display = user.name?.trim() || user.login;
  const me: AdminMember = {
    id: "me",
    name: display,
    handle: user.login,
    role: meta.role === "owner" ? "管理员" : "成员",
    color: "var(--color-magenta)",
    traveler: true,
    initials: display.slice(0, 2).toUpperCase(),
    avatarUrl: user.avatarUrl,
  };

  const logout = async () => {
    // authClient.useSession is a shared store; signOut flips every subscriber
    // (this shell, the public nav) without any cache to clear by hand.
    await adminLogout();
    toast("已退出登录", "warn");
  };

  return (
    <AdminProvider
      value={{
        tripId,
        toast,
        stops,
        setStops,
        suggestions,
        items: tripItems,
        expenses,
        travelers,
        tripOp,
      }}
    >
      <div className={ADMIN_SHELL}>
        <header className="sticky top-0 z-40 flex items-center gap-4 px-4 sm:px-6 py-3 bg-[#fdfdfb] border-b border-[#ebe9e3]">
          <Link
            to="/t/$tripId/timeline"
            params={{ tripId }}
            className="flex items-center gap-3 min-w-0 text-inherit no-underline"
            title="返回行程页"
            aria-label="返回行程页"
          >
            <span className="shrink-0 w-9 h-9 rounded-[9px] bg-[#1c1b19] text-[#fafaf8] grid place-items-center font-grotesk font-bold text-[15px]">
              AX
            </span>
            <span className="min-w-0">
              <span className="block font-sans font-bold text-[14.5px] tracking-tight truncate">
                {meta.title} · 后台
              </span>
              <span className="block font-grotesk text-[10px] tracking-[0.12em] uppercase text-[#9b988f] mt-0.5 max-[380px]:hidden">
                Trip Admin
              </span>
            </span>
          </Link>
          <span className="hidden min-[860px]:inline-flex items-center gap-2 ml-2 font-mono text-[12px] text-[#76726a] border border-[#ebe9e3] rounded-full px-3 py-1.5 [&_svg]:w-3.5 [&_svg]:h-3.5">
            <Icons.repo sw={2} />
            t/{tripId}
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
            {nav.map((n) => {
              const active = pathname.includes(`/admin/${n.key}`);
              const badge = Boolean(n.badge) && (counts[n.key] ?? 0) > 0;
              const Ico = Icons[n.icon];
              return (
                <Link
                  key={n.key}
                  to={`/t/$tripId/admin/${n.key}`}
                  params={{ tripId }}
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
            {nav.map((n) => {
              const active = pathname.includes(`/admin/${n.key}`);
              const badge = Boolean(n.badge) && (counts[n.key] ?? 0) > 0;
              const Ico = Icons[n.icon];
              return (
                <Link
                  key={n.key}
                  to={`/t/$tripId/admin/${n.key}`}
                  params={{ tripId }}
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
