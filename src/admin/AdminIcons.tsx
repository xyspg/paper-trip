// Shared inline SVG icons for the admin console. Ported from the design's icons.jsx
// (window globals -> typed named exports; React.createElement call sites use JSX).
import type { ReactElement, ReactNode, SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement> & { sw?: number };
type IconComponent = (props: IconProps) => ReactElement;

function Svg({
  d,
  children,
  sw = 2,
  fill = "none",
  ...rest
}: IconProps & { d?: string; children?: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {d ? <path d={d} /> : children}
    </svg>
  );
}

export const Icons = {
  github: (p: IconProps) => (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 1.5A10.5 10.5 0 0 0 1.5 12c0 4.64 3.01 8.57 7.18 9.96.53.1.72-.23.72-.5v-1.75c-2.92.64-3.54-1.4-3.54-1.4-.48-1.22-1.17-1.54-1.17-1.54-.96-.65.07-.64.07-.64 1.06.08 1.61 1.09 1.61 1.09.94 1.6 2.46 1.14 3.06.87.1-.68.37-1.14.67-1.4-2.33-.27-4.78-1.17-4.78-5.19 0-1.15.41-2.08 1.08-2.82-.11-.27-.47-1.34.1-2.79 0 0 .88-.28 2.88 1.07a10 10 0 0 1 5.24 0c2-1.35 2.88-1.07 2.88-1.07.57 1.45.21 2.52.1 2.79.68.74 1.08 1.67 1.08 2.82 0 4.03-2.46 4.92-4.8 5.18.38.33.71.97.71 1.96v2.91c0 .28.19.61.73.5A10.5 10.5 0 0 0 22.5 12 10.5 10.5 0 0 0 12 1.5Z" />
    </svg>
  ),
  repo: (p: IconProps) => (
    <Svg
      {...p}
      d="M5 3h11a2 2 0 0 1 2 2v15a1 1 0 0 0-1-1H6a1 1 0 0 1-1-1V3Zm0 14h13M8 3v10l2.5-1.8L13 13V3"
    />
  ),
  route: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="6" cy="19" r="2.4" />
      <circle cx="18" cy="5" r="2.4" />
      <path d="M8.4 5H7a4 4 0 0 0 0 8h10a4 4 0 0 1 0 8h-1.4" />
    </Svg>
  ),
  chat: (p: IconProps) => (
    <Svg {...p} d="M21 11.5a8.4 8.4 0 0 1-11.9 7.6L3 21l1.9-5.6A8.4 8.4 0 1 1 21 11.5Z" />
  ),
  wallet: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H5a2 2 0 0 0-2 2Z" />
      <path d="M3 9.5h16a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="16.5" cy="14.5" r="1.1" fill="currentColor" stroke="none" />
    </Svg>
  ),
  plus: (p: IconProps) => <Svg {...p} d="M12 5v14M5 12h14" />,
  check: (p: IconProps) => <Svg {...p} d="M4 12.5 9 17.5 20 6" />,
  camera: (p: IconProps) => (
    <Svg {...p}>
      <path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L17 6h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
      <circle cx="12" cy="12.5" r="3.2" />
    </Svg>
  ),
  image: (p: IconProps) => (
    <Svg {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.6" />
      <path d="M21 15.5 16 11l-8 8" />
    </Svg>
  ),
  sparkle: (p: IconProps) => (
    <Svg
      {...p}
      d="M12 3l1.8 4.9L18.5 9.5l-4.7 1.6L12 16l-1.8-4.9L5.5 9.5l4.7-1.6ZM18.5 15l.8 2.1 2.2.7-2.2.7-.8 2.1-.8-2.1-2.2-.7 2.2-.7Z"
    />
  ),
  x: (p: IconProps) => <Svg {...p} d="M6 6l12 12M18 6 6 18" />,
  trash: (p: IconProps) => (
    <Svg
      {...p}
      d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V7"
    />
  ),
  pencil: (p: IconProps) => (
    <Svg {...p} d="M4 20l4.5-1L19 8.5a2 2 0 0 0-3-3L5.5 16 4 20ZM14.5 7l3 3" />
  ),
  users: (p: IconProps) => (
    <Svg {...p}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Svg>
  ),
  gear: (p: IconProps) => (
    <Svg {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </Svg>
  ),
  swap: (p: IconProps) => <Svg {...p} d="M7 4 3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8" />,
  logout: (p: IconProps) => (
    <Svg {...p} d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3m6-4 4-4-4-4m4 4H9" />
  ),
  arrow: (p: IconProps) => <Svg {...p} d="M5 12h14M13 6l6 6-6 6" />,
  plane: (p: IconProps) => (
    <Svg
      {...p}
      d="M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.6.6 0 0 0-.5.2l-.9.9a.6.6 0 0 0 .2 1l5 2.7-2.3 2.3-1.7-.3a.6.6 0 0 0-.5.2l-.6.6a.6.6 0 0 0 .1.9l2 1.3 1.3 2a.6.6 0 0 0 .9.1l.6-.6a.6.6 0 0 0 .2-.5l-.3-1.7 2.3-2.3 2.7 5a.6.6 0 0 0 1 .2l.9-.9a.6.6 0 0 0 .2-.5Z"
    />
  ),
  hotel: (p: IconProps) => (
    <Svg
      {...p}
      d="M3 21h18M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 21V9h3a1 1 0 0 1 1 1v11M8 8h1M11 8h1M8 12h1M11 12h1M8 16h1M11 16h1"
    />
  ),
  ticket: (p: IconProps) => (
    <Svg {...p}>
      <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2 2 2 0 0 0 0 4 2 2 0 0 1-2 2H6a2 2 0 0 1-2-2 2 2 0 0 0 0-4Z" />
    </Svg>
  ),
  car: (p: IconProps) => (
    <Svg
      {...p}
      d="M5 16v2a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-1m8 0v1a1 1 0 0 0 1 1h1a1 1 0 0 0 1-1v-2M4 14l1.5-5A2 2 0 0 1 7.4 7.6h9.2A2 2 0 0 1 18.5 9L20 14m-16 0h16m-16 0v2h16v-2M7 11h10"
    />
  ),
} satisfies Record<string, IconComponent>;

export type IconName = keyof typeof Icons;

export const EXP_ICON: Record<string, IconName> = {
  flight: "plane",
  hotel: "hotel",
  tickets: "ticket",
  car: "car",
};
