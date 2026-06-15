import { useSyncExternalStore, type ReactNode } from "react";
import { HostContext, defaultHostContext } from "./host-context";
import {
  readInitialHostContext,
  subscribeHostContext
} from "./host-context-source";
import type { HostContextValue } from "./host-context-types";

/**
 * Module-level cache. `useSyncExternalStore` requires that `getSnapshot`
 * returns a *stable* reference between notifications — otherwise React
 * triggers the "getSnapshot should be cached" warning and an infinite render
 * loop. We mutate `cachedSnapshot` only inside the bus listener (or once at
 * module load) so the reference changes only when the host actually pushes.
 */
let cachedSnapshot: HostContextValue = (() => {
  if (typeof window === "undefined") {
    return defaultHostContext;
  }
  return readInitialHostContext() ?? defaultHostContext;
})();

function subscribe(notify: () => void): () => void {
  return subscribeHostContext((ctx) => {
    cachedSnapshot = ctx ?? defaultHostContext;
    notify();
  });
}

function getSnapshot(): HostContextValue {
  return cachedSnapshot;
}

function getServerSnapshot(): HostContextValue {
  return defaultHostContext;
}

type HostContextProviderProps = {
  children: ReactNode;
};

/**
 * Subscribes to the wujie bus once for the entire React tree and republishes
 * the latest host context via React Context. Safe in standalone mode: the
 * underlying subscribe is a no-op and consumers receive `defaultHostContext`.
 */
export function HostContextProvider({ children }: HostContextProviderProps) {
  const value = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return <HostContext.Provider value={value}>{children}</HostContext.Provider>;
}
