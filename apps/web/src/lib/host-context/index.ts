/**
 * Public surface for the wujie host-context bridge.
 *
 * - `HostContextProvider` should sit at the outermost layer of the React tree
 *   so all features (including queries inside `QueryClientProvider`) can read
 *   the host state via `useHostContext()`.
 * - The non-React helpers (`isRunningInWujie`, `readInitialHostContext`,
 *   `subscribeHostContext`) are exposed for the rare call site that needs to
 *   peek at the host outside the React tree (e.g. `main.tsx` bootstrap).
 */

export { HostContextProvider } from "./host-context-provider";
export { useHostContext } from "./use-host-context";
export {
  describeWujieWindowLayout,
  isRunningInWujie,
  readInitialHostContext,
  subscribeHostContext,
  subscribeHostContextViaPostMessage,
  type HostContextListener
} from "./host-context-source";
export {
  HOST_CONTEXT_EVENT,
  type HostContextValue,
  type HostLanguageInfo
} from "./host-context-types";
