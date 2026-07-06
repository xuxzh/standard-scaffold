import {
  describeWujieWindowLayout,
  isRunningInWujie,
  readInitialHostContext,
  subscribeHostContext,
  subscribeHostContextViaPostMessage,
  type HostContextValue,
} from "@/lib/host-context";
import { mapHostSessionTokenToAuthToken } from "./host-token-adapter";
import { setAuthToken } from "./token-store";

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

// ---------------------------------------------------------------------------
// Dev-only diagnostics. `import.meta.env.DEV` is `true` under `vite dev`
// and Vitest, `undefined`/falsy under `vite build`. The `typeof` guard keeps
// the module importable in non-Vite contexts (e.g. plain Node) without
// throwing at module-load time.
// ---------------------------------------------------------------------------
const isDev = (() => {
  try {
    return Boolean(
      (import.meta as { env?: { DEV?: boolean } }).env?.DEV,
    );
  } catch {
    return false;
  }
})();

function diagLog(...args: unknown[]): void {
  if (!isDev) return;
  // eslint-disable-next-line no-console
  console.log("[wujie-bridge]", ...args);
}

type UserSessionTokenShape = {
  Token?: {
    TokenType?: unknown;
    AccessToken?: unknown;
    ExpiresIn?: unknown;
    RefreshToken?: unknown;
  };
};

function summarizeTokenShape(userSession: unknown): Record<string, unknown> {
  const token = (userSession as UserSessionTokenShape | null | undefined)?.Token;
  if (!token || typeof token !== "object") {
    return { hasToken: false };
  }
  return {
    hasToken: true,
    TokenType: typeof token.TokenType,
    AccessToken: typeof token.AccessToken,
    ExpiresIn: typeof token.ExpiresIn,
    RefreshToken: typeof token.RefreshToken,
  };
}

let unsubscribe: (() => void) | null = null;
let unsubscribePostMessage: (() => void) | null = null;
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

  // A null/invalid context is NOT a logout signal. Under wujie's
  // preload→mount lifecycle the sub-app's JS can re-evaluate in a fresh
  // sandbox after the host has already emitted `host:context-sync`; that
  // second sandbox sees no initial host context and no follow-up bus
  // push. Clearing the token here would erase a token a previous sandbox
  // (or the host's earlier push) just wrote into the shared localStorage
  // and cause a spurious redirect to /login or /embed/auth-error.
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
  if (!isRunningInWujie()) {
    // Standalone mode: the bridge is intentionally inert so the existing
    // login flow and MSW mocking are unaffected.
    diagLog("not running inside wujie; bridge is inert");
    return;
  }

  initialized = true;
  // Surface the wujie iframe-window layout so the dev console makes it
  // obvious which prop path the host actually wired up. `__WUJIE` is the
  // per-app sandbox, `$wujie` is the sandbox's `provide` object — the
  // wujie 1.0.x location of the host-passed props is `$wujie.props`, NOT
  // `__WUJIE.props`. We only print the keys, never the values.
  diagLog("wujie window layout", describeWujieWindowLayout());
  const initialCtx = readInitialHostContext();
  diagLog("wujie detected; initial host context snapshot", {
    hasHostContext: initialCtx !== null,
    userSession: initialCtx
      ? summarizeTokenShape(initialCtx.userSession)
      : null,
  });
  applyHostContextToTokenStore(initialCtx);

  unsubscribe = subscribeHostContext((ctx) => {
    diagLog("host:context-sync received (wujie bus)", {
      hasHostContext: ctx !== null,
      userSession: ctx ? summarizeTokenShape(ctx.userSession) : null,
    });
    applyHostContextToTokenStore(ctx);
  });
  // Cross-origin degraded-mode fallback: wujie 1.0.x's per-app bus is a
  // pure in-memory EventBus with no postMessage bridge, so a parent on
  // http://localhost:4200 emitting into an http://localhost:5173 iframe
  // never reaches the bus. The host additionally posts the same payload
  // via `iframe.postMessage(...)`; we listen for that here. The listener
  // is a no-op outside wujie (the postMessage filter on `event.data.type`
  // requires the documented payload shape, which only the host produces).
  unsubscribePostMessage = subscribeHostContextViaPostMessage((ctx) => {
    diagLog("host:context-sync received (postMessage)", {
      hasHostContext: ctx !== null,
      userSession: ctx ? summarizeTokenShape(ctx.userSession) : null,
    });
    applyHostContextToTokenStore(ctx);
  });
  diagLog("bridge initialized; bus + postMessage listeners registered");

  // Defensive retry: some wujie configurations inject `__WUJIE.props`
  // asynchronously (after the sub-app's main script has already begun
  // executing). When that happens the first read above sees `null` and
  // the only mechanism left is the bus. A single `setTimeout(0)` retry
  // covers the common case where the polyfill lands on the next tick.
  // We deliberately do NOT clear localStorage on this retry — see the
  // comment in `applyHostContextToTokenStore` for why a null context
  // is not a logout signal.
  if (initialCtx === null) {
    setTimeout(() => {
      if (!isRunningInWujie()) return;
      const late = readInitialHostContext();
      if (late !== null && late !== initialCtx) {
        diagLog("late host context appeared on retry", {
          userSession: summarizeTokenShape(late.userSession),
        });
        applyHostContextToTokenStore(late);
      }
    }, 0);
  }
}

/**
 * Release the bus subscription and reset state. Does NOT clear
 * localStorage — teardown is not logout. Callers that want a hard reset
 * should follow up with `clearAuthToken()` themselves.
 */
export function disposeHostTokenBridge(): void {
  unsubscribe?.();
  unsubscribe = null;
  unsubscribePostMessage?.();
  unsubscribePostMessage = null;
  initialized = false;
}

// Side-effect: import this module for its bridge to attach.
initHostTokenBridge();
