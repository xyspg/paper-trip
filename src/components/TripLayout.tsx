import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Trans, useLingui } from "@lingui/react/macro";
import { TripAccessError } from "../trip/api";
import type { TripMeta } from "../trip/api";
import { useTripMeta } from "../trip/hooks";
import { tripDocumentMetadata } from "../trip/metadata";
import { signInWithGitHub } from "../admin/auth";

type TripAccess = { tripId: string; meta: TripMeta };

const TripContext = createContext<TripAccess | null>(null);

// Trip pages render inside TripLayout, so the context is always present there;
// the throw guards against future misuse outside it.
export function useTripAccess(): TripAccess {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error("useTripAccess must be used inside TripLayout");
  return ctx;
}

// Resolves registry metadata (and the caller's role) for the trip in the URL,
// gating everything below it: 401 → sign-in prompt, 403 → not a member,
// 404 → no such trip. Callers key this component by tripId so a trip switch
// remounts the whole subtree (fresh websocket, fresh mount-scoped state).
export function TripLayout({ tripId, children }: { tripId: string; children: ReactNode }) {
  const { data: meta, error, isLoading } = useTripMeta(tripId);
  const { t } = useLingui();

  if (isLoading) {
    return (
      <div className="grid place-items-center py-24">
        <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  if (error || !meta) {
    const status = error instanceof TripAccessError ? error.status : 500;
    if (status === 401) {
      return (
        <AccessCard
          kicker="Private Trip"
          title={t`这是一个私密行程`}
          body={t`登录后如果你是该行程的成员，即可查看和编辑。`}
        >
          <button
            type="button"
            className="mt-5 inline-flex items-center justify-center py-2.5 px-5 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[13px] cursor-pointer hover:bg-black"
            onClick={() => signInWithGitHub(window.location.pathname)}
          >
            <Trans>用 GitHub 登录</Trans>
          </button>
        </AccessCard>
      );
    }
    if (status === 403) {
      return (
        <AccessCard
          kicker="No Access"
          title={t`你不是该行程的成员`}
          body={t`向行程创建者索取邀请链接后即可加入。`}
        >
          <BackHome />
        </AccessCard>
      );
    }
    return (
      <AccessCard kicker="Not Found" title={t`行程不存在`} body={t`它可能已被删除，或链接有误。`}>
        <BackHome />
      </AccessCard>
    );
  }

  const metadata = tripDocumentMetadata(meta);
  return (
    <TripContext.Provider value={{ tripId, meta }}>
      <title>{metadata.title}</title>
      {children}
    </TripContext.Provider>
  );
}

function AccessCard({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div className="grid place-items-center py-20">
      <div className="w-full max-w-[420px] bg-white border border-[#ebe9e3] rounded-[14px] p-7 text-center">
        <div className="font-grotesk text-[11px] tracking-[0.16em] uppercase text-[#3f6f5b]">
          {kicker}
        </div>
        <h1 className="mt-2 font-sans font-bold text-[22px] tracking-tight">{title}</h1>
        <p className="mt-3 font-cjk text-[13.5px] text-[#76726a] leading-relaxed">{body}</p>
        {children}
      </div>
    </div>
  );
}

function BackHome() {
  return (
    <Link
      to="/"
      className="mt-5 inline-flex items-center justify-center py-2.5 px-5 rounded-[10px] border border-[#ebe9e3] bg-white text-[#1c1b19] no-underline font-sans font-semibold text-[13px] hover:border-[#1c1b19]"
    >
      <Trans>返回首页</Trans>
    </Link>
  );
}
