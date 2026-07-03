import { afterEach, describe, expect, it, vi } from "vitest";
import {
  disposeHostTokenBridge,
  initHostTokenBridge,
} from "@/lib/auth/host-token-bridge";
import { getAuthToken } from "@/lib/auth/token-store";
import {
  applyMicroHostProps,
  resetMicroHostContextForTest,
} from "@/lib/host-context";
import type { HostContextValue } from "@/lib/host-context";

function makeHostContext(accessToken: string): HostContextValue {
  return {
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
        AccessToken: accessToken,
        ExpiresIn: 3600,
        RefreshToken: `${accessToken}-refresh`,
      },
    },
  };
}

function makeSessionlessContext(): HostContextValue {
  return {
    userInfo: null,
    menuInfo: [],
    functions: [],
    menuFunctions: [],
    roles: [],
    languageInfo: { currentLang: "zh-CN", defaultLang: "zh-CN" },
    languageDict: {},
    userSession: null,
  };
}

function setMicroHostContext(hostContext: HostContextValue | null) {
  applyMicroHostProps({ hostContext });
}

afterEach(() => {
  disposeHostTokenBridge();
  localStorage.clear();
  vi.restoreAllMocks();
  resetMicroHostContextForTest();
});

describe("initHostTokenBridge", () => {
  it("writes the host context token to localStorage at init", () => {
    setMicroHostContext(makeHostContext("access-bridge"));

    initHostTokenBridge();

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "access-bridge",
      refreshToken: "access-bridge-refresh",
      expiresIn: 3600,
    });
  });

  it("keeps localStorage unchanged when the host context carries no token", () => {
    localStorage.setItem("accessToken", "stale");
    setMicroHostContext(makeSessionlessContext());

    initHostTokenBridge();

    expect(localStorage.getItem("accessToken")).toBe("stale");
    expect(getAuthToken()).toBeNull();
  });

  it("does nothing when running outside the micro host", () => {
    initHostTokenBridge();

    expect(getAuthToken()).toBeNull();
  });

  it("is idempotent: repeated init keeps a single active bridge", () => {
    setMicroHostContext(makeHostContext("v1"));
    initHostTokenBridge();
    initHostTokenBridge();
    initHostTokenBridge();

    setMicroHostContext(makeHostContext("v2"));

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "v2",
      refreshToken: "v2-refresh",
      expiresIn: 3600,
    });
  });
});

describe("initHostTokenBridge -> micro host updates", () => {
  it("updates localStorage when the host pushes a new context", () => {
    setMicroHostContext(makeHostContext("v1"));
    initHostTokenBridge();

    setMicroHostContext(makeHostContext("v2"));

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "v2",
      refreshToken: "v2-refresh",
      expiresIn: 3600,
    });
  });

  it("keeps the existing token when the host pushes a session-less context", () => {
    setMicroHostContext(makeHostContext("before-logout"));
    initHostTokenBridge();

    setMicroHostContext(makeSessionlessContext());

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "before-logout",
      refreshToken: "before-logout-refresh",
      expiresIn: 3600,
    });
  });
});

describe("disposeHostTokenBridge", () => {
  it("releases the subscription and stops updating localStorage", () => {
    setMicroHostContext(makeHostContext("initial"));
    initHostTokenBridge();

    disposeHostTokenBridge();
    setMicroHostContext(makeHostContext("after-dispose"));

    expect(getAuthToken()?.accessToken).toBe("initial");

    initHostTokenBridge();
    expect(getAuthToken()?.accessToken).toBe("after-dispose");
  });
});
