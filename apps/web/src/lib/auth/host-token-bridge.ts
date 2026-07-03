import {
  isRunningInMicroHost,
  readInitialHostContext,
  subscribeHostContext,
  type HostContextValue,
} from "@/lib/host-context";
import { mapHostSessionTokenToAuthToken } from "./host-token-adapter";
import { setAuthToken } from "./token-store";

/**
 * Bridges the micro host's `userSession.Token` (PascalCase
 * `RhUserAuthorizationDto`) into the local `token-store` (camelCase
 * `AuthToken`).
 *
 * The bridge runs at module import time: it reads whatever the host has
 * already pushed through qiankun props, persists it to localStorage, and
 * then subscribes to later host context updates so login state and token
 * rotation stay in sync.
 *
 * In standalone mode (before qiankun props arrive) the
 * bridge is a no-op and never touches localStorage — that keeps the
 * existing standalone login and MSW flows untouched.
 *
 * Lifecycle:
 * - `initHostTokenBridge()` — idempotent. Safe to call more than once.
 * - `disposeHostTokenBridge()` — releases the host-context subscription so
 *   a remount within the same module instance does not leak handlers.
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
    return;
  }

  // A null/invalid context is NOT a logout signal. A partial host update
  // during mount or remount must not erase a token the host already pushed
  // into localStorage and cause a spurious redirect to /login or
  // /embed/auth-error.
  //
  // Real logout must come from an explicit signal (e.g. a dedicated
  // bus event or a userSession payload with a `loggedOut: true` flag).
  // Until that contract exists, leave the previously-stored token alone.
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
  if (!isRunningInMicroHost()) {
    // Standalone mode: the bridge is intentionally inert so the existing
    // login flow and MSW mocking are unaffected.
    return;
  }

  initialized = true;
  applyHostContextToTokenStore(readInitialHostContext());
  unsubscribe = subscribeHostContext(applyHostContextToTokenStore);
}

/**
 * Release the host-context subscription and reset state. Does NOT clear
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
