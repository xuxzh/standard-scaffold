import { afterEach, describe, expect, it, vi } from "vitest";
import {
  acquireEmbedToken,
  acquireEmbedTokenViaPostMessage,
  applyEmbedToken,
  EMBED_READY_MESSAGE,
  EMBED_TOKEN_MESSAGE,
  handleEmbedAuth,
  isEmbeddedInIframe,
  isEmbedSkipAuthEnabled,
  readEmbedTokenFromLocation,
  setEmbedSkipAuth,
} from "@/lib/auth/auth-embed";
import {
  getAccessToken,
  getAuthToken,
} from "@/lib/auth/token-store";

const originalLocation = window.location;

afterEach(() => {
  localStorage.clear();
  // Restore a clean window.history / window.parent between cases.
  if (Object.getOwnPropertyDescriptor(window, "location")?.writable === true) {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  }
  // Wipe any wujie globals left over from host-context fallback tests.
  delete (window as unknown as { __POWERED_BY_WUJIE__?: unknown })
    .__POWERED_BY_WUJIE__;
  delete (window as unknown as { __WUJIE__?: unknown }).__WUJIE__;
  vi.useRealTimers();
});

/**
 * Stand in for the wujie iframe globals. The bridge code reads
 * `__POWERED_BY_WUJIE__` and `__WUJIE.props.hostContext`; we do not need
 * the bus here because `acquireEmbedToken` only consults the initial
 * `props.hostContext` synchronously.
 */
function setWujieGlobals(hostContext: unknown) {
  Object.defineProperty(window, "__POWERED_BY_WUJIE__", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window, "__WUJIE", {
    configurable: true,
    value: {
      __POWERED_BY_WUJIE__: true,
      props: { hostContext },
      bus: { $on: vi.fn(), $off: vi.fn(), $emit: vi.fn() },
    },
  });
}

function setLocation({ search = "", hash = "" }: { search?: string; hash?: string }) {
  const next = {
    ...originalLocation,
    search,
    hash,
    pathname: "/embed/packaging/packaging-type",
  };
  Object.defineProperty(window, "location", {
    configurable: true,
    value: next,
  });
}

function simulateIframeEmbedding() {
  // jsdom returns `window.parent === window`. Substitute a sentinel parent
  // that satisfies `isEmbeddedInIframe` and captures postMessage calls.
  const parent = {
    posted: [] as unknown[],
    postMessage(message: unknown) {
      this.posted.push(message);
    },
  };
  Object.defineProperty(window, "parent", {
    configurable: true,
    value: parent,
  });
  return parent;
}

function simulateTopLevel() {
  Object.defineProperty(window, "parent", {
    configurable: true,
    value: window,
  });
}

describe("applyEmbedToken", () => {
  it("persists a JSON-encoded full AuthToken via setAuthToken", () => {
    const result = applyEmbedToken(
      JSON.stringify({
        tokenType: "Bearer",
        accessToken: "access-1",
        refreshToken: "refresh-1",
        expiresIn: 3600,
      }),
    );

    expect(result).toBeNull();
    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 3600,
    });
  });

  it("falls back to setAccessToken for a plain string token", () => {
    const result = applyEmbedToken("opaque-access-token");

    expect(result).toBeNull();
    expect(getAccessToken()).toBe("opaque-access-token");
    // No refresh token or token type should leak from a previous full token.
    expect(getAuthToken()).toBeNull();
  });

  it("returns PARSE_ERROR for an empty string", () => {
    const result = applyEmbedToken("");

    expect(result).toEqual({ code: "PARSE_ERROR", message: expect.any(String) });
  });
});

describe("readEmbedTokenFromLocation", () => {
  it("reads the token from the URL search parameters", () => {
    setLocation({ search: "?token=from-search" });

    expect(readEmbedTokenFromLocation()).toBe("from-search");
  });

  it("falls back to the URL hash when search params are absent", () => {
    setLocation({ hash: "#token=from-hash" });

    expect(readEmbedTokenFromLocation()).toBe("from-hash");
  });

  it("prefers the search parameter over the hash", () => {
    setLocation({ search: "?token=from-search", hash: "#token=from-hash" });

    expect(readEmbedTokenFromLocation()).toBe("from-search");
  });

  it("returns null when neither location has a token", () => {
    setLocation({});

    expect(readEmbedTokenFromLocation()).toBeNull();
  });
});

describe("isEmbeddedInIframe", () => {
  it("detects iframe embedding when window.parent differs", () => {
    simulateIframeEmbedding();

    expect(isEmbeddedInIframe()).toBe(true);
  });

  it("returns false when running as a top-level window", () => {
    simulateTopLevel();

    expect(isEmbeddedInIframe()).toBe(false);
  });
});

