import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { Icons } from "./AdminIcons"
import {
  BTN,
  BTN_DANGER,
  BTN_INK,
  CHIP_OFF,
  CHIP_ON,
  FIELD_INPUT,
  FIELD_LABEL,
  SectionHead,
} from "./adminUi"
import { useConfirm } from "./useConfirm"
import type { ToastFn } from "./useAdminToasts"
import { useDeleteTrip, usePatchTrip } from "../trip/hooks"
import { useTripAccess } from "../components/TripLayout"
import type { TripVisibility } from "../trip/api"

// The browser's full IANA zone list, computed once at module load.
const timezoneOptions: string[] = Intl.supportedValuesOf("timeZone")

// Owner-only trip settings: registry metadata (title/dates/timezone), the
// public/private switch, and the delete danger zone. The worker mirrors
// metadata edits into the DO so every masthead updates live.
export function SettingsSection({ toast }: { toast: ToastFn }) {
  const { tripId, meta } = useTripAccess()
  const patchTrip = usePatchTrip(tripId)
  const deleteTrip = useDeleteTrip(tripId)
  const { confirm, confirmModal } = useConfirm()
  const navigate = useNavigate()

  const [title, setTitle] = useState(meta.title)
  const [startDate, setStartDate] = useState(meta.startDate ?? "")
  const [endDate, setEndDate] = useState(meta.endDate ?? "")
  const [timezone, setTimezone] = useState(meta.timezone)

  const dirty =
    title.trim() !== meta.title ||
    (startDate || "") !== (meta.startDate ?? "") ||
    (endDate || "") !== (meta.endDate ?? "") ||
    timezone.trim() !== meta.timezone

  const save = async () => {
    if (!title.trim()) {
      toast("行程名称不能为空", "warn")
      return
    }
    try {
      await patchTrip.mutateAsync({
        title: title.trim(),
        // Empty input = clear the stored date (null); undefined would keep it.
        startDate: startDate || null,
        endDate: endDate || null,
        timezone: timezone.trim() || undefined,
      })
      toast("已保存行程设置")
    } catch {
      toast("保存失败，请重试", "warn")
    }
  }

  const setVisibility = async (visibility: TripVisibility) => {
    if (visibility === meta.visibility) return
    try {
      await patchTrip.mutateAsync({ visibility })
      toast(visibility === "public" ? "行程已设为公开" : "行程已设为私密")
    } catch {
      toast("修改可见性失败，请重试", "warn")
    }
  }

  const destroy = async () => {
    const ok = await confirm({
      title: "删除这个行程？",
      message: (
        <span>
          行程的全部内容（时间线、账目、建议、备份、操作记录）都会被永久删除，无法恢复。
        </span>
      ),
      confirmLabel: "永久删除",
      requirePhrase: meta.id,
    })
    if (!ok) return
    try {
      await deleteTrip.mutateAsync()
      void navigate({ to: "/" })
    } catch {
      toast("删除失败，请重试", "warn")
    }
  }

  return (
    <div>
      <SectionHead
        kicker="07 · Settings"
        title="行程设置"
        desc="名称 / 日期 / 时区 / 可见性 · 仅创建者可修改"
      />

      <div className="mt-7 max-w-[560px] flex flex-col gap-[15px]">
        <label className="flex flex-col gap-[7px]">
          <span className={FIELD_LABEL}>行程名称</span>
          <input
            className={FIELD_INPUT}
            value={title}
            autoComplete="off"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-[14px] max-[440px]:grid-cols-1">
          <label className="flex flex-col gap-[7px]">
            <span className={FIELD_LABEL}>开始日期</span>
            <input
              className={FIELD_INPUT}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="flex flex-col gap-[7px]">
            <span className={FIELD_LABEL}>结束日期</span>
            <input
              className={FIELD_INPUT}
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-[7px]">
          <span className={FIELD_LABEL}>默认时区</span>
          <select
            className={`${FIELD_INPUT} cursor-pointer appearance-none [-webkit-appearance:none]`}
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {/* Keep whatever the registry holds selectable even if this
                browser's ICU list doesn't include it. */}
            {!timezoneOptions.includes(timezone) && <option value={timezone}>{timezone}</option>}
            {timezoneOptions.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <span className="font-cjk text-[11.5px] text-[#9b988f]">
            用于“今天”的判定和日程归档；跨时区的停靠点可以带自己的时区。
          </span>
        </label>

        <div>
          <button
            className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}
            onClick={save}
            disabled={!dirty || patchTrip.isPending}
          >
            <Icons.check sw={2.6} />
            保存修改
          </button>
        </div>

        <div className="mt-4 p-4 bg-white border border-[#ebe9e3] rounded-[14px]">
          <div className={FIELD_LABEL}>可见性</div>
          <p className="mt-2 font-cjk text-[12.5px] text-[#76726a] leading-relaxed">
            公开行程任何拿到链接的人都能浏览时间线 / 账目，还能匿名提建议；私密行程仅成员可见。
          </p>
          <div className="inline-flex gap-[5px] mt-3">
            {(
              [
                { key: "private", label: "私密 · 仅成员" },
                { key: "public", label: "公开 · 链接可读" },
              ] as const
            ).map((v) => (
              <button
                type="button"
                key={v.key}
                className={`font-cjk font-semibold text-[12px] cursor-pointer border rounded-full py-1.5 px-3 transition-colors ${meta.visibility === v.key ? CHIP_ON : CHIP_OFF}`}
                onClick={() => void setVisibility(v.key)}
                disabled={patchTrip.isPending}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 p-4 bg-white border border-[#ecccc2] rounded-[14px]">
          <div className="font-grotesk font-semibold text-[10px] tracking-[0.12em] uppercase text-[#c2553f]">
            危险区
          </div>
          <p className="mt-2 font-cjk text-[12.5px] text-[#76726a] leading-relaxed">
            删除行程会同时清空它的 Durable Object 存储：时间线、账目、备份、审计日志一并消失。
          </p>
          <button
            className={`${BTN} ${BTN_DANGER} mt-3 [&_svg]:size-3.5`}
            onClick={destroy}
            disabled={deleteTrip.isPending}
          >
            <Icons.trash sw={2.2} />
            删除行程
          </button>
        </div>
      </div>

      {confirmModal}
    </div>
  )
}
