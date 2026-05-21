import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./root-app";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
