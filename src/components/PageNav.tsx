import { Link, useParams } from "@tanstack/react-router";
import { useLingui } from "@lingui/react/macro";
import { UserRound } from "lucide-react";
import { tripTabs } from "../routes";
import { signInWithGitHub, useAdminUser } from "../admin/auth";
import { switchLocale } from "../i18n";
import { currentLocale } from "../locale";

export function PageNav() {
  // Rendered above every non-admin page; the trip tabs only make sense when a
  // trip is in the URL (dashboard/invite pages just get the session button).
  const { tripId } = useParams({ strict: false });
  const { t } = useLingui();

  return (
    <nav className="flex flex-wrap items-center gap-2 mb-[26px]" aria-label={t`页面导航`}>
      {tripId &&
        tripTabs.map((tab) => (
          <Link
            key={tab.id}
            to={tab.to}
            params={{ tripId }}
            className="py-2 px-[15px] whitespace-nowrap no-underline tracking-[0.04em] border rounded-full transition-colors font-grotesk text-[12px] font-semibold"
            activeOptions={{ exact: true }}
            activeProps={{ className: "text-[#fafaf8] bg-[#1c1b19] border-[#1c1b19]" }}
            inactiveProps={{
              className: "text-[#3b3833] bg-white border-[#ebe9e3] hover:border-[#1c1b19]",
            }}
          >
            {t(tab.label)}
          </Link>
        ))}
      <LocaleToggle />
      <SessionButton tripId={tripId} />
    </nav>
  );
}

// GitHub avatar when signed in (opens the trip's admin console in a new tab —
// the admin shell is separate chrome, so it never goes through the SPA
// router), login prompt when not. Hidden while the probe is in flight to avoid
// a wrong-state flash.
function SessionButton({ tripId }: { tripId?: string }) {
  const { data: user, isLoading } = useAdminUser();
  const { t } = useLingui();
  if (isLoading) return null;

  const base =
    "grid place-items-center w-9 h-9 p-0 overflow-hidden rounded-full border bg-white cursor-pointer transition-colors";
  return user ? (
    <button
      type="button"
      className={`${base} border-[#ebe9e3] hover:border-[#1c1b19]`}
      title={`${user.login} · ${t`打开管理后台`}`}
      aria-label={t`打开管理后台`}
      onClick={() => window.open(tripId ? `/t/${tripId}/admin` : "/", "_blank")}
    >
      <img className="h-full w-full object-cover" src={user.avatarUrl} alt="" draggable={false} />
    </button>
  ) : (
    <button
      type="button"
      className={`${base} border-[#ebe9e3] text-[#76726a] hover:border-[#1c1b19] hover:text-[#1c1b19]`}
      title={t`使用 GitHub 登录`}
      aria-label={t`使用 GitHub 登录`}
      onClick={() => signInWithGitHub(window.location.pathname)}
    >
      <UserRound size={17} strokeWidth={2.2} />
    </button>
  );
}

// Labels the language it switches to, written in that language, so it stays
// recognizable to someone who cannot read the current one.
function LocaleToggle() {
  const next = currentLocale() === "zh" ? "en" : "zh";
  return (
    <button
      type="button"
      className="grid place-items-center w-9 h-9 ml-auto p-0 rounded-full border border-[#ebe9e3] bg-white text-[#3b3833] cursor-pointer transition-colors hover:border-[#1c1b19] font-grotesk text-[12px] font-semibold"
      lang={next === "en" ? "en" : "zh-CN"}
      title={next === "en" ? "Switch to English" : "切换到中文"}
      aria-label={next === "en" ? "Switch to English" : "切换到中文"}
      onClick={() => switchLocale(next)}
    >
      {next === "en" ? "EN" : "中"}
    </button>
  );
}