describe("acquireEmbedToken", () => {
  it("uses the URL token without consulting the parent", async () => {
    setLocation({ search: "?token=from-url" });

    const result = await acquireEmbedToken();

    expect(result).toBeNull();
    expect(getAccessToken()).toBe("from-url");
  });

  it("returns NO_TOKEN when the URL has no token and the page is top-level", async () => {
    setLocation({});
    simulateTopLevel();

    const result = await acquireEmbedToken();

    expect(result?.code).toBe("NO_TOKEN");
    expect(getAccessToken()).toBeNull();
  });

  it("short-circuits to success when the skip-auth flag is enabled", async () => {
    setLocation({});
    simulateTopLevel();
    setEmbedSkipAuth(true);

    const result = await acquireEmbedToken();

    expect(result).toBeNull();
    expect(getAccessToken()).toBeNull();
  });

  it("falls back to postMessage when running inside an iframe", async () => {
    setLocation({});
    const parent = simulateIframeEmbedding();

    const promise = acquireEmbedToken();
    // Drain the microtask queue so the EMBED_READY postMessage has been sent.
    await Promise.resolve();
    expect(parent.posted).toContainEqual({ type: EMBED_READY_MESSAGE });

    window.postMessage(
      { type: EMBED_TOKEN_MESSAGE, token: "iframe-token" },
      "*",
    );

    const result = await promise;
    expect(result).toBeNull();
    expect(getAccessToken()).toBe("iframe-token");
  });

  it("ignores postMessages whose type is not EMBED_TOKEN", async () => {
    setLocation({});
    simulateIframeEmbedding();

    vi.useFakeTimers();
    const promise = acquireEmbedToken({ timeoutMs: 100 });

    window.postMessage({ type: "SOMETHING_ELSE", token: "ignored" }, "*");

    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result?.code).toBe("TIMEOUT");
  });

  it("returns TIMEOUT when the host platform never delivers a token", async () => {
    setLocation({});
    simulateIframeEmbedding();

    vi.useFakeTimers();
    const promise = acquireEmbedToken({ timeoutMs: 200 });

    await vi.advanceTimersByTimeAsync(200);
    const result = await promise;
    expect(result?.code).toBe("TIMEOUT");
  });

  it("acquires the token from wujie hostContext.userSession.Token", async () => {
    setLocation({});
    setWujieGlobals({
      userInfo: null,
      menuInfo: [],
      functions: [],
      menuFunctions: [],
      roles: [],
      languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
      languageDict: {},
      userSession: {
        Token: {
          TokenType: "Bearer",
          AccessToken: "wujie-access",
          ExpiresIn: 3600,
          RefreshToken: "wujie-refresh",
        },
      },
    });

    const result = await acquireEmbedToken();

    expect(result).toBeNull();
    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "wujie-access",
      refreshToken: "wujie-refresh",
      expiresIn: 3600,
    });
  });

  it("prefers the URL token over the wujie host context", async () => {
    setLocation({ search: "?token=from-url" });
    setWujieGlobals({
      userInfo: null,
      menuInfo: [],
      functions: [],
      menuFunctions: [],
      roles: [],
      languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
      languageDict: {},
      userSession: {
        Token: {
          TokenType: "Bearer",
          AccessToken: "wujie-access",
          ExpiresIn: 3600,
          RefreshToken: "wujie-refresh",
        },
      },
    });

    const result = await acquireEmbedToken();

    expect(result).toBeNull();
    expect(getAccessToken()).toBe("from-url");
  });

  it("skips the wujie fallback when not running inside wujie", async () => {
    setLocation({});
    simulateTopLevel();
    // No __POWERED_BY_WUJIE__ and no __WUJIE.

    const result = await acquireEmbedToken();

    expect(result?.code).toBe("NO_TOKEN");
    expect(getAuthToken()).toBeNull();
  });

  it("falls through to the postMessage handshake when the wujie context has no token", async () => {
    setLocation({});
    setWujieGlobals({
      userInfo: null,
      menuInfo: [],
      functions: [],
      menuFunctions: [],
      roles: [],
      languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
      languageDict: {},
      userSession: null,
    });
    const parent = simulateIframeEmbedding();

    const promise = acquireEmbedToken();
    await Promise.resolve();
    expect(parent.posted).toContainEqual({ type: EMBED_READY_MESSAGE });
    window.postMessage(
      { type: EMBED_TOKEN_MESSAGE, token: "postmsg-token" },
      "*",
    );

    const result = await promise;
    expect(result).toBeNull();
    expect(getAccessToken()).toBe("postmsg-token");
  });
});

describe("acquireEmbedTokenViaPostMessage", () => {
  it("returns PARENT_DISCONNECTED when not embedded in an iframe", async () => {
    simulateTopLevel();

    const result = await acquireEmbedTokenViaPostMessage();

    expect(result?.code).toBe("PARENT_DISCONNECTED");
  });
});

describe("handleEmbedAuth", () => {
  it("resolves silently when a token is acquired", async () => {
    setLocation({ search: "?token=ok" });

    await expect(handleEmbedAuth()).resolves.toBeUndefined();
  });

  it("throws a redirect to /embed/auth-error when acquisition fails", async () => {
    setLocation({});
    simulateTopLevel();

    await expect(handleEmbedAuth()).rejects.toMatchObject({
      options: { to: "/embed/auth-error" },
    });
  });

  it("passes the `from` path through to the redirect search", async () => {
    setLocation({});
    simulateTopLevel();

    await expect(
      handleEmbedAuth({ from: "/embed/packaging/packaging-type" }),
    ).rejects.toMatchObject({
      options: {
        to: "/embed/auth-error",
        search: { from: "/embed/packaging/packaging-type" },
      },
    });
  });

  it("resolves silently when the skip-auth flag is enabled", async () => {
    setLocation({});
    simulateTopLevel();
    setEmbedSkipAuth(true);

    await expect(handleEmbedAuth()).resolves.toBeUndefined();
  });
});

describe("isEmbedSkipAuthEnabled / setEmbedSkipAuth", () => {
  it("defaults to false and toggles on/off", () => {
    expect(isEmbedSkipAuthEnabled()).toBe(false);

    setEmbedSkipAuth(true);
    expect(isEmbedSkipAuthEnabled()).toBe(true);

    setEmbedSkipAuth(false);
    expect(isEmbedSkipAuthEnabled()).toBe(false);
  });
});
