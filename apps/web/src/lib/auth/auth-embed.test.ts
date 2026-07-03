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
  setAuthToken,
} from "@/lib/auth/token-store";
import {
  applyMicroHostProps,
  resetMicroHostContextForTest,
} from "@/lib/host-context";
import type { HostContextValue } from "@/lib/host-context";

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
  resetMicroHostContextForTest();
  vi.useRealTimers();
});

function setMicroHostContext(hostContext: HostContextValue | null) {
  applyMicroHostProps({ hostContext });
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

  it("acquires the token from micro hostContext.userSession.Token", async () => {
    setLocation({});
    setMicroHostContext({
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
          AccessToken: "micro-access",
          ExpiresIn: 3600,
          RefreshToken: "micro-refresh",
        },
      },
    });

    const result = await acquireEmbedToken();

    expect(result).toBeNull();
    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "micro-access",
      refreshToken: "micro-refresh",
      expiresIn: 3600,
    });
  });

  it("prefers the URL token over the micro host context", async () => {
    setLocation({ search: "?token=from-url" });
    setMicroHostContext({
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
          AccessToken: "micro-access",
          ExpiresIn: 3600,
          RefreshToken: "micro-refresh",
        },
      },
    });

    const result = await acquireEmbedToken();

    expect(result).toBeNull();
    expect(getAccessToken()).toBe("from-url");
  });

  it("skips the micro host fallback when not running inside the micro host", async () => {
    setLocation({});
    simulateTopLevel();

    const result = await acquireEmbedToken();

    expect(result?.code).toBe("NO_TOKEN");
    expect(getAuthToken()).toBeNull();
  });

  it("waits for the host update when the micro context has no initial token", async () => {
    // The sub-app can mount before the MES host has a complete user session;
    // the real token may arrive later through qiankun `update(props)`.
    // `acquireEmbedToken` must hold here and accept the host update instead
    // of falling through to the EMBED_READY/EMBED_TOKEN postMessage
    // handshake (which the Angular host does not implement).
    setLocation({});
    setMicroHostContext(null);
    const parent = simulateIframeEmbedding();

    const promise = acquireEmbedToken();
    // Yield so `acquireEmbedToken` reaches `subscribeHostContext` and
    // registers its listener before the host update arrives.
    await Promise.resolve();

    setMicroHostContext({
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
          AccessToken: "from-update",
          ExpiresIn: 3600,
          RefreshToken: "from-update-refresh",
        },
      },
    });

    // The bridge module (not under test here) is normally what writes the
    // token in response to the host update, so simulate that write directly:
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "from-update",
      refreshToken: "from-update-refresh",
      expiresIn: 3600,
    });

    const result = await promise;
    expect(result).toBeNull();
    expect(getAuthToken()?.accessToken).toBe("from-update");
    // Must NEVER post EMBED_READY in micro host mode.
    expect(parent.posted).toEqual([]);
  });

  it("returns TIMEOUT when the micro host never pushes a valid context", async () => {
    vi.useFakeTimers();
    try {
      setLocation({});
      setMicroHostContext(null);
      const parent = simulateIframeEmbedding();

      const promise = acquireEmbedToken({ timeoutMs: 100 });
      await vi.advanceTimersByTimeAsync(100);
      const result = await promise;

      expect(result?.code).toBe("TIMEOUT");
      expect(result?.message).toContain("Micro host");
      // Still must NEVER fall through to postMessage in micro host mode.
      expect(parent.posted).toEqual([]);
    } finally {
      vi.useRealTimers();
    }
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
