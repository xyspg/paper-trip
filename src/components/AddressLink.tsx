import { useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Popover } from "@base-ui-components/react/popover";
import { ChevronRight } from "lucide-react";
import { siApple, siGooglemaps } from "simple-icons";
import { appleMapsUrl, googleMapsUrl } from "../maps";

// There is no web API to pop the OS "open with" app chooser for a map link, so
// we offer our own: clicking an address opens a small popover and the user picks
// the map app to launch. Each option is a real link, so cmd/ctrl-click still
// opens it in a new tab.
type Provider = {
  id: string;
  label: string;
  href: (query: string) => string;
  icon: { path: string; hex: string };
};

const PROVIDERS: Provider[] = [
  { id: "apple", label: "Apple 地图", href: appleMapsUrl, icon: siApple },
  { id: "google", label: "Google 地图", href: googleMapsUrl, icon: siGooglemaps },
];

function BrandGlyph({ icon, title }: { icon: Provider["icon"]; title: string }) {
  return (
    <svg viewBox="0 0 24 24" width={18} height={18} fill="currentColor" aria-hidden>
      <title>{title}</title>
      <path d={icon.path} />
    </svg>
  );
}

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

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger
        className={`addr-link${className ? ` ${className}` : ""}`}
        title="在地图中打开"
      >
        {leading}
        {children}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Positioner sideOffset={8} align="start">
          <Popover.Popup className="map-pop">
            <Popover.Title render={<div />} className="map-pop-head">
              在地图中打开
            </Popover.Title>
            <div className="map-pop-opts">
              {PROVIDERS.map((p) => (
                <a
                  key={p.id}
                  className="map-pop-opt"
                  href={p.href(query)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setOpen(false)}
                  style={{ "--brand": `#${p.icon.hex}` } as CSSProperties}
                >
                  <span className="map-pop-ic">
                    <BrandGlyph icon={p.icon} title={p.label} />
                  </span>
                  <span className="map-pop-lb">{p.label}</span>
                  <ChevronRight className="map-pop-go" size={16} strokeWidth={2.4} />
                </a>
              ))}
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}
