import type { HostContextValue, MicroHostProps } from "./host-context-types";

let runningInMicroHost = false;
let currentHostContext: HostContextValue | null = null;
const listeners = new Set<HostContextListener>();

export type HostContextListener = (ctx: HostContextValue | null) => void;

export function isRunningInMicroHost(): boolean {
  return runningInMicroHost;
}

export function readInitialHostContext(): HostContextValue | null {
  return currentHostContext;
}

export function subscribeHostContext(listener: HostContextListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function applyMicroHostProps(props: MicroHostProps): void {
  runningInMicroHost = true;
  currentHostContext = props.hostContext ?? null;
  for (const listener of listeners) {
    listener(currentHostContext);
  }
}

export function resetMicroHostContextForTest(): void {
  runningInMicroHost = false;
  currentHostContext = null;
  listeners.clear();
}

export const isRunningInWujie = isRunningInMicroHost;
