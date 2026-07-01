import { useState } from "react"
import { Icons } from "./AdminIcons"
import { useConfirm } from "./useConfirm"
import type { ToastFn } from "./useAdminToasts"
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup,
  useRestoreBackup,
  useTrip,
} from "../trip/hooks"
import type { TripBackup } from "../trip/api"

type Props = {
  toast: ToastFn
}

const fmtTime = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
}

const downloadJson = (filename: string, data: unknown) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export function BackupSection({ toast }: Props) {
  const [label, setLabel] = useState("")
  const { data: tripSnap } = useTrip()
  const { data: backups, isLoading, isError, refetch, isFetching } = useBackups()
  const createBackup = useCreateBackup()
  const restoreBackup = useRestoreBackup()
  const deleteBackup = useDeleteBackup()
  const { confirm, confirmModal } = useConfirm()

  const busy = createBackup.isPending || restoreBackup.isPending || deleteBackup.isPending

  const create = async () => {
    try {
      await createBackup.mutateAsync(label.trim() || undefined)
      setLabel("")
      toast("已创建备份")
    } catch {
      toast("创建备份失败，请重试", "warn")
    }
  }

  const restore = async (backup: TripBackup) => {
    const ok = await confirm({
      title: "恢复这个备份？",
      message: (
        <span>
          将把当前行程恢复到 <b>rev {backup.rev}</b> 的快照。当前状态会被覆盖，但这次恢复动作会进入审计日志。
        </span>
      ),
      confirmLabel: "恢复备份",
      requirePhrase: "RESTORE",
    })
    if (!ok) return

    try {
      await restoreBackup.mutateAsync(backup.id)
      toast("已恢复备份")
    } catch {
      toast("恢复失败，请重试", "warn")
    }
  }

  const remove = async (backup: TripBackup) => {
    const ok = await confirm({
      title: "删除这个备份？",
      message: "删除后不能从后台恢复这个快照。当前行程不会受影响。",
      confirmLabel: "删除备份",
      requirePhrase: "DELETE",
    })
    if (!ok) return

    try {
      await deleteBackup.mutateAsync(backup.id)
      toast("已删除备份")
    } catch {
      toast("删除失败，请重试", "warn")
    }
  }

  const exportCurrent = () => {
    if (!tripSnap) return
    const stamp = new Date().toISOString().replaceAll(":", "-")
    downloadJson(`ax26-trip-rev-${tripSnap.rev}-${stamp}.json`, tripSnap)
  }

  return (
    <div>
      <div className="relative bg-ink text-paper border-[3px] border-ink rounded-card shadow-hard-sm py-[18px] px-[clamp(18px,3vw,26px)] overflow-hidden isolate flex items-center gap-4 flex-wrap before:content-[''] before:absolute before:inset-0 before:z-[-1] before:bg-[repeating-linear-gradient(115deg,transparent_0_24px,rgba(255,255,255,0.04)_24px_26px)]">
        <span className="shrink-0 font-display font-black text-[24px] leading-none text-ink bg-green border-2 border-paper rounded-[10px] w-12 h-12 grid place-items-center">
          05
        </span>
        <div className="min-w-0">
          <div className="font-display font-black text-[clamp(19px,3vw,26px)] uppercase tracking-[0.01em] leading-none">
            备份与恢复
          </div>
          <div className="font-cjk font-medium text-[13px] text-paper/72 mt-[7px]">
            手动保存当前 trip JSON · 一键恢复快照 · 操作写入审计日志
          </div>
        </div>
        <span className="flex-1" />
        <button
          className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[9px] px-[15px] rounded-full border-2 border-ink cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] [&_svg]:w-[14px] [&_svg]:h-[14px] bg-paper-2 text-ink shadow-[3px_3px_0_var(--color-ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-[3px_3px_0_var(--color-ink)]"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <Icons.swap sw={2.2} />
          {isFetching ? "刷新中" : "刷新"}
        </button>
      </div>

      <section className="mt-[clamp(20px,4vw,30px)] bg-paper-2 border-[3px] border-ink rounded-card shadow-hard-sm overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 p-4 items-end max-[720px]:grid-cols-1">
          <label className="grid gap-1.5 min-w-0">
            <span className="font-grotesk font-extrabold text-[10.5px] tracking-[0.12em] uppercase text-ink-soft">
              备份标签
            </span>
            <input
              className="w-full box-border bg-paper border-2 border-ink rounded-[10px] px-3 py-2.5 font-cjk font-bold text-[14px] outline-none focus:shadow-[3px_3px_0_var(--color-ink)]"
              value={label}
              placeholder={`Manual backup · rev ${tripSnap?.rev ?? "?"}`}
              maxLength={120}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button
            className="inline-flex justify-center items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[10px] px-[15px] rounded-full border-2 border-ink text-ink bg-green cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none [&_svg]:w-3.5 [&_svg]:h-3.5"
            onClick={create}
            disabled={busy}
          >
            <Icons.plus sw={2.6} />
            创建备份
          </button>
          <button
            className="inline-flex justify-center items-center gap-[7px] font-grotesk font-extrabold text-[12px] tracking-[0.02em] py-[10px] px-[15px] rounded-full border-2 border-ink text-ink bg-paper cursor-pointer whitespace-nowrap [transition:transform_0.08s_ease,box-shadow_0.08s_ease] shadow-[3px_3px_0_var(--color-ink)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[3px] active:translate-y-[3px] active:shadow-none disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none [&_svg]:w-3.5 [&_svg]:h-3.5"
            onClick={exportCurrent}
            disabled={!tripSnap}
          >
            <Icons.arrow sw={2.4} />
            下载当前 JSON
          </button>
        </div>
      </section>

      <section className="mt-5 grid gap-3">
        {isLoading ? (
          <EmptyState title="加载中…" body="正在读取备份列表。" />
        ) : isError ? (
          <EmptyState title="无法加载备份" body="请确认你已登录管理员账号后重试。" warn />
        ) : !backups || backups.length === 0 ? (
          <EmptyState title="暂无备份" body="创建第一个备份后，会在这里显示可恢复的快照。" />
        ) : (
          backups.map((backup) => (
            <article
              key={backup.id}
              className="bg-paper-2 border-2 border-ink rounded-[12px] shadow-[3px_3px_0_var(--color-ink)] overflow-hidden"
            >
              <div className="grid grid-cols-[1fr_auto] gap-3 py-3 px-3.5 border-b-2 border-dashed border-ink max-[640px]:grid-cols-1">
                <div className="min-w-0">
                  <div className="font-cjk font-black text-[15px] leading-tight truncate">
                    {backup.label || `Manual backup · rev ${backup.rev}`}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-ink-soft">
                    {backup.id}
                  </div>
                </div>
                <div className="flex gap-2 justify-end max-[640px]:justify-start">
                  <button
                    className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-1.5 px-[11px] rounded-full border-2 border-ink bg-paper-2 text-ink cursor-pointer whitespace-nowrap hover:bg-green disabled:opacity-45 [&_svg]:w-3.5 [&_svg]:h-3.5"
                    onClick={() => restore(backup)}
                    disabled={busy}
                  >
                    <Icons.swap sw={2.4} />
                    恢复
                  </button>
                  <button
                    className="inline-flex items-center gap-[7px] font-grotesk font-extrabold text-[11px] tracking-[0.02em] py-1.5 px-[11px] rounded-full border-2 border-magenta text-magenta bg-paper-2 cursor-pointer whitespace-nowrap hover:bg-magenta hover:text-paper disabled:opacity-45 [&_svg]:w-3.5 [&_svg]:h-3.5"
                    onClick={() => remove(backup)}
                    disabled={busy}
                  >
                    <Icons.trash sw={2.2} />
                    删除
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-0 max-[640px]:grid-cols-1">
                <Fact label="时间" value={fmtTime(backup.at)} />
                <Fact label="Revision" value={`rev ${backup.rev}`} />
                <Fact label="操作者" value={backup.actorLogin} />
              </div>
            </article>
          ))
        )}
      </section>

      {confirmModal}
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-3 px-3.5 border-r-2 border-ink last:border-r-0 max-[640px]:border-r-0 max-[640px]:border-b-2 max-[640px]:last:border-b-0">
      <div className="font-grotesk font-extrabold text-[10px] tracking-[0.12em] uppercase text-ink-soft">
        {label}
      </div>
      <div className="mt-1.5 font-cjk font-bold text-[13px] truncate">{value}</div>
    </div>
  )
}

function EmptyState({ title, body, warn }: { title: string; body: string; warn?: boolean }) {
  return (
    <div className="text-center py-12 px-6 border-[3px] border-dashed border-ink rounded-card bg-paper-2">
      <div
        className="w-14 h-14 mt-0 mx-auto mb-[14px] rounded-[14px] bg-[color-mix(in_srgb,var(--color-green)_18%,var(--color-paper-2))] border-[3px] border-ink grid place-items-center [&_svg]:w-7 [&_svg]:h-7"
        style={{ color: warn ? "var(--color-magenta)" : "var(--color-green)" }}
      >
        {warn ? <Icons.x sw={2.4} /> : <Icons.repo sw={2.4} />}
      </div>
      <div className="font-display font-extrabold text-[17px] uppercase tracking-[0.04em]">
        {title}
      </div>
      <div className="font-cjk font-medium text-[13px] text-ink-soft mt-2">{body}</div>
    </div>
  )
}
