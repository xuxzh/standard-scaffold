import * as signalR from "@microsoft/signalr";
import type { ImportSignalRReceivedData } from "@/components/data-import/data-import-contract";

const DEFAULT_HUB_NAME = "realTimeProductionDataHub";

export type StartImportProgressOptions = {
  serverUrl: string;
  hubName?: string;
};

export type ImportProgressConnection = {
  joinGroup: (groupName: string) => Promise<void>;
  onProgress: (
    listenMethod: string,
    handler: (data: ImportSignalRReceivedData) => void,
  ) => void;
  dispose: () => Promise<void>;
};

type RegisteredHandler = {
  listenMethod: string;
  handler: (data: ImportSignalRReceivedData) => void;
};

function buildConnection(serverUrl: string, hubName: string) {
  const url = `${serverUrl.replace(/\/$/, "")}/${hubName}`;

  return new signalR.HubConnectionBuilder()
    .withUrl(url)
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Warning)
    .build();
}

export async function startImportProgressConnection(
  options: StartImportProgressOptions,
): Promise<ImportProgressConnection> {
  const hubName = options.hubName ?? DEFAULT_HUB_NAME;
  const connection = buildConnection(options.serverUrl, hubName);
  const registered: RegisteredHandler[] = [];
  const joinedGroups = new Set<string>();

  await connection.start();

  connection.onreconnected(() => {
    joinedGroups.forEach((groupName) => {
      void connection.invoke("JoinGroup", groupName).catch(() => {
        // Reconnect-time join is best-effort; the next progress event
        // will simply not arrive if the join fails.
      });
    });
  });

  function registerHandler(
    listenMethod: string,
    handler: (data: ImportSignalRReceivedData) => void,
  ) {
    const wrapped = (data: unknown) => {
      handler(data as ImportSignalRReceivedData);
    };

    connection.on(listenMethod, wrapped);
    registered.push({ listenMethod, handler });
  }

  async function joinGroup(groupName: string) {
    if (joinedGroups.has(groupName)) {
      return;
    }

    await connection.invoke("JoinGroup", groupName);
    joinedGroups.add(groupName);
  }

  async function dispose() {
    for (const entry of registered) {
      connection.off(entry.listenMethod);
    }

    registered.length = 0;
    joinedGroups.clear();

    try {
      await connection.stop();
    } catch {
      // Best-effort: the page is going away.
    }
  }

  return {
    joinGroup,
    onProgress: registerHandler,
    dispose,
  };
}
