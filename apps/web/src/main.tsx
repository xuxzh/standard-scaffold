import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./root-app";
import { isApiMockingEnabled } from "./mocks/config";
import "./styles.css";

async function enableApiMocking() {
  if (!isApiMockingEnabled()) {
    return;
  }

  const { worker } = await import("./mocks/browser");

  await worker.start({
    onUnhandledRequest: "bypass",
  });
}

void enableApiMocking().then(() => {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
