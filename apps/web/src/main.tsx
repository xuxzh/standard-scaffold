import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./root-app";
import { isApiMockingEnabled } from "./mocks/config";
import "./styles.css";

/**
 * Wujie injects this flag on the iframe's `window` before any sub-app script
 * runs. Used to branch between standalone rendering and the lifecycle hooks
 * required by wujie's mount/unmount/remount protocol.
 */
type WujieWindow = Window & {
  __POWERED_BY_WUJIE__?: boolean;
  __WUJIE_MOUNT__?: () => void;
  __WUJIE_UNMOUNT__?: () => void;
};

const wujieWindow = window as WujieWindow;
const isWujie = Boolean(wujieWindow.__POWERED_BY_WUJIE__);

async function enableApiMocking() {
  if (!isApiMockingEnabled()) {
    return;
  }

  const { worker } = await import("./mocks/browser");

  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

/**
 * The sub-app must use memory history inside wujie so its navigation does not
 * fight the host's router. We seed memory history with whatever path/search
 * the host opened us at (`setupApp.url`'s pathname), wired through the
 * already-existing `App({ initialEntries })` seam in `root-app.tsx`.
 */
function buildInitialEntries(): string[] {
  const { pathname, search } = window.location;
  return [pathname + (search || "")];
}

/**
 * Track the active root so wujie's unmount lifecycle can dispose React state
 * cleanly. Wujie tears down the iframe DOM on remount, so on every `mount`
 * call we create a fresh root against the (possibly new) `#root` element.
 */
let currentRoot: Root | null = null;

function render() {
  const rootEl = document.getElementById("root");
  if (!rootEl) {
    return;
  }
  currentRoot = createRoot(rootEl);
  currentRoot.render(
    <StrictMode>
      <App initialEntries={isWujie ? buildInitialEntries() : undefined} />
    </StrictMode>,
  );
}

function disposeRoot() {
  currentRoot?.unmount();
  currentRoot = null;
}

if (!isWujie) {
  // Standalone path keeps the original behaviour: optionally bootstrap MSW
  // before painting the tree.
  void enableApiMocking().then(render);
} else {
  // Wujie path: register lifecycle callbacks and let the host drive the
  // mount. We deliberately skip MSW here — when running inside MES the host
  // proxies real backend traffic and MSW would shadow it.
  wujieWindow.__WUJIE_MOUNT__ = render;
  wujieWindow.__WUJIE_UNMOUNT__ = disposeRoot;

  // Some wujie configurations execute the sub-app script before installing
  // its mount hook. Render once on initial load so the iframe is never blank;
  // a later `__WUJIE_MOUNT__` invocation will replace the root via the
  // re-created `#root` element.
  render();
}
