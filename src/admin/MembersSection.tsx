import { useState } from "react";
import { Trans, useLingui } from "@lingui/react/macro";
import { Icons } from "./AdminIcons";
import { Avatar } from "./Avatar";
import {
  AdminEmptyState,
  BTN,
  BTN_DANGER,
  BTN_GHOST,
  BTN_INK,
  BTN_SM,
  FIELD_INPUT,
  FIELD_LABEL,
  RefreshButton,
  SectionHead,
} from "./adminUi";
import { useConfirm } from "./useConfirm";
import type { ToastFn } from "./useAdminToasts";
import {
  useCreateInvite,
  useInvites,
  useMembers,
  useRemoveMember,
  useRevokeInvite,
} from "../trip/hooks";
import { useTripAccess } from "../components/TripLayout";
import type { AdminMember } from "./adminData";
import type { CreatedInvite } from "../trip/api";
import { isEnterKey } from "../ime";
import { intlLocale } from "../locale";

// The trip's roster and, for owners, the email invite flow. The emailed link is
// a bearer credential: any GitHub account that opens it may join.
export function MembersSection({ toast }: { toast: ToastFn }) {
  const { tripId, meta } = useTripAccess();
  const isOwner = meta.role === "owner";
  const { data, isLoading, isError, refetch, isFetching } = useMembers(tripId);
  const removeMember = useRemoveMember(tripId);
  const { confirm, confirmModal } = useConfirm();
  const { data: invites } = useInvites(tripId, isOwner);
  const createInvite = useCreateInvite(tripId);
  const revokeInvite = useRevokeInvite(tripId);
  const [email, setEmail] = useState("");
  // The accept link exists only in the create response (the server stores a
  // hash), so surface it once right after sending.
  const [lastInvite, setLastInvite] = useState<CreatedInvite | null>(null);
  const { t } = useLingui();

  const sendInvite = async () => {
    const to = email.trim();
    if (!to || !to.includes("@")) {
      toast(t`请输入有效的邮箱地址`, "warn");
      return;
    }
    try {
      const created = await createInvite.mutateAsync(to);
      setLastInvite(created);
      setEmail("");
      if (created.emailSent) toast(t`邀请邮件已发送`);
      else toast(t`已生成邀请链接（邮件未发出，可手动复制）`, "warn");
    } catch {
      toast(t`发送邀请失败，请重试`, "warn");
    }
  };

  const copyAcceptUrl = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast(t`已复制邀请链接`);
    } catch {
      toast(t`复制失败，请手动选择复制`, "warn");
    }
  };

  const remove = async (userId: string, name: string) => {
    const ok = await confirm({
      title: t`移除 ${name}？`,
      message: (
        <span>
          <Trans>
            移除后 TA 将立即失去该行程的访问与编辑权限（含已签发的 agent
            token）。账目里已有的分摊记录不受影响。
          </Trans>
        </span>
      ),
      confirmLabel: t`移除成员`,
    });
    if (!ok) return;
    try {
      await removeMember.mutateAsync(userId);
      toast(t`已移除成员`);
    } catch {
      toast(t`移除失败，请重试`, "warn");
    }
  };

  const avatarFor = (name: string, image: string | null, color: string | null): AdminMember => ({
    id: name,
    name,
    handle: name,
    role: "",
    color: color ?? "#3f6f5b",
    traveler: true,
    initials: name.slice(0, 2).toUpperCase(),
    avatarUrl: image ?? undefined,
  });

  // Hoisted so the invite notes get readable placeholders.
  const inviteEmail = lastInvite?.invite.email ?? "";
  const emailError = lastInvite?.emailError ?? t`未配置`;

  return (
    <div>
      <SectionHead
        kicker="06 · Members"
        title={t({ message: "成员", context: "admin-section" })}
        desc={t`行程的同行人 · 分账的花名册 · 仅创建者可邀请或移除成员`}
        actions={<RefreshButton onClick={() => refetch()} busy={isFetching} />}
      />

      {isOwner && (
        <div className="mt-7 max-w-[640px] p-4 bg-white border border-[#ebe9e3] rounded-[14px]">
          <div className={FIELD_LABEL}>
            <Trans>邮件邀请</Trans>
          </div>
          <p className="mt-2 font-cjk text-[12.5px] text-[#76726a] leading-relaxed">
            <Trans>
              输入对方邮箱发送邀请链接（7 天有效）。链接即凭证：任何用它登录的 GitHub 账号都会加入。
            </Trans>
          </p>
          <div className="flex gap-2 mt-3 max-[480px]:flex-col">
            <input
              className={FIELD_INPUT}
              type="email"
              value={email}
              autoComplete="off"
              placeholder="friend@example.com"
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => {
                if (isEnterKey(e)) void sendInvite();
              }}
            />
            <button
              className={`${BTN} ${BTN_INK} shrink-0 [&_svg]:size-3.5`}
              onClick={() => void sendInvite()}
              disabled={createInvite.isPending}
            >
              <Icons.plus sw={2.6} />
              {createInvite.isPending ? <Trans>发送中…</Trans> : <Trans>发送邀请</Trans>}
            </button>
          </div>

          {lastInvite && (
            <div className="mt-3 p-3 bg-[#fdfdfb] border border-dashed border-[#ebe9e3] rounded-[10px]">
              <div className="font-cjk text-[12px] text-[#76726a]">
                {lastInvite.emailSent
                  ? t`邀请已发往 ${inviteEmail}，也可以直接把链接发给对方：`
                  : t`邮件未发出（${emailError}），请手动把链接发给 ${inviteEmail}：`}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <code className="flex-1 min-w-0 font-mono text-[11px] text-[#3b3833] truncate">
                  {lastInvite.acceptUrl}
                </code>
                <button
                  className={`${BTN_SM} ${BTN_GHOST} shrink-0`}
                  onClick={() => void copyAcceptUrl(lastInvite.acceptUrl)}
                >
                  <Trans>复制链接</Trans>
                </button>
              </div>
            </div>
          )}

          {invites && invites.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              <div className={FIELD_LABEL}>
                <Trans>待接受的邀请</Trans>
              </div>
              {invites.map((inv) => {
                const expiresOn = new Date(inv.expiresAt).toLocaleDateString(intlLocale());
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-3 py-2 px-3 bg-[#fdfdfb] border border-[#ebe9e3] rounded-[10px]"
                  >
                    <span className="min-w-0 flex-1 font-mono text-[12px] text-[#3b3833] truncate">
                      {inv.email}
                    </span>
                    <span
                      className={`shrink-0 font-grotesk font-semibold text-[10px] uppercase tracking-[0.08em] ${inv.expired ? "text-[#c2553f]" : "text-[#9b988f]"}`}
                    >
                      {inv.expired ? <Trans>已过期</Trans> : <Trans>{expiresOn} 到期</Trans>}
                    </span>
                    <button
                      className={`${BTN_SM} ${BTN_DANGER}`}
                      onClick={async () => {
                        try {
                          await revokeInvite.mutateAsync(inv.id);
                          toast(t`已撤销邀请`);
                        } catch {
                          toast(t`撤销失败，请重试`, "warn");
                        }
                      }}
                      disabled={revokeInvite.isPending}
                    >
                      <Trans>撤销</Trans>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-7 max-w-[640px]">
        {isLoading ? (
          <AdminEmptyState
            title={t`加载中…`}
            body={t`正在读取成员列表。`}
            icon={<Icons.users sw={2.2} />}
          />
        ) : isError || !data ? (
          <AdminEmptyState title={t`无法加载成员`} body={t`请刷新重试。`} warn />
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
                  {m.role === "owner" ? <Trans>创建者</Trans> : <Trans>成员</Trans>}
                </span>
                {isOwner && m.role !== "owner" && (
                  <button
                    className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-3`}
                    onClick={() => void remove(m.userId, m.name || m.login || m.userId)}
                    disabled={removeMember.isPending}
                  >
                    <Icons.x sw={2.6} />
                    <Trans>移除</Trans>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmModal}
    </div>
  );
}
