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

  it("renders stable e2e markers for shell and toggles", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    expect(await screen.findByTestId("admin-shell")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("renders the packaging module inside the admin shell", async () => {
    render(<App initialEntries={["/wms/packaging"]} />);

    expect(await screen.findByRole("heading", { name: "包装管理" })).toBeInTheDocument();
    expect(screen.getByText("管理包装任务、作业状态和异常处理。")).toBeInTheDocument();
    expect(screen.getAllByText("包装管理")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "包装类型维护" })).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-wms-packaging")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
  });

  it("groups example routes at the bottom of the navigation", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    await screen.findByRole("heading", { name: "仪表盘" });

    expect(screen.getByText("示例管理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();
    expect(screen.getByText("包装管理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "包装类型维护" })).toBeInTheDocument();
  });

  it("toggles grouped navigation items from the group trigger", async () => {
    render(<App initialEntries={["/dashboard"]} />);

    await screen.findByRole("heading", { name: "仪表盘" });

    const exampleGroupTrigger = screen.getByRole("button", { name: "示例管理" });

    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();

    fireEvent.click(exampleGroupTrigger);

    expect(screen.queryByRole("link", { name: "壳内示例" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "独立预览" })).not.toBeInTheDocument();

    fireEvent.click(exampleGroupTrigger);

    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();
  });

  it("renders standalone routes without admin navigation", async () => {
    render(<App initialEntries={["/examples/standalone"]} />);

    expect(
      await screen.findByRole("heading", { name: "独立示例" })
    ).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "仪表盘" })).not.toBeInTheDocument();
  });

  it("renders standalone pages outside the admin shell", async () => {
    render(<App initialEntries={["/examples/standalone"]} />);

    expect(await screen.findByTestId("standalone-page")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
  });

  it("uses the browser location when initial entries are not provided", async () => {
    window.history.pushState({}, "", "/examples/standalone");

    render(<App />);

    expect(await screen.findByTestId("standalone-page")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
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
