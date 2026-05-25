import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "@/root-app";
import {
  type TransportResponse,
  type Transport,
} from "@/lib/api/http-client";
import { resetAppTransportForTests, setAppTransportForTests } from "@/lib/api/app-client";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-service";

describe("Dashboard data", () => {
  beforeEach(() => {
    resetAppTransportForTests();
  });

  it("shows a loading state while the dashboard request is pending", async () => {
    let resolveRequest!: (response: TransportResponse) => void;

    const transport: Transport = () =>
      new Promise((resolve) => {
        resolveRequest = resolve;
      });

    setAppTransportForTests(transport);

    render(<App initialEntries={["/dashboard"]} />);

    expect(await screen.findByText("正在加载仪表盘概览。")).toBeInTheDocument();

    resolveRequest({
      status: 200,
      data: dashboardStatsResponse,
    });

    expect(await screen.findByText("05")).toBeInTheDocument();
  });

  it("shows an error state and retries the dashboard request", async () => {
    const transport = vi
      .fn<Transport>()
      .mockResolvedValueOnce({
        status: 503,
        data: {
          message: "仪表盘服务暂时不可用"
        }
      })
      .mockResolvedValueOnce({
        status: 200,
        data: dashboardStatsResponse
      });

    setAppTransportForTests(transport);

    render(<App initialEntries={["/dashboard"]} />);

    expect(await screen.findByText("暂时无法加载概览")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(await screen.findByText("05")).toBeInTheDocument();
    expect(transport).toHaveBeenCalledTimes(2);
  });
});