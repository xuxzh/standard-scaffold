import { beforeEach, describe, expect, it, vi } from "vitest";

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
  disposeHostTokenBridge: vi.fn(),
}));

vi.mock("./mocks/config", () => ({
  isApiMockingEnabled: () => false,
}));

vi.mock("./root-app", () => ({
  App: () => null,
}));

type WujieTestWindow = Window & {
  __POWERED_BY_WUJIE__?: boolean;
  __WUJIE_MOUNT__?: () => void;
  __WUJIE_UNMOUNT__?: () => void;
};

describe("main wujie bootstrap", () => {
  beforeEach(() => {
    vi.resetModules();
    createRootMock.mockClear();
    rootInstances.length = 0;
    document.body.innerHTML = '<div id="root"></div>';
    const wujieWindow = window as WujieTestWindow;
    wujieWindow.__POWERED_BY_WUJIE__ = true;
    delete wujieWindow.__WUJIE_MOUNT__;
    delete wujieWindow.__WUJIE_UNMOUNT__;
  });

  it("does not create a second React root when wujie mount runs after initial render", async () => {
    await import("./main");

    expect(createRootMock).toHaveBeenCalledTimes(1);

    (window as WujieTestWindow).__WUJIE_MOUNT__?.();

    expect(createRootMock).toHaveBeenCalledTimes(1);
  });

  it("creates a fresh React root when wujie remounts into a new root element", async () => {
    await import("./main");

    expect(createRootMock).toHaveBeenCalledTimes(1);

    document.body.innerHTML = '<div id="root"></div>';
    (window as WujieTestWindow).__WUJIE_MOUNT__?.();

    expect(rootInstances[0]?.unmount).toHaveBeenCalledTimes(1);
    expect(createRootMock).toHaveBeenCalledTimes(2);
  });
});
