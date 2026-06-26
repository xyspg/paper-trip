import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import "../styles/admin.css";
import { STOPS_SEED } from "../admin/adminData";
import type { AdminMember, Stop } from "../admin/adminData";
import { useTrip, useTripLiveSync, useTripOp } from "../trip/hooks";
import { Avatar } from "../admin/Avatar";
import { Icons } from "../admin/AdminIcons";
import type { IconName } from "../admin/AdminIcons";
import { AdminLogin } from "../admin/AdminLogin";
import { ADMIN_SESSION_KEY, adminLogout, fetchAdminUser } from "../admin/auth";
import { ItinerarySection } from "../admin/ItinerarySection";
import { SplitSection } from "../admin/SplitSection";
import { SuggestionsSection } from "../admin/SuggestionsSection";
import { cssVars } from "../admin/style";
import { useAdminToasts } from "../admin/useAdminToasts";

type SectionKey = "itinerary" | "suggestions" | "split";
type NavEntry = { key: SectionKey; label: string; icon: IconName; accent: string; badge?: boolean };

const NAV: NavEntry[] = [
  { key: "itinerary", label: "行程停靠点", icon: "route", accent: "var(--magenta)" },
  { key: "suggestions", label: "待审建议", icon: "chat", accent: "var(--violet)", badge: true },
  { key: "split", label: "分账金额", icon: "wallet", accent: "var(--yellow)" },
];

export function AdminPage() {
  const queryClient = useQueryClient();
  const { data: user, isLoading } = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: fetchAdminUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const [section, setSection] = useState<SectionKey>("itinerary");
  const [stops, setStops] = useState<Stop[]>(STOPS_SEED);
  const { toasts, toast } = useAdminToasts();

  // Suggestions are the live trip's comments, submitted from the public timeline.
  useTripLiveSync();
  const { data: tripSnap } = useTrip();
  const tripOp = useTripOp();
  const suggestions = tripSnap?.trip.suggestions ?? [];
  const tripItems = tripSnap?.trip.items ?? [];
  const expenses = tripSnap?.trip.expenses ?? [];

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const counts: Record<SectionKey, number> = {
    itinerary: stops.length,
    suggestions: pendingCount,
    split: expenses.length,
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

  const renderSection = () => {
    if (section === "itinerary")
      return <ItinerarySection stops={stops} setStops={setStops} toast={toast} />;
    if (section === "suggestions") {
      return (
        <SuggestionsSection
          suggestions={suggestions}
          items={tripItems}
          onSetStatus={(id, status) =>
            tripOp.mutate({ type: "setSuggestionStatus", suggestionId: id, status })
          }
          onDelete={(id) => tripOp.mutate({ type: "deleteSuggestion", suggestionId: id })}
          toast={toast}
        />
      );
    }
    return (
      <SplitSection
        expenses={expenses}
        onSetAmount={(id, amount) =>
          tripOp.mutate({ type: "setExpenseAmount", expenseId: id, amount })
        }
        onSetPayer={(id, payer) =>
          tripOp.mutate({ type: "setExpensePayer", expenseId: id, payer })
        }
        onAdd={(expense) =>
          tripOp.mutate(
            { type: "addExpense", expense },
            {
              onSuccess: () => toast("已添加花销条目"),
              onError: () => toast("添加失败，请重试", "warn"),
            },
          )
        }
        onDelete={(id) =>
          tripOp.mutate(
            { type: "deleteExpense", expenseId: id },
            {
              onSuccess: () => toast("已删除条目"),
              onError: () => toast("删除失败，请重试", "warn"),
            },
          )
        }
        onReset={() =>
          tripOp.mutate(
            { type: "resetExpenses" },
            {
              onSuccess: () => toast("已恢复原始账目"),
              onError: () => toast("恢复失败，请重试", "warn"),
            },
          )
        }
      />
    );
  };

  return (
    <div className="admin-app">
      <header className="topbar">
        <div className="tb-brand">
          <span className="tb-logo" style={{ background: "var(--magenta)" }}>
            AX
          </span>
          <div className="tb-titles">
            <div className="tb-t1">后台</div>
            <div className="tb-t2">Anime Expo 2026 Admin</div>
          </div>
        </div>
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
            const active = section === n.key;
            const badge = Boolean(n.badge) && counts[n.key] > 0;
            const Ico = Icons[n.icon];
            return (
              <button
                key={n.key}
                className={`nav-item${active ? " on" : ""}${badge ? " has-badge" : ""}`}
                style={cssVars({ "--accent": n.accent })}
                onClick={() => setSection(n.key)}
              >
                <span className="ni-ico">
                  <Ico sw={2.2} />
                </span>
                {n.label}
                <span className="ni-count">{counts[n.key]}</span>
              </button>
            );
          })}
        </aside>

        <main className="main">{renderSection()}</main>
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
  );
}
