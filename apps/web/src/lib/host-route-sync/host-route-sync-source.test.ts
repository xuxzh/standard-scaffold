import { afterEach, describe, expect, it, vi } from "vitest";
import {
  HOST_ROUTE_SYNC_EVENT,
  subscribeHostRouteSyncViaPostMessage,
  type HostRouteSyncMessage,
} from "@/lib/host-route-sync/host-route-sync-source";

describe("host route sync source", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("subscribes to scaffold route sync postMessage events", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHostRouteSyncViaPostMessage(listener);
    const message: HostRouteSyncMessage = {
      type: HOST_ROUTE_SYNC_EVENT,
      activePathname: "/embed/packaging/packaging-level",
      openPathnames: [
        "/embed/packaging/packaging-type",
        "/embed/packaging/packaging-level",
      ],
    };

    window.dispatchEvent(new MessageEvent("message", { data: message }));

    expect(listener).toHaveBeenCalledWith(message);
    unsubscribe();
  });

  it("ignores malformed route sync messages", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeHostRouteSyncViaPostMessage(listener);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: HOST_ROUTE_SYNC_EVENT,
          activePathname: 1,
          openPathnames: ["/embed/packaging/packaging-type"],
        },
      }),
    );

    expect(listener).not.toHaveBeenCalled();
    unsubscribe();
  });
});
