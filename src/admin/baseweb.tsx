import type { ReactNode } from "react"
import { Client as Styletron } from "styletron-engine-atomic"
import { Provider as StyletronProvider } from "styletron-react"
import { BaseProvider, LightTheme } from "baseui"

// Single shared engine. Lazily created so importing this module never touches
// `document` until the admin tree actually mounts in the browser.
let engine: Styletron | null = null
const getEngine = () => (engine ??= new Styletron())

export function BaseWebProvider({ children }: { children: ReactNode }) {
  return (
    <StyletronProvider value={getEngine()}>
      <BaseProvider theme={LightTheme}>{children}</BaseProvider>
    </StyletronProvider>
  )
}
