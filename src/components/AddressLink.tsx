import { useState } from "react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import type { MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import { Trans, useLingui } from "@lingui/react/macro";
import { Popover } from "@base-ui-components/react/popover";
import { ChevronRight } from "lucide-react";
import { appleMapsUrl, googleMapsUrl } from "../maps";

// There is no web API to pop the OS "open with" app chooser for a map link, so
// we offer our own: clicking an address opens a small popover and the user picks
// the map app to launch. Each option is a real link, so cmd/ctrl-click still
// opens it in a new tab.
type Provider = {
  id: string;
  label: MessageDescriptor;
  href: (query: string) => string;
  brand: string;
  // Rendered with the translated label as its accessible title.
  Glyph: ComponentType<{ title: string }>;
  // Both providers use their real app marks, which sit on a plain white tile.
  plainTile?: boolean;
};

// Real Apple Maps app icon (downloaded to /public).
function AppleMapsGlyph({ title }: { title: string }) {
  return (
    <img
      src="/apple-maps.webp"
      alt={title}
      width={26}
      height={26}
      className="block rounded-md object-cover"
    />
  );
}

// Official 2020 Google Maps pin, kept full-color so it reads as the real brand
// mark rather than a flat tint.
function GoogleMapsGlyph({ title }: { title: string }) {
  return (
    <svg viewBox="0 0 92.3 132.3" width={16} height={18} aria-hidden>
      <title>{title}</title>
      <path
        fill="#1a73e8"
        d="M60.2 2.2C55.8.8 51 0 46.1 0 32 0 19.3 6.4 10.8 16.5l21.8 18.3L60.2 2.2z"
      />
      <path
        fill="#ea4335"
        d="M10.8 16.5C4.1 24.5 0 34.9 0 46.1c0 8.7 1.7 15.7 4.6 22l28-33.3-21.8-18.3z"
      />
      <path
        fill="#4285f4"
        d="M46.2 28.5c9.8 0 17.7 7.9 17.7 17.7 0 4.3-1.6 8.3-4.2 11.4 0 0 13.9-16.6 27.5-32.7-5.6-10.8-15.3-19-27-22.7L32.6 34.8c3.3-3.8 8.1-6.3 13.6-6.3"
      />
      <path
        fill="#fbbc04"
        d="M46.2 63.8c-9.8 0-17.7-7.9-17.7-17.7 0-4.3 1.5-8.3 4.1-11.3l-28 33.3c4.8 10.6 12.8 19.2 21 29.9l34.1-40.5c-3.3 3.9-8.1 6.3-13.5 6.3"
      />
      <path
        fill="#34a853"
        d="M59.1 109.2c15.4-24.1 33.3-35 33.3-63 0-7.7-1.9-14.9-5.2-21.3L25.6 98c2.6 3.4 5.3 7.3 7.9 11.3 9.4 14.5 6.8 23.1 12.8 23.1s3.4-8.7 12.8-23.2"
      />
    </svg>
  );
}

const PROVIDERS: Provider[] = [
  {
    id: "apple",
    label: msg`Apple 地图`,
    href: appleMapsUrl,
    brand: "#1f8eff",
    Glyph: AppleMapsGlyph,
    plainTile: true,
  },
  {
    id: "google",
    label: msg`Google 地图`,
    href: googleMapsUrl,
    brand: "#4285f4",
    Glyph: GoogleMapsGlyph,
    plainTile: true,
  },
];

export function AddressLink({
  query,
  className,
  leading,
  children,
}: {
  query: string;
  className?: string;
  leading?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { t } = useLingui();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={`appearance-none [-webkit-appearance:none] bg-transparent border-0 m-0 p-0 [font:inherit] text-left cursor-pointer${className ? ` ${className}` : ""}`}
        title={t`在地图中打开`}
      >
        {leading}
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start">
          <Popover.Popup className="box-border min-w-56 p-2 bg-paper-2 border-[3px] border-ink rounded-[14px] shadow-hard-sm outline-none transition-[opacity,transform] duration-[140ms] ease-[ease] data-[starting-style]:opacity-0 data-[starting-style]:[transform:translateY(-4px)_scale(0.98)] data-[ending-style]:opacity-0 data-[ending-style]:[transform:translateY(-4px)_scale(0.98)]">
            <Popover.Title
              render={<div />}
              className="px-2 pt-1 pb-2 font-grotesk text-[11px] font-bold tracking-[0.08em] uppercase text-ink-soft"
            >
              <Trans>在地图中打开</Trans>
            </Popover.Title>
            <div className="grid gap-1.5">
              {PROVIDERS.map((p) => (
                <a
                  key={p.id}
                  className="flex items-center gap-2.5 py-2 px-2.5 border-2 border-ink rounded-[10px] bg-paper-2 text-ink font-cjk text-[14px] font-semibold no-underline transition-[transform,box-shadow,background] duration-100 ease-[ease] hover:bg-[color-mix(in_srgb,var(--brand)_12%,var(--color-paper-2))] hover:[transform:translate(-1px,-1px)] hover:shadow-[3px_3px_0_var(--color-ink)] active:[transform:translate(0,0)] active:shadow-[1px_1px_0_var(--color-ink)]"
                  href={p.href(query)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  style={{ "--brand": p.brand } as CSSProperties}
                >
                  <span
                    className={`grid place-items-center shrink-0 w-[30px] h-[30px] border-2 border-ink rounded-lg text-white ${p.plainTile ? "bg-white" : "bg-[var(--brand)]"}`}
                  >
                    <p.Glyph title={t(p.label)} />
                  </span>
                  <span className="flex-1">{t(p.label)}</span>
                  <ChevronRight className="shrink-0 text-ink-soft" size={16} strokeWidth={2.4} />
                </a>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
