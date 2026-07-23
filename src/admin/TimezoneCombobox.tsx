import { useId, type ReactNode } from "react";
import { Combobox } from "@base-ui-components/react/combobox";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { FIELD_INPUT, FIELD_LABEL } from "./adminUi";
import { timezoneDisplayName, timezoneMatchesQuery, timezoneOptionsForValue } from "./timezone";

type Props = {
  value: string;
  onValueChange: (value: string) => void;
  label?: string;
  description?: ReactNode;
  placeholder?: string;
  allowEmpty?: boolean;
};

const DEFAULT_DESCRIPTION = "用于“今天”的判定和日程归档；跨时区的停靠点可以带自己的时区。";

export function TimezoneCombobox({
  value,
  onValueChange,
  label = "默认时区",
  description = DEFAULT_DESCRIPTION,
  placeholder = "搜索城市或时区，如 New York",
  allowEmpty = false,
}: Props) {
  const inputId = useId();
  // Preserve a registry value even when an older browser's ICU dataset does
  // not expose it through Intl.supportedValuesOf().
  const items = timezoneOptionsForValue(value);

  return (
    <div className="flex flex-col gap-[7px]">
      <label className={FIELD_LABEL} htmlFor={inputId}>
        {label}
      </label>
      <Combobox.Root
        items={items}
        value={value}
        autoHighlight
        filter={(timezone, query) => timezoneMatchesQuery(String(timezone), query)}
        onValueChange={(nextValue) => {
          if (nextValue) onValueChange(nextValue);
          else if (allowEmpty) onValueChange("");
        }}
      >
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 z-[1] -translate-y-1/2 text-[#9b988f]"
            size={16}
            strokeWidth={2.1}
            aria-hidden="true"
          />
          <Combobox.Input
            id={inputId}
            className={`${FIELD_INPUT} pl-10 pr-11 font-mono`}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <Combobox.Trigger
            type="button"
            className="absolute right-1.5 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-[8px] border-0 bg-transparent text-[#76726a] transition-colors hover:bg-[#f0eee8] hover:text-[#1c1b19]"
            aria-label="打开时区列表"
          >
            <ChevronsUpDown size={15} strokeWidth={2.2} aria-hidden="true" />
          </Combobox.Trigger>
        </div>

        <Combobox.Portal>
          <Combobox.Positioner className="z-[100] outline-none" align="start" sideOffset={6}>
            <Combobox.Popup className="box-border w-[var(--anchor-width)] min-w-[280px] overflow-hidden rounded-[12px] border border-[#d8d5cb] bg-white shadow-[0_18px_50px_-24px_rgba(28,27,25,0.38)] outline-none transition-[opacity,transform] duration-150 data-[starting-style]:translate-y-[-4px] data-[starting-style]:opacity-0 data-[ending-style]:translate-y-[-4px] data-[ending-style]:opacity-0">
              <Combobox.Empty className="px-4 py-8 text-center font-cjk text-[12.5px] text-[#76726a]">
                没有匹配的时区
              </Combobox.Empty>
              <Combobox.List className="max-h-[min(320px,var(--available-height))] overflow-y-auto p-1.5">
                {(timezone: string) => (
                  <Combobox.Item
                    key={timezone}
                    value={timezone}
                    className="relative flex cursor-default items-center gap-2.5 rounded-[9px] px-3 py-2.5 pl-9 outline-none select-none data-[highlighted]:bg-[#eef4f0] data-[highlighted]:text-[#1c1b19]"
                  >
                    <Combobox.ItemIndicator className="absolute left-3 grid size-4 place-items-center text-[#3f6f5b]">
                      <Check size={14} strokeWidth={2.7} aria-hidden="true" />
                    </Combobox.ItemIndicator>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-cjk text-[13px] font-semibold text-[#3b3833]">
                        {timezoneDisplayName(timezone)}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-[9.5px] text-[#9b988f]">
                        {timezone}
                      </span>
                    </span>
                  </Combobox.Item>
                )}
              </Combobox.List>
            </Combobox.Popup>
          </Combobox.Positioner>
        </Combobox.Portal>
      </Combobox.Root>
      {description && <span className="font-cjk text-[11.5px] text-[#9b988f]">{description}</span>}
    </div>
  );
}
