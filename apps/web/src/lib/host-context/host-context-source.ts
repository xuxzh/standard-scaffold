/**
 * Pure (non-React) accessors for the wujie host context bridge.
 *
 * Everything here is safe to call from standalone mode — when the sub-app is
 * not running inside wujie, the wujie globals are absent and these helpers
 * return null / no-op unsubscribe.
 */

import { HOST_CONTEXT_EVENT, type HostContextValue } from "./host-context-types";

/**
 * Minimal structural type for the wujie globals we touch. We do not depend on
 * the `wujie` package types: the sub-app should not pull wujie into its bundle.
 */
type WujieBus = {
  $on(event: string, callback: (data: HostContextValue) => void): void;
  $off(event: string, callback: (data: HostContextValue) => void): void;
};

type WujieGlobal = {
  __POWERED_BY_WUJIE__?: boolean;
  __WUJIE?: {
    props?: { hostContext?: HostContextValue };
    bus?: WujieBus;
  };
};

function wujieWindow(): WujieGlobal | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as unknown as WujieGlobal;
}

/** True only when running inside a wujie iframe sandbox. */
export function isRunningInWujie(): boolean {
  return Boolean(wujieWindow()?.__POWERED_BY_WUJIE__);
}

/**
 * Read the initial host context that the host injected via `props.hostContext`
 * at `setupApp`/`startApp`/`preloadApp` time. Returns null when standalone or
 * when the host has not pushed a context yet.
 */
export function readInitialHostContext(): HostContextValue | null {
  return wujieWindow()?.__WUJIE?.props?.hostContext ?? null;
}

export type HostContextListener = (ctx: HostContextValue | null) => void;

/**
 * Subscribe to `host:context-sync` bus updates emitted by the host after
 * login state or i18n changes. Returns an unsubscribe function. When the
 * wujie bus is unavailable (standalone mode), the unsubscribe is a no-op
 * and the listener is never invoked.
 */
export function subscribeHostContext(listener: HostContextListener): () => void {
  const bus = wujieWindow()?.__WUJIE?.bus;
  if (!bus) {
    return () => {};
  }
  const handler = (data: HostContextValue) => {
    listener(data ?? null);
  };
  bus.$on(HOST_CONTEXT_EVENT, handler);
  return () => bus.$off(HOST_CONTEXT_EVENT, handler);
}
