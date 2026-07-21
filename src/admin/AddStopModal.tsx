import { useState } from "react";
import { AdminModal } from "./AdminModal";
import type { StopCat } from "./adminData";
import { Icons } from "./AdminIcons";
import type { ItemStatus } from "../trip/types";
import {
  BTN,
  BTN_GHOST,
  BTN_INK,
  CategoryChips,
  CHIP_OFF,
  FIELD_INPUT,
  FIELD_LABEL,
  ModalFooter,
  ModalHeader,
} from "./adminUi";

export type NewStopInput = {
  day: number;
  date: string;
  time: string;
  title: string;
  cat: StopCat;
  status: ItemStatus;
};

export type StopDayOption = { day: number; date: string; label: string };

type Props = {
  isOpen: boolean;
  days: StopDayOption[];
  initialDay: number;
  onClose: () => void;
  onCreate: (input: NewStopInput) => void;
};

const STATUS: Record<ItemStatus, { label: string }> = {
  planned: { label: "计划中" },
  locked: { label: "已锁定" },
  done: { label: "已完成" },
};

const STATUS_KEYS = Object.keys(STATUS) as ItemStatus[];

// Selected-status chip fill, keyed by the persisted TripItem status.
// Literal editorial hues (accent / slate / ochre) so the pill fills in its own color.
const STATUS_ON_HEX: Record<string, string> = {
  locked: "#3f6f5b",
  planned: "#5b7a99",
  done: "#76726a",
};

// Reset the form whenever the modal (re)opens for a different day by keying the
// parent on `initialDay`; this inner component always starts from fresh defaults.
function Form({ days, initialDay, onClose, onCreate }: Omit<Props, "isOpen">) {
  const fallbackDay = days[0]?.day ?? 1;
  const [day, setDay] = useState(days.some((d) => d.day === initialDay) ? initialDay : fallbackDay);
  const [time, setTime] = useState("09:00");
  const [title, setTitle] = useState("");
  const [cat, setCat] = useState<StopCat>("event");
  const [status, setStatus] = useState<ItemStatus>("planned");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const date = days.find((d) => d.day === day)?.date ?? "";
    onCreate({ day, date, time: time.trim() || "00:00", title: title.trim(), cat, status });
  };

  return (
    <form className="flex flex-col" onSubmit={submit}>
      <ModalHeader icon={<Icons.plus sw={2.6} />} title="新增停靠点" onClose={onClose} />

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
                Day {d.day} · {d.label}
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
          <CategoryChips value={cat} onChange={setCat} />
        </div>

        <div className="flex flex-col gap-[7px] min-w-0 col-span-full">
          <span className={FIELD_LABEL}>状态</span>
          <div className="flex flex-wrap gap-[7px]">
            {STATUS_KEYS.map((k) => {
              const on = status === k;
              return (
                <button
                  type="button"
                  key={k}
                  className={`inline-flex items-center gap-[7px] font-grotesk font-semibold text-[11px] tracking-[0.03em] px-3 py-[7px] rounded-full border transition-colors ${on ? "text-white" : CHIP_OFF}`}
                  style={
                    on ? { background: STATUS_ON_HEX[k], borderColor: STATUS_ON_HEX[k] } : undefined
                  }
                  onClick={() => setStatus(k)}
                >
                  {STATUS[k].label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <ModalFooter>
        <button type="button" className={`${BTN} ${BTN_GHOST}`} onClick={onClose}>
          取消
        </button>
        <span className="ml-auto" />
        <button type="submit" className={`${BTN} ${BTN_INK} [&_svg]:size-3.5`}>
          <Icons.plus sw={2.6} />
          创建停靠点
        </button>
      </ModalFooter>
    </form>
  );
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
  );
}
