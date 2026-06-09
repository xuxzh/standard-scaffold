import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import "@/i18n/config";
import { DebugIpRewriteProxyPage } from "./debug-ip-rewrite-proxy-page";
import {
  DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
  loadDebugIpRewriteProxyConfigFromStorage,
  saveDebugIpRewriteProxyConfigToStorage,
} from "@/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store";

afterEach(() => {
  window.localStorage.clear();
});

function seedConfig(overrides: Record<string, unknown> = {}) {
  const config = saveDebugIpRewriteProxyConfigToStorage({
    ...loadDebugIpRewriteProxyConfigFromStorage(),
    enabled: false,
    targetHost: "127.0.0.1",
    mode: "ports",
    ports: [8288],
    pattern: "",
    baseUrls: {
      app: "http://192.168.0.135:8288",
      wms: "http://192.168.0.135:8283",
      mes: "http://192.168.0.135:8282",
      print: "http://192.168.0.135:3002",
    },
    ...overrides,
  });
  return config;
}

describe("DebugIpRewriteProxyPage", () => {
  it("previews IP rewrite without changing the original port", async () => {
    seedConfig({ enabled: true });

    render(<DebugIpRewriteProxyPage />);

    await screen.findByDisplayValue("127.0.0.1");
    fireEvent.change(screen.getByLabelText("原始 URL"), {
      target: { value: "http://192.168.1.20:8288/api/users?id=1" },
    });

    expect(
      await screen.findByText("http://127.0.0.1:8288/api/users?id=1"),
    ).toBeInTheDocument();
  });

  it("shows only the regex field in regex mode", async () => {
    seedConfig({ mode: "ports" });

    render(<DebugIpRewriteProxyPage />);

    await screen.findByText("端口列表");
    fireEvent.click(screen.getByRole("button", { name: "正则匹配" }));

    expect(screen.getByText("正则表达式")).toBeInTheDocument();
    expect(screen.queryByText("端口列表")).not.toBeInTheDocument();
  });

  it("saves the current config to localStorage", async () => {
    seedConfig({ ports: [8282] });

    render(<DebugIpRewriteProxyPage />);

    await screen.findByText("端口列表");
    fireEvent.change(screen.getByLabelText("端口列表"), {
      target: { value: "8288" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      const raw = window.localStorage.getItem(
        DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY,
      );
      expect(raw).not.toBeNull();
      const payload = JSON.parse(String(raw)) as { ports: number[] };
      expect(payload.ports).toEqual([8288]);
    });
  });

  it("shows a warning when enabled with empty baseUrls", async () => {
    seedConfig({
      enabled: true,
      baseUrls: { app: "", wms: "", mes: "", print: "" },
    });

    render(<DebugIpRewriteProxyPage />);

    expect(
      await screen.findByTestId("debug-ip-rewrite-proxy-base-urls-warning"),
    ).toBeInTheDocument();
  });

  it("hides the warning when all baseUrls are filled", async () => {
    seedConfig({ enabled: true });

    render(<DebugIpRewriteProxyPage />);

    await screen.findByDisplayValue("127.0.0.1");
    expect(
      screen.queryByTestId("debug-ip-rewrite-proxy-base-urls-warning"),
    ).not.toBeInTheDocument();
  });
});
