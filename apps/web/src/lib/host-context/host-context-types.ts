/**
 * Host context shape mirrored from the Angular MES host.
 *
 * Keep field names byte-identical with the host's `WujieHostContext`
 * interface (see `rh-mes-frontend/.../wujie-host-context.service.ts`).
 * The host serializes this object into `window.__WUJIE.props.hostContext`
 * and re-emits it on the `host:context-sync` bus event whenever the user
 * session or i18n state changes.
 */

/** Language descriptor pushed alongside every context update. */
export interface HostLanguageInfo {
  /** Active locale code in the host's convention (e.g. "zh_CN", "en_US"). */
  currentLang: string;
  /** Fallback locale if no override is set. */
  defaultLang: string;
}

/**
 * Full context snapshot from the host. Use `unknown` for opaque payloads —
 * concrete typings live in the host and intentionally are not duplicated here.
 * Callers that need fields should narrow via type guards or local casts.
 */
export interface HostContextValue {
  /** Current logged-in user (host's `userSession.User`) or null when standalone. */
  userInfo: unknown | null;
  /** Flat menu tree the host has resolved for the current user. */
  menuInfo: unknown[];
  /** Function-level permissions for the current user. */
  functions: unknown[];
  /** Per-menu function permissions (intersection of menu + functions). */
  menuFunctions: unknown[];
  /** Roles assigned to the current user. */
  roles: unknown[];
  /** Active and default locales used by the host. */
  languageInfo: HostLanguageInfo;
  /** Raw i18n dictionary owned by the host (locale -> entries). */
  languageDict: Record<string, unknown>;
  /** Raw user session object (cookie/storage backed) or null when standalone. */
  userSession: unknown | null;
}

/** Bus event name the host uses to push fresh context to sub-apps. */
export const HOST_CONTEXT_EVENT = "host:context-sync";

/**
 * postMessage `type` field used by the cross-origin degraded-mode fallback.
 *
 * In wujie 1.0.x degraded mode the parent lives on a different origin from
 * the sub-app iframe (e.g. parent on `http://localhost:4200`, sub-app on
 * `http://localhost:5173`). The per-app wujie bus (`window.__WUJIE.bus`) is
 * a pure in-memory EventBus with no postMessage bridge, so the parent's
 * `targetWindow.__WUJIE.bus.$emit(...)` call either throws a cross-origin
 * SecurityError or targets a different bus instance than the sub-app
 * subscribed to. The host pushes the same payload via `postMessage` as a
 * fallback; the sub-app's bridge listens for both transports.
 */
export const HOST_CONTEXT_MESSAGE_TYPE = "host:context-sync";
