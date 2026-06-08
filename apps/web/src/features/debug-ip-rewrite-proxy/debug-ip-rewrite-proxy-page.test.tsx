import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "@/i18n/config";
import { DebugIpRewriteProxyPage } from "./debug-ip-rewrite-proxy-page";

describe("DebugIpRewriteProxyPage", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("previews IP rewrite without changing the original port", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response(
          JSON.stringify({
            enabled: true,
            targetHost: "127.0.0.1",
            mode: "ports",
            ports: [8288],
            pattern: "",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }),
    );

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
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        return new Response(
          JSON.stringify({
            enabled: false,
            targetHost: "127.0.0.1",
            mode: "ports",
            ports: [],
            pattern: "",
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }),
    );

    render(<DebugIpRewriteProxyPage />);

    await screen.findByText("端口列表");
    fireEvent.click(screen.getByRole("button", { name: "正则匹配" }));

    expect(screen.getByText("正则表达式")).toBeInTheDocument();
    expect(screen.queryByText("端口列表")).not.toBeInTheDocument();
  });

  it("saves the current config", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (_input, init) => {
      if (init?.method === "PUT") {
        return new Response(String(init.body), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        });
      }

      return new Response(
        JSON.stringify({
          enabled: false,
          targetHost: "127.0.0.1",
          mode: "ports",
          ports: [],
          pattern: "",
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<DebugIpRewriteProxyPage />);

    await screen.findByDisplayValue("127.0.0.1");
    fireEvent.change(screen.getByLabelText("端口列表"), {
      target: { value: "8288" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/__debug/ip-rewrite-proxy/config",
        expect.objectContaining({
          method: "PUT",
        }),
      );
    });
  });
});
