import { useState } from "react"
import { AdminModal } from "./AdminModal"
import { CATS, STATUS } from "./adminData"
import type { StopCat, StopStatus } from "./adminData"
import { Icons } from "./AdminIcons"
import { cssVars } from "./style"

export type NewStopInput = {
  day: number
  date: string
  time: string
  title: string
  cat: StopCat
  status: StopStatus
}

type DayOpt = { day: number; date: string }

type Props = {
  isOpen: boolean
  days: DayOpt[]
  initialDay: number
  onClose: () => void
  onCreate: (input: NewStopInput) => void
}

const CAT_KEYS = Object.keys(CATS) as StopCat[]
const STATUS_KEYS = Object.keys(STATUS) as StopStatus[]

// Selected-status chip background, keyed by the status' CSS class (booked/planned/watch),
// reproducing the old `.am-chip.status-<cls>.on` rules inline.
const STATUS_ON_BG: Record<string, string> = {
  booked: "bg-green",
  planned: "bg-cyan",
  watch: "bg-amber",
}

// Reset the form whenever the modal (re)opens for a different day by keying the
// parent on `initialDay`; this inner component always starts from fresh defaults.
function Form({ days, initialDay, onClose, onCreate }: Omit<Props, "isOpen">) {
  const fallbackDay = days[0]?.day ?? 1
  const [day, setDay] = useState(days.some((d) => d.day === initialDay) ? initialDay : fallbackDay)
  const [time, setTime] = useState("09:00")
  const [title, setTitle] = useState("")
  const [cat, setCat] = useState<StopCat>("event")
  const [status, setStatus] = useState<StopStatus>("planned")

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const date = days.find((d) => d.day === day)?.date ?? ""
    onCreate({ day, date, time: time.trim() || "00:00", title: title.trim(), cat, status })
  }

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <div className="flex items-center gap-3 px-4.5 py-[15px] bg-ink text-paper border-b-[3px] border-ink">
        <span className="inline-flex items-center gap-[9px] font-display font-black text-[16px] tracking-[0.02em] uppercase">
          <Icons.plus sw={2.8} className="size-4.5" />
          新增停靠点
        </span>
        <button
          type="button"
          className="ml-auto shrink-0 size-8 grid place-items-center rounded-full border-2 border-paper/30 bg-transparent text-paper cursor-pointer hover:bg-magenta hover:text-ink hover:border-paper"
          title="关闭"
          onClick={onClose}
        >
          <Icons.x sw={2.6} className="size-[15px]" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-[14px] gap-y-[15px] p-4.5 max-[440px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">放在哪一天</span>
          <select
            className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full cursor-pointer appearance-none [-webkit-appearance:none] focus:shadow-[4px_4px_0_var(--color-ink)]"
            value={day}
            onChange={(e) => setDay(Number(e.target.value))}
          >
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                Day {d.day} · {d.date}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">时间</span>
          <input
            className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">标题</span>
          <input
            className="font-cjk font-bold text-[14px] text-ink bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 outline-none shadow-[3px_3px_0_var(--color-ink)] w-full focus:shadow-[4px_4px_0_var(--color-ink)] placeholder:text-ink-soft placeholder:opacity-60"
            value={title}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="新停靠点"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">类别</span>
          <div className="flex flex-wrap gap-[7px]">
            {CAT_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.04em] px-3 py-[7px] rounded-full border-2 border-ink text-ink cursor-pointer ${cat === k ? "bg-[var(--chip,var(--color-ink))] shadow-[3px_3px_0_var(--color-ink)]" : "bg-paper-2"}`}
                style={cssVars({ "--chip": CATS[k].color })}
                onClick={() => setCat(k)}
              >
                <span
                  className={`size-2.5 rounded-[3px] border-[1.5px] border-ink ${cat === k ? "bg-ink" : "bg-[var(--chip,var(--color-cyan))]"}`}
                />
                {CATS[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">状态</span>
          <div className="flex flex-wrap gap-[7px]">
            {STATUS_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.04em] px-3 py-[7px] rounded-full border-2 border-ink text-ink cursor-pointer ${status === k ? `${STATUS_ON_BG[STATUS[k].cls]} shadow-[3px_3px_0_var(--color-ink)]` : "bg-paper-2"}`}
                onClick={() => setStatus(k)}
              >
                {STATUS[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-4.5 py-3.5 border-t-[3px] border-ink bg-paper">
        <button
          type="button"
          className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)]"
          onClick={onClose}
        >
          取消
        </button>
        <span />
        <button
          type="submit"
          className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] px-[15px] py-[9px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] bg-[var(--accent,var(--color-yellow))] text-ink shadow-[3px_3px_0_var(--color-ink)] hover:[transform:translate(-1px,-1px)] hover:shadow-[4px_4px_0_var(--color-ink)] active:[transform:translate(3px,3px)] active:shadow-none"
        >
          <Icons.plus sw={2.6} className="size-3.5" />
          创建停靠点
        </button>
      </div>
    </form>
  )
}

export function AddStopModal({ isOpen, days, initialDay, onClose, onCreate }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose}>
      <Form
        key={`${initialDay}-${isOpen}`}
        days={days}
        initialDay={initialDay}
        onClose={onClose}
        onCreate={onCreate}
      />
    </AdminModal>
  )
}
