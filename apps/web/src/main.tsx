import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { disposeHostTokenBridge } from "@/lib/auth/host-token-bridge";
import { applyMicroHostProps, type MicroHostProps } from "@/lib/host-context";
import { App } from "./root-app";
import { isApiMockingEnabled } from "./mocks/config";
import "./styles.css";

type QiankunWindow = Window & {
  __POWERED_BY_QIANKUN__?: boolean;
};

type QiankunMountProps = MicroHostProps & {
  container?: ParentNode;
};

let currentRoot: Root | null = null;
let currentRootElement: HTMLElement | null = null;
let currentInitialEntries: string[] | undefined;

async function enableApiMocking() {
  if (!isApiMockingEnabled()) {
    return;
  }

  const { worker } = await import("./mocks/browser");

  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

function render(container: ParentNode = document, initialEntries?: string[]) {
  const rootEl = container.querySelector<HTMLElement>("#root");
  if (!rootEl) {
    return;
  }

  if (currentRoot && currentRootElement === rootEl) {
    return;
  }

  currentRoot?.unmount();
  currentInitialEntries = initialEntries;
  currentRoot = createRoot(rootEl);
  currentRootElement = rootEl;
  currentRoot.render(
    <StrictMode>
      <App initialEntries={currentInitialEntries} />
    </StrictMode>,
  );
}

function disposeRoot() {
  disposeHostTokenBridge();
  currentRoot?.unmount();
  currentRoot = null;
  currentRootElement = null;
  currentInitialEntries = undefined;
}

function initialEntriesFromProps(props: MicroHostProps): string[] | undefined {
  return props.initialPath ? [props.initialPath] : undefined;
}

export async function bootstrap() {}

export async function mount(props: QiankunMountProps) {
  document.documentElement.setAttribute("data-micro-host", "");
  applyMicroHostProps(props);
  render(props.container ?? document, initialEntriesFromProps(props));
}

export async function update(props: MicroHostProps) {
  applyMicroHostProps(props);
}

export async function unmount() {
  document.documentElement.removeAttribute("data-micro-host");
  disposeRoot();
}

if (!(window as QiankunWindow).__POWERED_BY_QIANKUN__) {
  void enableApiMocking().then(() => render());
}
