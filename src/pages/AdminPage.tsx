import { useState } from "react";
import "../styles/admin.css";
import { EXPENSES_SEED, memberById, STOPS_SEED, SUGGESTIONS_SEED } from "../admin/adminData";
import type { Expense, Stop, Suggestion } from "../admin/adminData";
import { Avatar } from "../admin/Avatar";
import { Icons } from "../admin/AdminIcons";
import type { IconName } from "../admin/AdminIcons";
import { AdminLogin } from "../admin/AdminLogin";
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
  const [authed, setAuthed] = useState(false);
  const [section, setSection] = useState<SectionKey>("itinerary");
  const [stops, setStops] = useState<Stop[]>(STOPS_SEED);
  const [suggestions, setSuggestions] = useState<Suggestion[]>(() =>
    SUGGESTIONS_SEED.map((s): Suggestion => ({ ...s, status: "pending" })),
  );
  const [expenses, setExpenses] = useState<Expense[]>(() => EXPENSES_SEED.map((e) => ({ ...e })));
  const { toasts, toast } = useAdminToasts();

  const me = memberById("you");

  const applyRewrite = (stopId: string, planId: string, toText: string) =>
    setStops((prev) =>
      prev.map((s) =>
        s.id === stopId
          ? { ...s, plans: s.plans.map((p) => (p.id === planId ? { ...p, text: toText } : p)) }
          : s,
      ),
    );

  const pendingCount = suggestions.filter((s) => s.status === "pending").length;
  const counts: Record<SectionKey, number> = {
    itinerary: stops.length,
    suggestions: pendingCount,
    split: expenses.length,
  };

  if (!authed) {
    return (
      <div className="admin-app">
        <AdminLogin onAuth={() => setAuthed(true)} />
      </div>
    );
  }

  const renderSection = () => {
    if (section === "itinerary")
      return <ItinerarySection stops={stops} setStops={setStops} toast={toast} />;
    if (section === "suggestions") {
      return (
        <SuggestionsSection
          suggestions={suggestions}
          setSuggestions={setSuggestions}
          stops={stops}
          applyRewrite={applyRewrite}
          toast={toast}
        />
      );
    }
    return <SplitSection expenses={expenses} setExpenses={setExpenses} toast={toast} />;
  };

  return (
    <div className="admin-app">
      <header className="topbar">
        <div className="tb-brand">
          <span className="tb-logo" style={{ background: "var(--magenta)" }}>
            AX
          </span>
          <div className="tb-titles">
            <div className="tb-t1">行程作战表 · 后台</div>
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
        <button
          className="tb-logout"
          title="退出登录"
          onClick={() => {
            setAuthed(false);
            toast("已退出登录", "warn");
          }}
        >
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
          <div className="sidebar-foot">
            v1.0 · 纯前端演示
            <br />
            数据不会真正保存
          </div>
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
