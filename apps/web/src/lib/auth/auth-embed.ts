import { redirect } from "@tanstack/react-router";
import {
  isRunningInWujie,
  readInitialHostContext,
} from "@/lib/host-context";
import { mapHostSessionTokenToAuthToken } from "@/lib/auth/host-token-adapter";
import {
  setAccessToken,
  setAuthToken,
  type AuthToken,
} from "@/lib/auth/token-store";

// How long an embedded page waits for the host platform to deliver an
// `EMBED_TOKEN` postMessage before giving up.
export const EMBED_TOKEN_TIMEOUT_MS = 5_000;

// postMessage protocol constants — keep in sync with the host platform.
export const EMBED_READY_MESSAGE = "EMBED_READY";
export const EMBED_TOKEN_MESSAGE = "EMBED_TOKEN";
export const EMBED_ERROR_MESSAGE = "EMBED_ERROR";

// When this flag is on, `acquireEmbedToken` short-circuits to "success"
// without actually acquiring a token. Use it for the "ignore token and
// just show me the page" preview path on the embed error screen.
const EMBED_SKIP_AUTH_STORAGE_KEY = "embedSkipAuth";

export type EmbedReadyMessage = {
  type: typeof EMBED_READY_MESSAGE;
};

export type EmbedTokenMessage = {
  type: typeof EMBED_TOKEN_MESSAGE;
  token: string;
};

export type EmbedErrorCode =
  | "NO_TOKEN"
  | "PARSE_ERROR"
  | "TIMEOUT"
  | "PARENT_DISCONNECTED";

export type EmbedErrorMessage = {
  type: typeof EMBED_ERROR_MESSAGE;
  code: EmbedErrorCode;
  message: string;
};

export type EmbedAuthError = {
  code: EmbedErrorCode;
  message: string;
};

export type AcquireEmbedTokenOptions = {
  timeoutMs?: number;
};

export type HandleEmbedAuthOptions = AcquireEmbedTokenOptions & {
  // The path the user was trying to reach when the auth check failed.
  // Carried through the redirect so the error page can offer a "return
  // to that path" action.
  from?: string;
};

export function isEmbedSkipAuthEnabled(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.localStorage.getItem(EMBED_SKIP_AUTH_STORAGE_KEY) === "true";
}

export function setEmbedSkipAuth(enabled: boolean): void {
  if (typeof window === "undefined") {
    return;
  }
  if (enabled) {
    window.localStorage.setItem(EMBED_SKIP_AUTH_STORAGE_KEY, "true");
    return;
  }
  window.localStorage.removeItem(EMBED_SKIP_AUTH_STORAGE_KEY);
}

function parseJsonAuthToken(value: string): AuthToken | null {
  // Cheap pre-check so we don't run JSON.parse on a long opaque access token.
  if (!value.startsWith("{")) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      parsed !== null &&
      typeof parsed === "object" &&
      typeof (parsed as Record<string, unknown>).tokenType === "string" &&
      typeof (parsed as Record<string, unknown>).accessToken === "string" &&
      typeof (parsed as Record<string, unknown>).refreshToken === "string" &&
      typeof (parsed as Record<string, unknown>).expiresIn === "number"
    ) {
      return parsed as AuthToken;
    }
  } catch {
    return null;
  }

  return null;
}

export function applyEmbedToken(rawToken: string): EmbedAuthError | null {
  if (rawToken.length === 0) {
    return { code: "PARSE_ERROR", message: "Token value is empty" };
  }

  const parsed = parseJsonAuthToken(rawToken);
  if (parsed) {
    setAuthToken(parsed);
    return null;
  }

  setAccessToken(rawToken);
  return null;
}

export function readEmbedTokenFromLocation(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  const fromSearch = params.get("token");
  if (fromSearch !== null) {
    return fromSearch;
  }

  // Fall back to the URL hash so the host platform can keep the token out
  // of server-side access logs.
  const hash = window.location.hash;
  if (hash.length > 1) {
    const hashParams = new URLSearchParams(hash.slice(1));
    const fromHash = hashParams.get("token");
    if (fromHash !== null) {
      return fromHash;
    }
  }

  return null;
}

