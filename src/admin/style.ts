import type { CSSProperties } from "react";

// Inline style that carries CSS custom properties (--accent, --cat, ...), which
// React's CSSProperties type does not model. Keeps the design's inline-var pattern.
export const cssVars = (style: Record<string, string | number>): CSSProperties =>
  style as CSSProperties;
