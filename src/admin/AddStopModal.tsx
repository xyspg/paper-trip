import { useState } from "react"
import { Modal, ROLE } from "baseui/modal"
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
    <form className="add-modal" onSubmit={submit}>
      <div className="am-head">
        <span className="am-kicker">
          <Icons.plus sw={2.8} />
          新增停靠点
        </span>
        <button type="button" className="am-close" title="关闭" onClick={onClose}>
          <Icons.x sw={2.6} />
        </button>
      </div>

      <div className="am-body">
        <label className="am-field">
          <span className="am-label">放在哪一天</span>
          <select className="am-select" value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {days.map((d) => (
              <option key={d.day} value={d.day}>
                Day {d.day} · {d.date}
              </option>
            ))}
          </select>
        </label>

        <label className="am-field">
          <span className="am-label">时间</span>
          <input
            className="am-input"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </label>

        <label className="am-field am-field-wide">
          <span className="am-label">标题</span>
          <input
            className="am-input"
            value={title}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="新停靠点"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="am-field am-field-wide">
          <span className="am-label">类别</span>
          <div className="am-chips">
            {CAT_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`am-chip${cat === k ? " on" : ""}`}
                style={cssVars({ "--chip": CATS[k].color })}
                onClick={() => setCat(k)}
              >
                <span className="am-dot" />
                {CATS[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="am-field am-field-wide">
          <span className="am-label">状态</span>
          <div className="am-chips">
            {STATUS_KEYS.map((k) => (
              <button
                type="button"
                key={k}
                className={`am-chip status-${STATUS[k].cls}${status === k ? " on" : ""}`}
                onClick={() => setStatus(k)}
              >
                {STATUS[k].label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="am-foot">
        <button type="button" className="pbtn dark" onClick={onClose}>
          取消
        </button>
        <span className="sf-spacer" />
        <button type="submit" className="pbtn solid">
          <Icons.plus sw={2.6} />
          创建停靠点
        </button>
      </div>
    </form>
  )
}

export function AddStopModal({ isOpen, days, initialDay, onClose, onCreate }: Props) {
  // Base Web portals the dialog to document.body by default, which would escape
  // the `.admin-app` scope our styles (and CSS tokens like --shadow-xs) live under.
  // Mounting inside `.admin-app` keeps the neo-brutalist styling intact.
  const mountNode =
    typeof document === "undefined"
      ? undefined
      : (document.querySelector(".admin-app") as HTMLElement | null) ?? undefined

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      role={ROLE.dialog}
      animate
      autoFocus
      mountNode={mountNode}
      overrides={{
        Root: { style: { zIndex: 90 } },
        Dialog: {
          style: {
            width: "min(480px, 92vw)",
            backgroundColor: "var(--paper-2)",
            border: "3px solid var(--ink)",
            borderRadius: "var(--radius)",
            boxShadow: "var(--shadow)",
            padding: "0",
            overflow: "hidden",
          },
        },
        Close: { style: { display: "none" } },
      }}
    >
      <Form
        key={`${initialDay}-${isOpen}`}
        days={days}
        initialDay={initialDay}
        onClose={onClose}
        onCreate={onCreate}
      />
    </Modal>
  )
}
