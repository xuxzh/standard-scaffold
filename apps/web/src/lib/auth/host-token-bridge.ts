import {
  isRunningInWujie,
  readInitialHostContext,
  subscribeHostContext,
  type HostContextValue,
} from "@/lib/host-context";
import { mapHostSessionTokenToAuthToken } from "./host-token-adapter";
import { clearAuthToken, setAuthToken } from "./token-store";

/**
 * Bridges the wujie host's `userSession.Token` (PascalCase
 * `RhUserAuthorizationDto`) into the local `token-store` (camelCase
 * `AuthToken`).
 *
 * The bridge runs at module import time: it reads whatever the host has
 * already pushed via `__WUJIE.props.hostContext`, persists it to
 * localStorage, and then subscribes to the `host:context-sync` wujie bus
 * event so subsequent pushes (login, token rotation, logout) stay in
 * sync. By the time `embedLayoutRoute.beforeLoad` runs the token is
 * already in localStorage and `requireAuth` does not trip.
 *
 * In standalone mode (no `__POWERED_BY_WUJIE__` on the iframe window) the
 * bridge is a no-op and never touches localStorage — that keeps the
 * existing standalone login and MSW flows untouched.
 *
 * Lifecycle:
 * - `initHostTokenBridge()` — idempotent. Safe to call more than once.
 * - `disposeHostTokenBridge()` — releases the bus subscription. Wujie's
 *   `__WUJIE_UNMOUNT__` calls this so a remount within the same module
 *   instance does not leak handlers.
 */

let unsubscribe: (() => void) | null = null;
let initialized = false;

/**
 * Apply a host context snapshot to localStorage. A valid token replaces
 * the previous one; a missing/empty token clears it. Idempotent for
 * identical inputs.
 */
function applyHostContextToTokenStore(ctx: HostContextValue | null): void {
  const token = ctx
    ? mapHostSessionTokenToAuthToken(ctx.userSession)
    : null;
  if (token) {
    setAuthToken(token);
  } else {
    clearAuthToken();
  }
}

/**
 * Idempotently attach the host-context → token-store bridge. Safe to call
 * from anywhere; subsequent calls without an intervening `dispose` are
 * no-ops so dev HMR cannot stack subscriptions.
 */
export function initHostTokenBridge(): void {
  if (initialized) {
    return;
  }
  if (!isRunningInWujie()) {
    // Standalone mode: the bridge is intentionally inert so the existing
    // login flow and MSW mocking are unaffected.
    return;
  }

  initialized = true;
  applyHostContextToTokenStore(readInitialHostContext());
  unsubscribe = subscribeHostContext(applyHostContextToTokenStore);
}

/**
 * Release the bus subscription and reset state. Does NOT clear
 * localStorage — teardown is not logout. Callers that want a hard reset
 * should follow up with `clearAuthToken()` themselves.
 */
export function disposeHostTokenBridge(): void {
  unsubscribe?.();
  unsubscribe = null;
  initialized = false;
}

// Side-effect: import this module for its bridge to attach.
initHostTokenBridge();
