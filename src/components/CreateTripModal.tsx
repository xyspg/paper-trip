import { useState } from "react";
import { AdminModal } from "../admin/AdminModal";
import { Icons } from "../admin/AdminIcons";
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  CHIP_OFF,
  CHIP_ON,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "../admin/adminUi";
import { useCreateTrip } from "../trip/hooks";
import type { TripMeta, TripVisibility } from "../trip/api";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (trip: TripMeta) => void;
};

// Reset the form whenever the modal (re)opens by keying the inner component;
// it always starts from fresh defaults.
function Form({ onClose, onCreated }: Omit<Props, "isOpen">) {
  const createTrip = useCreateTrip();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [visibility, setVisibility] = useState<TripVisibility>("private");
  const [error, setError] = useState("");

  const canSubmit = title.trim().length > 0 && !createTrip.isPending;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    try {
      const trip = await createTrip.mutateAsync({
        title: title.trim(),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        // No timezone question at creation: default to wherever the creator
        // is right now; the owner can refine it in settings, and stops that
        // cross timezones carry their own (item.timezone).
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
        visibility,
      });
      onCreated(trip);
    } catch {
      setError("创建失败，请重试");
    }
  };

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <ModalHeader icon={<Icons.plus sw={2.6} />} title="新建行程" onClose={onClose} />

      <div className="grid grid-cols-2 gap-y-[15px] gap-x-[14px] p-[18px] max-[440px]:grid-cols-1">
        <label className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>行程名称</span>
          <input
            className={FIELD_INPUT}
            value={title}
            autoFocus
            autoComplete="off"
            data-1p-ignore
            data-lpignore="true"
            placeholder="例如 东京夏日之旅"
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>开始日期</span>
          <input
            className={FIELD_INPUT}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-[7px] min-w-0">
          <span className={FIELD_LABEL}>结束日期</span>
          <input
            className={FIELD_INPUT}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>可见性</span>
          <div className="inline-flex gap-[5px]">
            {(
              [
                { key: "private", label: "私密 · 仅成员可见" },
                { key: "public", label: "公开 · 任何人可读" },
              ] as const
            ).map((v) => (
              <button
                type="button"
                key={v.key}
                className={`font-cjk font-semibold text-[12px] cursor-pointer border rounded-full py-1.5 px-3 transition-colors ${visibility === v.key ? CHIP_ON : CHIP_OFF}`}
                onClick={() => setVisibility(v.key)}
              >
                {v.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="col-span-full font-cjk font-semibold text-[12.5px] text-[#c2553f]">
            {error}
          </div>
        )}
      </div>

      <ModalFooter>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button
          type="submit"
          className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}
          disabled={!canSubmit}
        >
          <Icons.plus sw={2.6} />
          {createTrip.isPending ? "创建中…" : "创建行程"}
        </button>
      </ModalFooter>
    </form>
  );
}

export function CreateTripModal({ isOpen, onClose, onCreated }: Props) {
  return (
    <AdminModal isOpen={isOpen} onClose={onClose}>
      <Form key={String(isOpen)} onClose={onClose} onCreated={onCreated} />
    </AdminModal>
  );
}
