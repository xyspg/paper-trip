import { useState } from "react"
import { AdminModal } from "./AdminModal"
import { CATS, STATUS } from "./adminData"
import type { StopCat, StopStatus } from "./adminData"
import { Icons } from "./AdminIcons"
import { BTN, BTN_GHOST, BTN_INK, FIELD_INPUT, FIELD_LABEL } from "./adminUi"

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

// Selected-status chip fill, keyed by the status' CSS class (booked/planned/watch).
// Literal editorial hues (accent / slate / ochre) so the pill fills in its own color.
const STATUS_ON_HEX: Record<string, string> = {
  booked: "#3f6f5b",
  planned: "#5b7a99",
  watch: "#b08648",
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
      <div className="flex items-center gap-3 px-[18px] py-4 border-b border-[#ebe9e3]">
        <span className="shrink-0 w-9 h-9 rounded-[10px] bg-[#1c1b19] text-[#fafaf8] grid place-items-center [&_svg]:size-[17px]">
          <Icons.plus sw={2.6} />
        </span>
        <span className="font-sans font-bold text-[16px] tracking-tight">新增停靠点</span>
        <button
          type="button"
          className="ml-auto shrink-0 w-8 h-8 grid place-items-center rounded-full border border-[#ebe9e3] bg-white text-[#76726a] cursor-pointer [&_svg]:size-[15px] hover:border-[#1c1b19] hover:text-[#1c1b19] transition-colors"
          title="关闭"
          onClick={onClose}
        >
          <Icons.x sw={2.6} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-[14px] gap-y-[15px] p-[18px] max-[440px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>放在哪一天</span>
          <select
            className={`${FIELD_INPUT} cursor-pointer appearance-none [-webkit-appearance:none]`}
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
          <span className={FIELD_LABEL}>时间</span>
          <input
            className={FIELD_INPUT}
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>标题</span>
          <input
            className={FIELD_INPUT}
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
          <span className={FIELD_LABEL}>类别</span>
          <div className="flex flex-wrap gap-[7px]">
            {CAT_KEYS.map((k) => {
              const on = cat === k
              return (
                <button
                  type="button"
                  key={k}
                  className={`inline-flex items-center gap-2 font-grotesk font-semibold text-[11px] tracking-[0.03em] px-3 py-[7px] rounded-full border transition-colors ${on ? "text-white" : "bg-white text-[#3b3833] border-[#ebe9e3] hover:border-[#1c1b19]"}`}
                  style={on ? { background: CATS[k].color, borderColor: CATS[k].color } : undefined}
                  onClick={() => setCat(k)}
                >
                  <span
                    className="size-2 rounded-full"
                    style={{ background: on ? "rgba(255,255,255,0.85)" : CATS[k].color }}
                  />
                  {CATS[k].label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>状态</span>
          <div className="flex flex-wrap gap-[7px]">
            {STATUS_KEYS.map((k) => {
              const on = status === k
              return (
                <button
                  type="button"
                  key={k}
                  className={`inline-flex items-center gap-[7px] font-grotesk font-semibold text-[11px] tracking-[0.03em] px-3 py-[7px] rounded-full border transition-colors ${on ? "text-white" : "bg-white text-[#3b3833] border-[#ebe9e3] hover:border-[#1c1b19]"}`}
                  style={on ? { background: STATUS_ON_HEX[STATUS[k].cls], borderColor: STATUS_ON_HEX[STATUS[k].cls] } : undefined}
                  onClick={() => setStatus(k)}
                >
                  {STATUS[k].label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2.5 px-[18px] py-3.5 border-t border-[#ebe9e3] bg-[#fdfdfb]">
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button type="submit" className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}>
          <Icons.plus sw={2.6} />
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
