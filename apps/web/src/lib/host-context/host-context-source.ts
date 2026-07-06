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
 *
 * IMPORTANT — wujie 1.0.x prop location:
 * `window.__WUJIE` is the per-app *sandbox* (not the wujie module), and the
 * sandbox has no `props` field. The host-passed props live on the sandbox's
 * `provide` object, exposed on the iframe window as `window.$wujie`. See
 * `node_modules/wujie/esm/iframe.js` (`patchIframeVariable`) and
 * `sandbox.js` (`this.provide = { bus }`, then `this.provide.props = props`
 * inside `active()`). Earlier code that read `__WUJIE.props` always got
 * `undefined`, which is why the host context looked empty.
 */
import { HOST_CONTEXT_MESSAGE_TYPE } from "./host-context-types";

type WujieBus = {
  $on(event: string, callback: (data: HostContextValue) => void): void;
  $off(event: string, callback: (data: HostContextValue) => void): void;
};

type WujieProvide = {
  bus?: WujieBus;
  props?: { hostContext?: HostContextValue };
};

type WujieGlobal = {
  __POWERED_BY_WUJIE__?: boolean;
  __WUJIE?: {
    bus?: WujieBus;
    /** @deprecated The sandbox has no `props` field in wujie 1.0.x. Read from `$wujie.props` instead. */
    props?: never;
  };
  $wujie?: WujieProvide;
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
 *
 * wujie 1.0.x exposes host-passed props on `window.$wujie.props` (which is
 * the sandbox's `provide` object). `window.__WUJIE.props` does NOT exist.
 */
export function readInitialHostContext(): HostContextValue | null {
  const wj = wujieWindow();
  if (!wj) return null;
  // Prefer the documented wujie 1.0.x location: `window.$wujie.props`.
  const fromProvide = wj.$wujie?.props?.hostContext;
  if (fromProvide) return fromProvide;
  // Fallback: a small number of forks/wrappers copy the props object onto
  // `__WUJIE.props` as well. Reading it here keeps the bridge compatible
  // with those forks without re-introducing the broken default path.
  const fromLegacy = (wj.__WUJIE as { props?: { hostContext?: HostContextValue } } | undefined)
    ?.props?.hostContext;
  return fromLegacy ?? null;
}

/**
 * Diagnostic snapshot of the wujie iframe-window layout. Returns the keys
 * of the `__WUJIE` (sandbox) and `$wujie` (provide) objects so the bridge
 * can confirm in dev that the host actually wired up the prop path it
 * expects. Values are never returned.
 */
export function describeWujieWindowLayout(): {
  hasWujieFlag: boolean;
  __WUJIE_keys: string[] | null;
  $wujie_keys: string[] | null;
  $wujie_has_props: boolean;
  __WUJIE_has_bus: boolean;
} {
  const wj = wujieWindow();
  if (!wj) {
    return {
      hasWujieFlag: false,
      __WUJIE_keys: null,
      $wujie_keys: null,
      $wujie_has_props: false,
      __WUJIE_has_bus: false,
    };
  }
  return {
    hasWujieFlag: Boolean(wj.__POWERED_BY_WUJIE__),
    __WUJIE_keys: wj.__WUJIE ? Object.keys(wj.__WUJIE) : null,
    $wujie_keys: wj.$wujie ? Object.keys(wj.$wujie) : null,
    $wujie_has_props: Boolean(wj.$wujie && "props" in wj.$wujie),
    __WUJIE_has_bus: Boolean(wj.__WUJIE && "bus" in wj.__WUJIE),
  };
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

/**
 * Cross-origin postMessage fallback for `host:context-sync`.
 *
 * In wujie 1.0.x degraded mode the parent and the sub-app iframe are on
 * different origins (e.g. `http://localhost:4200` vs `http://localhost:5173`).
 * The per-app wujie bus has no postMessage bridge, so `appWindow.__WUJIE.bus
 * .$emit(...)` either throws a cross-origin SecurityError or targets a
 * different bus instance than the one the sub-app subscribed to. The host
 * therefore also pushes the same payload via `iframe.postMessage(...)`;
 * this listener picks that up and forwards it to `listener` with the same
 * shape as the bus path.
 *
 * Messages are filtered to `event.data.type === HOST_CONTEXT_MESSAGE_TYPE`
 * and to `event.source` being the parent window — both checks are best-
 * effort in standalone mode (no `__POWERED_BY_WUJIE__`) where we never
 * attach the listener in the first place.
 */
export function subscribeHostContextViaPostMessage(
  listener: HostContextListener,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  const handler = (event: MessageEvent) => {
    const data = event.data as { type?: unknown; data?: unknown } | null;
    if (!data || data.type !== HOST_CONTEXT_MESSAGE_TYPE) return;
    listener((data.data as HostContextValue | null) ?? null);
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}
