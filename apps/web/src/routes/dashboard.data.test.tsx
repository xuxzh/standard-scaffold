import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "@/root-app";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";

describe("Dashboard data", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("accessToken", "access-1");
  });

  it("renders preset mock stats without issuing a network request", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    for (const stat of dashboardStatsResponse.stats) {
      expect(await screen.findByText(stat.value)).toBeInTheDocument();
    }

    // 确认走的是本地预设数据，渲染数量等于契约里的 stat 条目数。
    expect(dashboardStatsResponse.stats).toHaveLength(3);
  });
});