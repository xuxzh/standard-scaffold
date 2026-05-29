import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { i18n } from "@/i18n/config";
import { App } from "@/root-app";
import { setNavigatorLanguage } from "@/test/setup";

function renderAuthenticatedApp(initialEntries: string[]) {
  localStorage.setItem("tokenType", "Bearer");
  localStorage.setItem("accessToken", "access-1");
  localStorage.setItem("refreshToken", "refresh-1");
  localStorage.setItem("expiresIn", "604800");
  localStorage.setItem(
    "userDisplay",
    JSON.stringify({
      userCode: "DemoAdmin",
      displayName: "DemoAdmin",
    }),
  );

  render(<App initialEntries={initialEntries} />);
}

describe("App routing", () => {
  beforeEach(async () => {
    localStorage.clear();
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("renders Chinese shell copy by default", async () => {
    renderAuthenticatedApp(["/dashboard"]);

    expect(
      await screen.findByRole("heading", { name: "仪表盘" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "仪表盘" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "预览" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Toggle Sidebar" }).length).toBeGreaterThan(0);
  });

  it("renders stable e2e markers for shell and toggles", async () => {
    renderAuthenticatedApp(["/dashboard"]);

    expect(await screen.findByTestId("admin-shell")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
  });

  it("renders the packaging module inside the admin shell", async () => {
    renderAuthenticatedApp(["/packaging/packaging-type"]);

    expect(await screen.findByRole("heading", { name: "包装类型维护" })).toBeInTheDocument();
      expect(screen.getByText("维护包装类型基础数据、筛选条件和操作闭环。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "包装类型维护" })).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-packaging-packaging-type")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
  });

  it("renders the packaging level module inside the admin shell", async () => {
    renderAuthenticatedApp(["/packaging/packaging-level"]);

    expect(await screen.findByRole("heading", { name: "包装层级维护" })).toBeInTheDocument();
    expect(screen.getByText("维护包装层级主数据、父级约束和关系图查看。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "包装层级维护" })).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-nav-packaging-packaging-level")).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
  });

  it("groups example routes at the bottom of the navigation", async () => {
    renderAuthenticatedApp(["/dashboard"]);

    await screen.findByRole("heading", { name: "仪表盘" });

    expect(screen.getByText("示例管理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();
    expect(screen.getByText("包装管理")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "包装类型维护" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "包装层级维护" })).toBeInTheDocument();
  });

  it("toggles grouped navigation items from the group trigger", async () => {
    renderAuthenticatedApp(["/dashboard"]);

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

  it("redirects unauthenticated shell routes to login with the original path", async () => {
    render(<App initialEntries={["/packaging/packaging-type"]} />);

    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户编码")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
  });

  it("redirects unauthenticated packaging level route to login with the original path", async () => {
    render(<App initialEntries={["/packaging/packaging-level"]} />);

    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(screen.getByLabelText("用户编码")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
  });

  it("renders shell routes when an access token exists", async () => {
    renderAuthenticatedApp(["/dashboard"]);

    expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument();
    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
  });

  it("shows the current username inside the header user menu", async () => {
    renderAuthenticatedApp(["/dashboard"]);

    fireEvent.pointerDown(await screen.findByRole("button", { name: "打开用户菜单" }));

    expect(await screen.findByText("DemoAdmin")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });

  it("confirms logout before clearing session and redirecting to login", async () => {
    renderAuthenticatedApp(["/dashboard"]);

    fireEvent.pointerDown(await screen.findByRole("button", { name: "打开用户菜单" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "退出登录" }));

    expect(await screen.findByRole("heading", { name: "确认退出登录" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));

    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
    expect(localStorage.getItem("accessToken")).toBeNull();
    expect(localStorage.getItem("userDisplay")).toBeNull();
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
    renderAuthenticatedApp(["/dashboard"]);

    fireEvent.pointerDown(await screen.findByRole("button", { name: "切换语言" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));

    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
    expect(localStorage.getItem("app-locale")).toBe("en-US");
  });

  it("switches page content to English", async () => {
    renderAuthenticatedApp(["/examples/embedded"]);

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
