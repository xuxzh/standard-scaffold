import { afterEach, describe, expect, it, vi } from "vitest";
import {
  disposeHostTokenBridge,
  initHostTokenBridge,
} from "@/lib/auth/host-token-bridge";
import { getAuthToken } from "@/lib/auth/token-store";

type BusListener = (data: unknown) => void;

function setWujieWindow(value: {
  hostContext?: unknown;
  busListeners?: BusListener[];
}) {
  const listeners = value.busListeners ?? [];
  Object.defineProperty(window, "__POWERED_BY_WUJIE__", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(window, "__WUJIE", {
    configurable: true,
    value: {
      __POWERED_BY_WUJIE__: true,
      props: value.hostContext !== undefined ? { hostContext: value.hostContext } : {},
      bus: {
        $on: vi.fn((_event: string, handler: BusListener) => {
          listeners.push(handler);
        }),
        $off: vi.fn((_event: string, handler: BusListener) => {
          const idx = listeners.indexOf(handler);
          if (idx >= 0) {
            listeners.splice(idx, 1);
          }
        }),
        $emit: vi.fn(),
      },
    },
  });
  return listeners;
}

function clearWujieWindow() {
  // `configurable: true` lets us delete-then-redefine to fully reset state
  // between tests, mirroring the `simulateIframeEmbedding` pattern used
  // in `auth-embed.test.ts`.
  delete (window as unknown as { __POWERED_BY_WUJIE__?: unknown })
    .__POWERED_BY_WUJIE__;
  delete (window as unknown as { __WUJIE__?: unknown }).__WUJIE__;
}

afterEach(() => {
  disposeHostTokenBridge();
  localStorage.clear();
  vi.restoreAllMocks();
  clearWujieWindow();
});

describe("initHostTokenBridge", () => {
  it("writes the host context token to localStorage at init", () => {
    setWujieWindow({
      hostContext: {
        userInfo: null,
        menuInfo: [],
        functions: [],
        menuFunctions: [],
        roles: [],
        languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
        languageDict: {},
        userSession: {
          User: { Id: 1, UserName: "alice" },
          Token: {
            TokenType: "Bearer",
            AccessToken: "access-bridge",
            ExpiresIn: 3600,
            RefreshToken: "refresh-bridge",
          },
        },
      },
    });

    initHostTokenBridge();

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "access-bridge",
      refreshToken: "refresh-bridge",
      expiresIn: 3600,
    });
  });

  it("clears localStorage when the host context carries no token", () => {
    localStorage.setItem("accessToken", "stale");
    setWujieWindow({
      hostContext: {
        userInfo: null,
        menuInfo: [],
        functions: [],
        menuFunctions: [],
        roles: [],
        languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
        languageDict: {},
        userSession: null,
      },
    });

    initHostTokenBridge();

    expect(getAuthToken()).toBeNull();
  });

  it("does nothing when running outside wujie", () => {
    // No `__POWERED_BY_WUJIE__` and no `__WUJIE` global.

    initHostTokenBridge();

    expect(getAuthToken()).toBeNull();
  });

  it("is idempotent: a second init does not re-attach a second listener", () => {
    const listeners = setWujieWindow({
      hostContext: {
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
            AccessToken: "a",
            ExpiresIn: 1,
            RefreshToken: "r",
          },
        },
      },
    });

    initHostTokenBridge();
    initHostTokenBridge();
    initHostTokenBridge();

    expect(listeners).toHaveLength(1);
  });
});

describe("initHostTokenBridge → bus subscription", () => {
  it("updates localStorage when the host pushes a new context", () => {
    const listeners = setWujieWindow({
      hostContext: {
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
            AccessToken: "v1",
            ExpiresIn: 1,
            RefreshToken: "rv1",
          },
        },
      },
    });
    initHostTokenBridge();

    listeners[0]?.({
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
          AccessToken: "v2",
          ExpiresIn: 2,
          RefreshToken: "rv2",
        },
      },
    });

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "v2",
      refreshToken: "rv2",
      expiresIn: 2,
    });
  });

  it("clears localStorage when the host pushes a session-less context", () => {
    const listeners = setWujieWindow({
      hostContext: {
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
            AccessToken: "before-logout",
            ExpiresIn: 1,
            RefreshToken: "r",
          },
        },
      },
    });
    initHostTokenBridge();

    listeners[0]?.({
      userInfo: null,
      menuInfo: [],
      functions: [],
      menuFunctions: [],
      roles: [],
      languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
      languageDict: {},
      userSession: null,
    });

    expect(getAuthToken()).toBeNull();
  });
});

describe("disposeHostTokenBridge", () => {
  it("releases the bus subscription and stops updating localStorage", () => {
    const listeners = setWujieWindow({
      hostContext: {
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
            AccessToken: "initial",
            ExpiresIn: 1,
            RefreshToken: "r",
          },
        },
      },
    });
    initHostTokenBridge();

    disposeHostTokenBridge();
    expect(listeners).toHaveLength(0);

    // After dispose, a fresh init re-attaches and re-reads the initial
    // host context — even if the host has not pushed an update through
    // the (now detached) subscription.
    initHostTokenBridge();
    expect(getAuthToken()?.accessToken).toBe("initial");
  });
});
