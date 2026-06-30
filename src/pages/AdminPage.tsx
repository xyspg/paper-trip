import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import "../styles/admin.css";
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
  { key: "itinerary", to: "/admin/itinerary", label: "行程停靠点", icon: "route", accent: "var(--magenta)" },
  { key: "suggestions", to: "/admin/suggestions", label: "待审建议", icon: "chat", accent: "var(--violet)", badge: true },
  { key: "split", to: "/admin/split", label: "分账金额", icon: "wallet", accent: "var(--yellow)" },
  { key: "audit", to: "/admin/audit", label: "操作记录", icon: "repo", accent: "var(--cyan)" },
];

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
      <div className="admin-app">
        <div className="login">
          <span className="login-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-app">
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
    color: "var(--magenta)",
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
      <div className="admin-app">
        <header className="topbar">
          <Link to="/" className="tb-brand" title="返回主页" aria-label="返回主页">
            <span className="tb-logo" style={{ background: "var(--magenta)" }}>
              AX
            </span>
            <div className="tb-titles">
              <div className="tb-t1">后台</div>
              <div className="tb-t2">Anime Expo 2026 Admin</div>
            </div>
          </Link>
          <span className="tb-repo">
            <Icons.repo sw={2} />
            aki-zero/anime-expo-2026
          </span>
          <span className="tb-spacer" />
          <div className="tb-user">
            <div className="meta">
              <div className="nm">
                {me.name} · {me.role}
              </div>
              <div className="hd">@{me.handle}</div>
            </div>
            <Avatar m={me} size="sm" />
          </div>
          <button className="tb-logout" title="退出登录" onClick={logout}>
            <Icons.logout sw={2.2} />
          </button>
        </header>

        <div className="shell">
          <aside className="sidebar">
            <div className="nav-label">管理区</div>
            {NAV.map((n) => {
              const active = pathname.startsWith(n.to);
              const badge = Boolean(n.badge) && counts[n.key] > 0;
              const Ico = Icons[n.icon];
              return (
                <Link
                  key={n.key}
                  to={n.to}
                  className={`nav-item${active ? " on" : ""}${badge ? " has-badge" : ""}`}
                  style={cssVars({ "--accent": n.accent })}
                >
                  <span className="ni-ico">
                    <Ico sw={2.2} />
                  </span>
                  {n.label}
                  <span className="ni-count">{counts[n.key]}</span>
                </Link>
              );
            })}
          </aside>

          <main className="main">
            <Outlet />
          </main>
        </div>

        <div className="toast-wrap">
          {toasts.map((t) => (
            <div key={t.id} className={`toast${t.kind === "warn" ? " warn" : ""}`}>
              <span className="tk">{t.kind === "warn" ? "!" : <Icons.check sw={3} />}</span>
              {t.msg}
            </div>
          ))}
        </div>
      </div>
    </AdminProvider>
  );
}
