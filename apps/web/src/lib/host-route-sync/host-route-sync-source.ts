export const HOST_ROUTE_SYNC_EVENT = "rh:scaffold-route-sync";

export type HostRouteSyncMessage = {
  type: typeof HOST_ROUTE_SYNC_EVENT;
  activePathname: string;
  openPathnames: string[];
};

type WujieRouteBus = {
  $on(event: string, callback: (message: unknown) => void): void;
  $off(event: string, callback: (message: unknown) => void): void;
};

type WujieRouteGlobal = {
  __WUJIE?: {
    bus?: WujieRouteBus;
  };
};

function isHostRouteSyncMessage(value: unknown): value is HostRouteSyncMessage {
  if (!value || typeof value !== "object") {
    return false;
  }
  const data = value as Record<string, unknown>;
  return (
    data.type === HOST_ROUTE_SYNC_EVENT &&
    typeof data.activePathname === "string" &&
    Array.isArray(data.openPathnames) &&
    data.openPathnames.every((item) => typeof item === "string")
  );
}

function wujieWindow(): WujieRouteGlobal | null {
  if (typeof window === "undefined") {
    return null;
  }
  return window as unknown as WujieRouteGlobal;
}

export type HostRouteSyncListener = (message: HostRouteSyncMessage) => void;

export function subscribeHostRouteSyncViaPostMessage(
  listener: HostRouteSyncListener,
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    if (isHostRouteSyncMessage(event.data)) {
      listener(event.data);
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

export function subscribeHostRouteSyncViaBus(
  listener: HostRouteSyncListener,
): () => void {
  const bus = wujieWindow()?.__WUJIE?.bus;
  if (!bus) {
    return () => {};
  }

  const handler = (message: unknown) => {
    if (isHostRouteSyncMessage(message)) {
      listener(message);
    }
  };
  bus.$on(HOST_ROUTE_SYNC_EVENT, handler);
  return () => bus.$off(HOST_ROUTE_SYNC_EVENT, handler);
}

export function subscribeHostRouteSync(
  listener: HostRouteSyncListener,
): () => void {
  const unsubscribeBus = subscribeHostRouteSyncViaBus(listener);
  const unsubscribePostMessage = subscribeHostRouteSyncViaPostMessage(listener);

  return () => {
    unsubscribeBus();
    unsubscribePostMessage();
  };
}
