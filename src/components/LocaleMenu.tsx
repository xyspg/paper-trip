import { Menu } from "@base-ui-components/react/menu";
import { useLingui } from "@lingui/react/macro";
import { Check, Globe } from "lucide-react";
import { switchLocale } from "../i18n";
import { currentLocale, LOCALES, type Locale } from "../locale";

// Endonyms: each language is listed in itself, so the menu stays usable for
// someone who cannot read the current UI language.
const LOCALE_NAMES: Record<Locale, { label: string; lang: string }> = {
  zh: { label: "中文", lang: "zh-CN" },
  en: { label: "English", lang: "en" },
};

const PAPER_TRIGGER =
  "grid place-items-center w-9 h-9 p-0 rounded-full border border-[#ebe9e3] bg-white text-[#3b3833] cursor-pointer transition-colors hover:border-[#1c1b19] data-[popup-open]:border-[#1c1b19]";

// Globe button with a language dropdown. Paper-theme pages use the default
// trigger; the admin header passes its own to match the logout button.
export function LocaleMenu({
  className = "",
  triggerClassName = PAPER_TRIGGER,
}: {
  className?: string;
  triggerClassName?: string;
}) {
  const { t } = useLingui();
  const active = currentLocale();
  return (
    <Menu.Root>
      <Menu.Trigger
        className={`${triggerClassName} ${className}`}
        title={t`语言`}
        aria-label={t`语言`}
      >
        <Globe size={16} strokeWidth={2.2} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner sideOffset={8} align="end" className="z-50">
          <Menu.Popup className="min-w-40 p-1.5 bg-white border border-[#ebe9e3] rounded-[12px] shadow-[0_10px_24px_-14px_rgba(28,27,25,0.4)] outline-none transition-[opacity,transform] duration-[140ms] ease-[ease] data-[starting-style]:opacity-0 data-[starting-style]:[transform:translateY(-4px)] data-[ending-style]:opacity-0 data-[ending-style]:[transform:translateY(-4px)]">
            <Menu.RadioGroup
              value={active}
              onValueChange={(value: Locale) => {
                if (value !== active) switchLocale(value);
              }}
            >
              {LOCALES.map((locale) => (
                <Menu.RadioItem
                  key={locale}
                  value={locale}
                  closeOnClick
                  lang={LOCALE_NAMES[locale].lang}
                  className="flex items-center gap-3 py-2 px-2.5 rounded-[8px] font-sans text-[13.5px] font-semibold text-[#3b3833] cursor-pointer outline-none select-none data-[highlighted]:bg-[#f3f1ec] data-[checked]:text-[#1c1b19]"
                >
                  <span className="flex-1">{LOCALE_NAMES[locale].label}</span>
                  <Menu.RadioItemIndicator className="text-[#3f6f5b]">
                    <Check size={15} strokeWidth={2.6} />
                  </Menu.RadioItemIndicator>
                </Menu.RadioItem>
              ))}
            </Menu.RadioGroup>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}
