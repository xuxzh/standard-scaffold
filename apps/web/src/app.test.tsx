import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n/config";
import { App } from "@/root-app";
import { setNavigatorLanguage } from "@/test/setup";

describe("App routing", () => {
  beforeEach(async () => {
    localStorage.clear();
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders Chinese shell copy by default", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    expect(
      await screen.findByRole("heading", { name: "仪表盘" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "仪表盘" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Toggle Sidebar" }).length).toBeGreaterThan(0);
  });

  it("renders standalone routes without admin navigation", async () => {
    render(<App initialEntries={["/examples/standalone"]} />);

    expect(
      await screen.findByRole("heading", { name: "独立示例" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "仪表盘" })).not.toBeInTheDocument();
  });

  it("switches shell copy to English from the header menu", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    fireEvent.pointerDown(await screen.findByRole("button", { name: "切换语言" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(localStorage.getItem("app-locale")).toBe("en-US");
  });

  it("switches page content to English", async () => {
    render(<App initialEntries={["/examples/embedded"]} />);

    expect(
      await screen.findByText("这个页面运行在后台壳内，适合放业务表单、列表和看板。")
    ).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole("button", { name: "切换语言" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(
      await screen.findByText(
        "This page runs inside the admin shell and fits business forms, tables, and dashboards."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Workspace Name")).toBeInTheDocument();
  });
});
