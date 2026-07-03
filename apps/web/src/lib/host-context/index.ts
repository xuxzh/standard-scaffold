/**
 * Public surface for the micro host-context bridge.
 *
 * - `HostContextProvider` should sit at the outermost layer of the React tree
 *   so all features (including queries inside `QueryClientProvider`) can read
 *   the host state via `useHostContext()`.
 * - The non-React helpers (`isRunningInMicroHost`, `readInitialHostContext`,
 *   `subscribeHostContext`) are exposed for the rare call site that needs to
 *   peek at the host outside the React tree (e.g. `main.tsx` bootstrap).
 */

export { HostContextProvider } from "./host-context-provider";
export { useHostContext } from "./use-host-context";
export {
  applyMicroHostProps,
  isRunningInMicroHost,
  readInitialHostContext,
  resetMicroHostContextForTest,
  subscribeHostContext,
  type HostContextListener
} from "./host-context-source";
export {
  type MicroHostProps,
  type HostContextValue,
  type HostLanguageInfo
} from "./host-context-types";
