import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useQuery } from "@tanstack/react-query"
import { acceptInvite, fetchInvitePreview } from "../trip/api"
import { signInWithGitHub, useAdminUser } from "../admin/auth"

// Landing page for an invite link. The token in the URL is the credential:
// whoever opens it and signs in with any GitHub account may join (email is
// delivery only). States: loading → invalid/expired/used, or valid →
// sign-in-first / join button → navigate into the trip.
export function InviteAcceptPage({ token }: { token: string }) {
  const { data: user, isLoading: sessionLoading } = useAdminUser()
  const { data: preview, isLoading } = useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => fetchInvitePreview(token),
    retry: false,
    staleTime: Infinity,
  })
  const navigate = useNavigate()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState("")

  const join = async () => {
    setJoining(true)
    setError("")
    try {
      const { tripId } = await acceptInvite(token)
      void navigate({ to: "/t/$tripId/timeline", params: { tripId }, replace: true })
    } catch (err) {
      const code = err instanceof Error ? err.message : ""
      setError(
        code === "used"
          ? "这个邀请已被其他人使用。"
          : code === "expired"
            ? "这个邀请已过期，请向创建者要一个新链接。"
            : "加入失败，请重试。",
      )
      setJoining(false)
    }
  }

  if (isLoading || sessionLoading) {
    return (
      <div className="grid place-items-center py-24">
        <span className="w-8 h-8 rounded-full border-4 border-[#ebe9e3] border-t-[#3f6f5b] animate-[spin_0.7s_linear_infinite]" />
      </div>
    )
  }

  const status = preview?.status ?? "invalid"
  const dead =
    status === "invalid"
      ? { title: "邀请无效", body: "链接可能有误，或邀请已被撤销。" }
      : status === "expired"
        ? { title: "邀请已过期", body: "邀请链接 7 天内有效，请向创建者要一个新链接。" }
        : status === "used"
          ? { title: "邀请已被使用", body: "每个邀请链接只能加入一个人。如果这是你本人，直接打开行程即可。" }
          : null

  return (
    <div className="grid place-items-center py-20">
      <div className="w-full max-w-[440px] bg-white border border-[#ebe9e3] rounded-[14px] p-7 text-center">
        <div className="font-grotesk text-[11px] tracking-[0.16em] uppercase text-[#3f6f5b]">
          Trip Invite
        </div>

        {dead ? (
          <>
            <h1 className="mt-2 font-sans font-bold text-[22px] tracking-tight">{dead.title}</h1>
            <p className="mt-3 font-cjk text-[13.5px] text-[#76726a] leading-relaxed">{dead.body}</p>
          </>
        ) : (
          <>
            <h1 className="mt-2 font-sans font-bold text-[22px] tracking-tight">
              加入「{preview?.tripTitle}」
            </h1>
            <p className="mt-3 font-cjk text-[13.5px] text-[#76726a] leading-relaxed">
              {preview?.inviterName} 邀请你一起规划这次行程：共享时间线、预订信息和分账账目。
            </p>
            {user ? (
              <>
                <button
                  type="button"
                  className="mt-6 w-full inline-flex items-center justify-center py-3 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[13.5px] cursor-pointer hover:bg-black disabled:opacity-60"
                  onClick={() => void join()}
                  disabled={joining}
                >
                  {joining ? "加入中…" : `以 @${user.login} 的身份加入`}
                </button>
                {error && (
                  <p className="mt-3 font-cjk font-semibold text-[12.5px] text-[#c2553f]">{error}</p>
                )}
              </>
            ) : (
              <button
                type="button"
                className="mt-6 w-full inline-flex items-center justify-center py-3 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] font-sans font-semibold text-[13.5px] cursor-pointer hover:bg-black"
                onClick={() => signInWithGitHub(window.location.pathname)}
              >
                用 GitHub 登录后加入
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
