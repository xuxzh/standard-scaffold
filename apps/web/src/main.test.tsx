import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { HostContextValue, MicroHostProps } from "@/lib/host-context";

const mocks = vi.hoisted(() => ({
  app: vi.fn(() => null),
  disposeHostTokenBridge: vi.fn(),
  isApiMockingEnabled: vi.fn(() => false),
}));

const rootInstances: Array<{
  render: ReturnType<typeof vi.fn>;
  unmount: ReturnType<typeof vi.fn>;
}> = [];

const createRootMock = vi.fn(() => {
  const root = {
    render: vi.fn(),
    unmount: vi.fn(),
  };
  rootInstances.push(root);
  return root;
});

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

vi.mock("@/lib/auth/host-token-bridge", () => ({
  disposeHostTokenBridge: mocks.disposeHostTokenBridge,
}));

vi.mock("./mocks/config", () => ({
  isApiMockingEnabled: mocks.isApiMockingEnabled,
}));

vi.mock("./root-app", () => ({
  App: mocks.app,
}));

type QiankunTestWindow = Window & {
  __POWERED_BY_QIANKUN__?: boolean;
};

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

function latestInitialEntries(): string[] | undefined {
  const renderedTree = rootInstances.at(-1)?.render.mock.calls.at(-1)?.[0];
  return renderedTree?.props?.children?.props?.initialEntries;
}

async function readHostContext() {
  const { readInitialHostContext } = await import("@/lib/host-context");
  return readInitialHostContext();
}

async function resetHostContext() {
  const { resetMicroHostContextForTest } = await import("@/lib/host-context");
  resetMicroHostContextForTest();
}

describe("main qiankun bootstrap", () => {
  beforeEach(async () => {
    vi.resetModules();
    createRootMock.mockClear();
    mocks.app.mockClear();
    mocks.disposeHostTokenBridge.mockClear();
    mocks.isApiMockingEnabled.mockReturnValue(false);
    rootInstances.length = 0;
    document.body.innerHTML = '<div id="root"></div>';
    document.documentElement.removeAttribute("data-micro-host");
    delete (window as QiankunTestWindow).__POWERED_BY_QIANKUN__;
    await resetHostContext();
  });

  afterEach(async () => {
    document.body.innerHTML = "";
    document.documentElement.removeAttribute("data-micro-host");
    delete (window as QiankunTestWindow).__POWERED_BY_QIANKUN__;
    await resetHostContext();
  });

  it("renders standalone when not mounted by qiankun", async () => {
    await import("./main");

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(latestInitialEntries()).toBeUndefined();
  });

  it("mounts under qiankun with the initial path from props", async () => {
    (window as QiankunTestWindow).__POWERED_BY_QIANKUN__ = true;
    const main = await import("./main");

    await main.mount({
      container: document,
      initialPath: "/embed/packaging/packaging-type",
      hostContext: makeContext("en_US"),
    } satisfies MicroHostProps & { container: ParentNode });

    expect(createRootMock).toHaveBeenCalledTimes(1);
    expect(latestInitialEntries()).toEqual(["/embed/packaging/packaging-type"]);
    await expect(readHostContext()).resolves.toMatchObject({
      languageInfo: {
        currentLang: "en_US",
      },
    });
    expect(document.documentElement.hasAttribute("data-micro-host")).toBe(true);
  });

  it("updates host context without remounting", async () => {
    (window as QiankunTestWindow).__POWERED_BY_QIANKUN__ = true;
    const main = await import("./main");

    await main.mount({
      container: document,
      initialPath: "/embed/packaging/packaging-type",
      hostContext: makeContext("en_US"),
    } satisfies MicroHostProps & { container: ParentNode });
    await main.update({ hostContext: makeContext("vi_VN") });

    expect(createRootMock).toHaveBeenCalledTimes(1);
    await expect(readHostContext()).resolves.toMatchObject({
      languageInfo: {
        currentLang: "vi_VN",
      },
    });
  });

  it("unmounts the React root and clears micro host marker", async () => {
    (window as QiankunTestWindow).__POWERED_BY_QIANKUN__ = true;
    const main = await import("./main");

    await main.mount({
      container: document,
      initialPath: "/embed/packaging/packaging-type",
      hostContext: makeContext("en_US"),
    } satisfies MicroHostProps & { container: ParentNode });
    await main.unmount();

    expect(rootInstances[0]?.unmount).toHaveBeenCalledTimes(1);
    expect(mocks.disposeHostTokenBridge).toHaveBeenCalledTimes(1);
    expect(document.documentElement.hasAttribute("data-micro-host")).toBe(false);
  });
});
