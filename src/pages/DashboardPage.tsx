import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Plus, Globe, Lock, Crown } from "lucide-react";
import { useAdminUser } from "../admin/auth";
import { useTrips } from "../trip/hooks";
import { BaseWebProvider } from "../admin/baseweb";
import { CreateTripModal } from "../components/CreateTripModal";
import { LandingPage } from "./LandingPage";
import type { TripMeta } from "../trip/api";

const fmtRange = (t: TripMeta): string => {
  const s = t.startDate ?? "";
  const e = t.endDate ?? "";
  if (!s && !e) return "日期待定";
  const short = (iso: string) => {
    const d = new Date(`${iso}T00:00:00`);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };
  return `${s ? short(s) : "?"} – ${e ? short(e) : "?"}`;
};

// `/`: marketing landing when signed out, the trips workbench when signed in.
// This route opts out of RootLayout's shell (the landing is full-bleed), so
// the signed-in dashboard carries its own copy of the page frame.
export function DashboardPage() {
  const { data: user, isLoading } = useAdminUser();
  const { data: trips, isLoading: tripsLoading } = useTrips(Boolean(user));
  const [createOpen, setCreateOpen] = useState(false);
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="grid place-items-center min-h-svh bg-paper">
        <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
      </div>
    );
  }

  if (!user) return <LandingPage />;

  return (
    <main className="min-h-svh p-[clamp(14px,3vw,40px)] overflow-x-clip bg-paper text-ink font-sans leading-normal">
      <div className="w-[min(1040px,100%)] mx-auto">
        <header className="pb-[30px] border-b border-[#ebe9e3]">
          <span className="inline-flex gap-[9px] items-center font-grotesk text-[11px] font-semibold uppercase tracking-[0.18em] text-[#3f6f5b]">
            <span className="w-[7px] h-[7px] rounded-full bg-[#3f6f5b]" />
            行程工作台 · Trips
          </span>
          <h1 className="mt-3.5 font-sans font-extrabold tracking-[-0.03em] leading-[0.98] text-[clamp(38px,7vw,60px)]">
            我的行程
          </h1>
          <p className="mt-4 max-w-[54ch] font-cjk text-[14.5px] leading-[1.8] text-[#76726a]">
            创建行程、邀请同行人，时间线 / 预订 / 账目全套视图，每个行程一份。
          </p>
        </header>

        <section className="mt-[26px]">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-grotesk text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9b988f]">
              {trips ? `${trips.length} 个行程` : "加载中"}
            </span>
            <button
              type="button"
              className="ml-auto inline-flex items-center gap-2 py-2.5 px-4 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[13px] cursor-pointer hover:bg-black"
              onClick={() => setCreateOpen(true)}
            >
              <Plus size={15} strokeWidth={2.4} />
              新建行程
            </button>
          </div>

          {tripsLoading ? (
            <div className="grid place-items-center py-16">
              <span className="w-7 h-7 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
            </div>
          ) : !trips || trips.length === 0 ? (
            <div className="text-center py-14 px-6 border border-dashed border-[#ebe9e3] rounded-[14px] bg-white">
              <div className="font-sans font-bold text-[17px]">还没有行程</div>
              <div className="font-cjk text-[13px] text-[#76726a] mt-2">
                点右上角「新建行程」，或等朋友把邀请链接发给你。
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3.5 max-[640px]:grid-cols-1">
              {trips.map((t) => (
                <Link
                  key={t.id}
                  to="/t/$tripId/timeline"
                  params={{ tripId: t.id }}
                  className="group block p-5 bg-white border border-[#ebe9e3] rounded-[14px] no-underline text-inherit transition-colors hover:border-[#1c1b19]"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-sans font-bold text-[17px] tracking-tight truncate">
                      {t.title}
                    </span>
                    {t.role === "owner" && (
                      <span title="你创建的行程" className="shrink-0 text-[#b08648]">
                        <Crown size={14} strokeWidth={2.4} />
                      </span>
                    )}
                  </div>
                  <div className="mt-1.5 font-grotesk font-semibold text-[12px] text-[#76726a]">
                    {fmtRange(t)}
                  </div>
                  <div className="flex items-center gap-1.5 mt-3.5">
                    <span className="inline-flex items-center gap-1 py-[3px] px-2 rounded-full border border-[#ebe9e3] font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a] [&_svg]:w-3 [&_svg]:h-3">
                      {t.visibility === "public" ? (
                        <>
                          <Globe strokeWidth={2.2} /> 公开
                        </>
                      ) : (
                        <>
                          <Lock strokeWidth={2.2} /> 私密
                        </>
                      )}
                    </span>
                    <span className="inline-flex items-center py-[3px] px-2 rounded-full border border-[#ebe9e3] font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a]">
                      {t.role === "owner" ? "创建者" : "成员"}
                    </span>
                    <span className="ml-auto font-mono text-[11px] text-[#9b988f] group-hover:text-[#1c1b19]">
                      t/{t.id}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <BaseWebProvider>
          <CreateTripModal
            isOpen={createOpen}
            onClose={() => setCreateOpen(false)}
            onCreated={(trip) => {
              setCreateOpen(false);
              void navigate({ to: "/t/$tripId/admin/itinerary", params: { tripId: trip.id } });
            }}
          />
        </BaseWebProvider>
      </div>
    </main>
  );
}
