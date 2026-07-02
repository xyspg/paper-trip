import { Icons } from "./AdminIcons"
import { Avatar } from "./Avatar"
import { AdminEmptyState, BTN_DANGER, BTN_SM, RefreshButton, SectionHead } from "./adminUi"
import { useConfirm } from "./useConfirm"
import type { ToastFn } from "./useAdminToasts"
import { useMembers, useRemoveMember } from "../trip/hooks"
import { useTripAccess } from "../components/TripLayout"
import type { AdminMember } from "./adminData"

// The trip's roster: registered members plus seeded people who haven't signed
// in yet. Owners can remove members (never the owner). Invitations join in the
// invite flow phase.
export function MembersSection({ toast }: { toast: ToastFn }) {
  const { tripId, meta } = useTripAccess()
  const isOwner = meta.role === "owner"
  const { data, isLoading, isError, refetch, isFetching } = useMembers(tripId)
  const removeMember = useRemoveMember(tripId)
  const { confirm, confirmModal } = useConfirm()

  const remove = async (userId: string, name: string) => {
    const ok = await confirm({
      title: `移除 ${name}？`,
      message: (
        <span>
          移除后 TA 将立即失去该行程的访问与编辑权限（含已签发的 agent token）。账目里已有的分摊记录不受影响。
        </span>
      ),
      confirmLabel: "移除成员",
    })
    if (!ok) return
    try {
      await removeMember.mutateAsync(userId)
      toast("已移除成员")
    } catch {
      toast("移除失败，请重试", "warn")
    }
  }

  const avatarFor = (name: string, image: string | null, color: string | null): AdminMember => ({
    id: name,
    name,
    handle: name,
    role: "",
    color: color ?? "#3f6f5b",
    traveler: true,
    initials: name.slice(0, 2).toUpperCase(),
    avatarUrl: image ?? undefined,
  })

  return (
    <div>
      <SectionHead
        kicker="06 · Members"
        title="成员"
        desc="行程的同行人 · 分账的花名册 · 仅创建者可移除成员"
        actions={<RefreshButton onClick={() => refetch()} busy={isFetching} />}
      />

      <div className="mt-7 max-w-[640px]">
        {isLoading ? (
          <AdminEmptyState title="加载中…" body="正在读取成员列表。" icon={<Icons.users sw={2.2} />} />
        ) : isError || !data ? (
          <AdminEmptyState title="无法加载成员" body="请刷新重试。" warn />
        ) : (
          <div className="flex flex-col gap-2.5">
            {data.members.map((m) => (
              <div
                key={m.userId}
                className="flex items-center gap-3 p-3.5 bg-white border border-[#ebe9e3] rounded-[14px]"
              >
                <Avatar m={avatarFor(m.name || m.login || m.userId, m.image, m.color)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-cjk font-bold text-[14px] leading-[1.2] truncate">
                    {m.name || m.login || m.userId}
                  </div>
                  <div className="font-mono text-[11px] text-[#9b988f] truncate">
                    {m.login ? `@${m.login}` : m.userId}
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex items-center py-[3px] px-2 rounded-full border font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] ${m.role === "owner" ? "border-[#b08648] text-[#b08648]" : "border-[#ebe9e3] text-[#76726a]"}`}
                >
                  {m.role === "owner" ? "创建者" : "成员"}
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-3`}
                    onClick={() => void remove(m.userId, m.name || m.login || m.userId)}
                    disabled={removeMember.isPending}
                  >
                    <Icons.x sw={2.6} />
                    移除
                  </button>
                )}
              </div>
            ))}

            {data.pending.map((cl) => (
              <div
                key={cl.memberKey}
                className="flex items-center gap-3 p-3.5 bg-[#fdfdfb] border border-dashed border-[#ebe9e3] rounded-[14px]"
              >
                <Avatar m={avatarFor(cl.name, null, cl.color)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="font-cjk font-bold text-[14px] leading-[1.2] truncate">
                    {cl.name}
                  </div>
                  <div className="font-mono text-[11px] text-[#9b988f]">尚未登录 · 待认领</div>
                </div>
                <span className="shrink-0 inline-flex items-center py-[3px] px-2 rounded-full border border-[#ebe9e3] font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] text-[#76726a]">
                  {cl.role === "owner" ? "创建者" : "成员"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal}
    </div>
  )
}
