import type { ReactNode } from "react";
import { Client as Styletron } from "styletron-engine-atomic";
import { Provider as StyletronProvider } from "styletron-react";
import { BaseProvider, LightTheme } from "baseui";
import { installImeEscapeGuard } from "../ime";
import { useMountEffect } from "../useMountEffect";

// Single shared engine. Lazily created so importing this module never touches
// `document` until the admin tree actually mounts in the browser.
let engine: Styletron | null = null;
const getEngine = () => (engine ??= new Styletron());

export function BaseWebProvider({ children }: { children: ReactNode }) {
  // Base Web's layer manager closes the open modal on any Escape keyup it sees at the
  // document, including the one that only dismissed an IME candidate list. Every Base
  // Web modal in the app lives under this provider, so the guard is installed here.
  useMountEffect(() => installImeEscapeGuard());

  return (
    <StyletronProvider value={getEngine()}>
      <BaseProvider theme={LightTheme}>{children}</BaseProvider>
    </StyletronProvider>
  );
}