export function isEmbeddedInIframe(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    return window.parent !== null && window.parent !== window;
  } catch {
    // Cross-origin parent raises on access — that is itself evidence of an
    // iframe context, so treat it as embedded.
    return true;
  }
}

export function notifyParentReady(): void {
  if (!isEmbeddedInIframe()) {
    return;
  }

  const message: EmbedReadyMessage = { type: EMBED_READY_MESSAGE };
  window.parent.postMessage(message, "*");
}

export function notifyParentError(error: EmbedAuthError): void {
  if (!isEmbeddedInIframe()) {
    return;
  }

  const message: EmbedErrorMessage = {
    type: EMBED_ERROR_MESSAGE,
    code: error.code,
    message: error.message,
  };
  window.parent.postMessage(message, "*");
}

type AcquireResult = EmbedAuthError | null;

export function acquireEmbedTokenViaPostMessage(
  timeoutMs: number = EMBED_TOKEN_TIMEOUT_MS,
): Promise<AcquireResult> {
  return new Promise((resolve) => {
    if (!isEmbeddedInIframe()) {
      resolve({
        code: "PARENT_DISCONNECTED",
        message: "Not running inside an iframe",
      });
      return;
    }

    let settled = false;

    const onMessage = (event: MessageEvent) => {
      if (settled) {
        return;
      }
      const data = event.data as { type?: unknown; token?: unknown } | null;
      if (!data || data.type !== EMBED_TOKEN_MESSAGE) {
        return;
      }
      if (typeof data.token !== "string") {
        return;
      }
      settled = true;
      clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(applyEmbedToken(data.token));
    };

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      window.removeEventListener("message", onMessage);
      resolve({
        code: "TIMEOUT",
        message: `Host platform did not deliver an EMBED_TOKEN within ${timeoutMs}ms`,
      });
    }, timeoutMs);

    window.addEventListener("message", onMessage);
    window.parent.postMessage(
      { type: EMBED_READY_MESSAGE } satisfies EmbedReadyMessage,
      "*",
    );
  });
}

export async function acquireEmbedToken(
  options: AcquireEmbedTokenOptions = {},
): Promise<AcquireResult> {
  if (isEmbedSkipAuthEnabled()) {
    return null;
  }

  const urlToken = readEmbedTokenFromLocation();
  if (urlToken !== null) {
    return applyEmbedToken(urlToken);
  }

  // Wujie parent apps push the auth payload via `__WUJIE.props.hostContext`
  // and the `host:context-sync` bus event — not via `postMessage`. When the
  // URL carries no token we consult the host context as the next source
  // before falling back to the postMessage handshake (which would time out
  // for wujie parents). `host-token-bridge` is responsible for the
  // long-running bus subscription; this synchronous check here guarantees
  // the initial mount populates localStorage before the route guard
  // resolves.
  if (isRunningInWujie()) {
    const ctx = readInitialHostContext();
    const token = ctx
      ? mapHostSessionTokenToAuthToken(ctx.userSession)
      : null;
    if (token) {
      setAuthToken(token);
      return null;
    }
  }

  if (!isEmbeddedInIframe()) {
    return {
      code: "NO_TOKEN",
      message: "No token in URL and not running inside an iframe",
    };
  }

  return acquireEmbedTokenViaPostMessage(options.timeoutMs);
}

export async function handleEmbedAuth(
  options: HandleEmbedAuthOptions = {},
): Promise<void> {
  const result = await acquireEmbedToken(options);
  if (result === null) {
    return;
  }

  notifyParentError(result);
  throw redirect({
    to: "/embed/auth-error",
    search: {
      embedError: result.code,
      from: options.from,
    },
  });
}
