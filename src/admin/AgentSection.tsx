import { useState } from "react"
import { mintAgentToken } from "../trip/api"
import type { AgentTokenGrant } from "../trip/api"
import {
  BTN,
  BTN_ACCENT,
  BTN_GHOST,
  BTN_SM,
  CHIP_OFF,
  CHIP_ON,
  FIELD_LABEL,
  SectionHead,
} from "./adminUi"
import type { ToastFn } from "./useAdminToasts"
import { useAdmin } from "./AdminContext"

type Props = {
  toast: ToastFn
}

const TTL_OPTIONS = [7, 30, 90] as const

// Mint an agent bearer token and assemble the paste-into-agent prompt. The
// token is shown only while this section stays mounted — we intentionally never
// persist it client-side; regenerating is cheap and old tokens live until exp.
export function AgentSection({ toast }: Props) {
  const { tripId } = useAdmin()
  const [ttlDays, setTtlDays] = useState<number>(90)
  const [grant, setGrant] = useState<AgentTokenGrant | null>(null)
  const [busy, setBusy] = useState(false)

  const origin = window.location.origin
  const prompt = grant
    ? [
        `Read ${origin}/SKILL.md and follow it to manage my trip.`,
        `API base: ${origin}`,
        `Trip id: ${tripId}`,
        `Token: ${grant.token}`,
      ].join("\n")
    : ""

  const generate = async () => {
    setBusy(true)
    try {
      setGrant(await mintAgentToken(tripId, ttlDays))
      toast("已生成 agent token")
    } catch {
      toast("生成失败（仅行程创建者可签发 token）", "warn")
    } finally {
      setBusy(false)
    }
  }

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast(`已复制${what}`)
    } catch {
      toast("复制失败", "warn")
    }
  }

  return (
    <div>
      <SectionHead
        kicker="06 · Agent"
        title="Agent 协作"
        desc="让本地 agent 直接读写行程"
      />

      <section className="mt-6 bg-white border border-[#ebe9e3] rounded-[14px] p-5 grid gap-4">
        <p className="m-0 font-cjk text-[13.5px] leading-relaxed text-[#3b3833]">
          本地 agent 读取{" "}
          <a
            className="text-[#3f6f5b] font-semibold"
            href="/SKILL.md"
            target="_blank"
            rel="noreferrer"
          >
            /SKILL.md
          </a>{" "}
          后，凭下面的 token 调用 trip API
        </p>

        <div className="grid gap-1.5">
          <span className={FIELD_LABEL}>有效期</span>
          <div className="flex gap-2">
            {TTL_OPTIONS.map((d) => (
              <button
                key={d}
                className={`${BTN_SM} border ${ttlDays === d ? CHIP_ON : CHIP_OFF}`}
                onClick={() => setTtlDays(d)}
              >
                {d} 天
              </button>
            ))}
          </div>
        </div>

        <div>
          <button className={`${BTN} ${BTN_ACCENT}`} disabled={busy} onClick={generate}>
            {grant ? "重新生成 token" : "生成 token"}
          </button>
        </div>
      </section>

      {grant && (
        <section className="mt-4 bg-white border border-[#ebe9e3] rounded-[14px] p-5 grid gap-4">
          <div className="grid gap-1.5">
            <span className={FIELD_LABEL}>Send this to your agent:</span>
            <pre className="m-0 font-mono text-[12px] leading-relaxed whitespace-pre-wrap break-all bg-[#fafaf8] border border-[#ebe9e3] rounded-[10px] p-3">
              {prompt}
            </pre>
            <div>
              <button className={`${BTN_SM} ${BTN_GHOST}`} onClick={() => copy(prompt, "prompt")}>
                Copy
              </button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
