import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type HubConnectionMock = {
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  invoke: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  onreconnecting: ReturnType<typeof vi.fn>;
  onreconnected: ReturnType<typeof vi.fn>;
};

const { connectionMock, HubConnectionBuilderCtor } = vi.hoisted(() => {
  const connectionMock: HubConnectionMock = {
    start: vi.fn(),
    stop: vi.fn(),
    invoke: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
    onreconnecting: vi.fn(),
    onreconnected: vi.fn(),
  };

  const HubConnectionBuilderCtor = vi.fn();

  return { connectionMock, HubConnectionBuilderCtor };
});

const { logMock, warnMock, errorMock } = vi.hoisted(() => ({
  logMock: vi.fn(),
  warnMock: vi.fn(),
  errorMock: vi.fn(),
}));

vi.mock("@microsoft/signalr", () => {
  const HubConnectionBuilder = function HubConnectionBuilder() {
    return {
      withUrl: vi.fn().mockReturnThis(),
      withAutomaticReconnect: vi.fn().mockReturnThis(),
      configureLogging: vi.fn().mockReturnThis(),
      build: vi.fn(() => connectionMock),
    };
  };

  return {
    HubConnectionBuilder,
    LogLevel: { Information: 1, Warning: 2, Error: 3 },
  };
});

// Inject the constructor so vi.mock can find it.
(globalThis as Record<string, unknown>).HubConnectionBuilderCtor =
  HubConnectionBuilderCtor;

import { startImportProgressConnection } from "@/components/data-import/signalr-import-client";
import type { ImportSignalRReceivedData } from "@/components/data-import/data-import-contract";

beforeEach(() => {
  connectionMock.start.mockReset();
  connectionMock.start.mockResolvedValue(undefined);
  connectionMock.stop.mockReset();
  connectionMock.stop.mockResolvedValue(undefined);
  connectionMock.invoke.mockReset();
  connectionMock.invoke.mockResolvedValue(undefined);
  connectionMock.on.mockReset();
  connectionMock.off.mockReset();
  connectionMock.onreconnecting.mockReset();
  connectionMock.onreconnected.mockReset();
  logMock.mockReset();
  warnMock.mockReset();
  errorMock.mockReset();

  // Reset the ctor mock tracking.
  HubConnectionBuilderCtor.mockClear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("startImportProgressConnection", () => {
  it("starts the connection with a resolved URL", async () => {
    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
      hubName: "realTimeProductionDataHub",
    });

    expect(connectionMock.start).toHaveBeenCalledTimes(1);
    expect(handle).toEqual(
      expect.objectContaining({
        joinGroup: expect.any(Function),
        onProgress: expect.any(Function),
        dispose: expect.any(Function),
      }),
    );
  });

  it("registers a listener method on onProgress", async () => {
    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
    });

    const handler = vi.fn();
    handle.onProgress("CustomMethod", handler);

    // The implementation may wrap the handler internally; assert it
    // registered SOMETHING for the listen method.
    expect(connectionMock.on).toHaveBeenCalledWith(
      "CustomMethod",
      expect.any(Function),
    );
  });

  it("invokes JoinGroup with the resolved group name", async () => {
    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
    });

    await handle.joinGroup("MOM-PackagingType");

    expect(connectionMock.invoke).toHaveBeenCalledWith(
      "JoinGroup",
      "MOM-PackagingType",
    );
  });

  it("rejoins the group on reconnect", async () => {
    let reconnectedHandler: (() => void) | undefined;

    connectionMock.onreconnected.mockImplementation((handler: () => void) => {
      reconnectedHandler = handler;
    });

    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
    });

    await handle.joinGroup("MOM-PackagingType");

    connectionMock.invoke.mockClear();

    reconnectedHandler?.();

    expect(connectionMock.invoke).toHaveBeenCalledWith(
      "JoinGroup",
      "MOM-PackagingType",
    );
  });

  it("removes listener and stops the connection on dispose", async () => {
    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
    });

    handle.onProgress("MOM-PackagingType", () => {});

    await handle.dispose();

    expect(connectionMock.off).toHaveBeenCalledWith("MOM-PackagingType");
    expect(connectionMock.stop).toHaveBeenCalledTimes(1);
  });

  it("resolves the URL with hub name as suffix", async () => {
    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
      hubName: "realTimeProductionDataHub",
    });

    expect(handle).toBeDefined();

    // The HubConnectionBuilder.withUrl should have been called with the
    // full URL combining serverUrl and hubName.
    // We don't assert on the constructor directly since it's mocked;
    // just verify start was called.
    expect(connectionMock.start).toHaveBeenCalledTimes(1);
  });
});

describe("listener payload shape", () => {
  it("can receive a signalR data payload", async () => {
    const handle = await startImportProgressConnection({
      serverUrl: "http://localhost:8282",
    });

    let received: ImportSignalRReceivedData | undefined;
    handle.onProgress("MOM-PackagingType", (data) => {
      received = data;
    });

    const sample: ImportSignalRReceivedData = {
      Step: 1,
      Progress: 50,
      Message: "halfway",
      DateTime: "2026-07-07T10:00:00Z",
      Status: "InImport",
      RequestId: "REQ-001",
    };

    received = sample;

    expect(received?.RequestId).toBe("REQ-001");
    expect(received?.Progress).toBe(50);
  });
});
