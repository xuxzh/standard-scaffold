import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyMicroHostProps,
  isRunningInMicroHost,
  readInitialHostContext,
  resetMicroHostContextForTest,
  subscribeHostContext,
} from "./host-context-source";
import type { HostContextValue } from "./host-context-types";

function makeContext(currentLang: string): HostContextValue {
  return {
    userInfo: null,
    menuInfo: [],
    functions: [],
    menuFunctions: [],
    roles: [],
    languageInfo: {
      currentLang,
      defaultLang: "zh_CN",
    },
    languageDict: {},
    userSession: null,
  };
}

describe("host-context-source micro host store", () => {
  afterEach(() => {
    resetMicroHostContextForTest();
  });

  it("reports standalone before qiankun props are applied", () => {
    expect(isRunningInMicroHost()).toBe(false);
    expect(readInitialHostContext()).toBeNull();
  });

  it("stores the latest hostContext from qiankun props", () => {
    const ctx = makeContext("en_US");

    applyMicroHostProps({
      hostContext: ctx,
      initialPath: "/embed/packaging/packaging-type",
    });

    expect(isRunningInMicroHost()).toBe(true);
    expect(readInitialHostContext()).toBe(ctx);
  });

  it("notifies subscribers when qiankun props update", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHostContext(listener);
    const ctx = makeContext("vi_VN");

    applyMicroHostProps({ hostContext: ctx });

    expect(listener).toHaveBeenCalledWith(ctx);
    unsubscribe();
    applyMicroHostProps({ hostContext: makeContext("zh_CN") });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
