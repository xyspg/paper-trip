import { useState } from "react"
import { Icons } from "./AdminIcons"
import { fmtTime } from "./adminData"
import {
  AdminEmptyState,
  BTN,
  BTN_ACCENT,
  BTN_DANGER,
  BTN_GHOST,
  BTN_SM,
  FIELD_INPUT,
  FIELD_LABEL,
  RefreshButton,
  SectionHead,
} from "./adminUi"
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
import { downloadText } from "../trip/exporters"

type Props = {
  toast: ToastFn
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
    downloadText(
      `ax26-trip-rev-${tripSnap.rev}-${stamp}.json`,
      JSON.stringify(tripSnap, null, 2),
      "application/json",
    )
  }

  return (
    <div>
      <SectionHead
        kicker="05 · Backup"
        title="备份与恢复"
        desc="手动保存当前 trip JSON · 一键恢复快照 · 操作写入审计日志"
        actions={<RefreshButton onClick={() => refetch()} busy={isFetching} />}
      />

      <section className="mt-6 bg-white border border-[#ebe9e3] rounded-[14px] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3 p-4 items-end max-[720px]:grid-cols-1">
          <label className="grid gap-1.5 min-w-0">
            <span className={FIELD_LABEL}>备份标签</span>
            <input
              className={FIELD_INPUT}
              value={label}
              placeholder={`Manual backup · rev ${tripSnap?.rev ?? "?"}`}
              maxLength={120}
              onChange={(e) => setLabel(e.target.value)}
            />
          </label>
          <button
            className={`${BTN} ${BTN_ACCENT} justify-center [&_svg]:size-3.5`}
            onClick={create}
            disabled={busy}
          >
            <Icons.plus sw={2.6} />
            创建备份
          </button>
          <button
            className={`${BTN} ${BTN_GHOST} justify-center [&_svg]:size-3.5`}
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
          <AdminEmptyState title="加载中…" body="正在读取备份列表。" icon={<Icons.repo sw={2.2} />} />
        ) : isError ? (
          <AdminEmptyState title="无法加载备份" body="请确认你已登录管理员账号后重试。" warn />
        ) : !backups || backups.length === 0 ? (
          <AdminEmptyState
            title="暂无备份"
            body="创建第一个备份后，会在这里显示可恢复的快照。"
            icon={<Icons.repo sw={2.2} />}
          />
        ) : (
          backups.map((backup) => (
            <article
              key={backup.id}
              className="bg-white border border-[#ebe9e3] rounded-[14px] overflow-hidden"
            >
              <div className="grid grid-cols-[1fr_auto] gap-3 px-3.5 py-3 border-b border-dashed border-[#ebe9e3] max-[640px]:grid-cols-1">
                <div className="min-w-0">
                  <div className="font-cjk font-bold text-[15px] leading-tight truncate">
                    {backup.label || `Manual backup · rev ${backup.rev}`}
                  </div>
                  <div className="mt-1 font-mono text-[11px] text-[#9b988f]">{backup.id}</div>
                </div>
                <div className="flex gap-2 justify-end max-[640px]:justify-start">
                  <button
                    className={`${BTN_SM} ${BTN_GHOST} [&_svg]:size-3.5`}
                    onClick={() => restore(backup)}
                    disabled={busy}
                  >
                    <Icons.swap sw={2.4} />
                    恢复
                  </button>
                  <button
                    className={`${BTN_SM} ${BTN_DANGER} [&_svg]:size-3.5`}
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
    <div className="px-3.5 py-3 border-r border-[#ebe9e3] last:border-r-0 max-[640px]:border-r-0 max-[640px]:border-b max-[640px]:last:border-b-0">
      <div className={FIELD_LABEL}>{label}</div>
      <div className="mt-1.5 font-cjk font-semibold text-[13px] truncate">{value}</div>
    </div>
  )
}
