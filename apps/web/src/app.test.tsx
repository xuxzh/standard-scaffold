     1|import { fireEvent, render, screen, waitFor } from "@testing-library/react";
     2|import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
     3|import { i18n } from "@/i18n/config";
     4|import { App } from "@/root-app";
     5|import {
     6|  resetAppTransportForTests,
     7|  setAppTransportForTests,
     8|} from "@/lib/api/app-client";
     9|import type { DataResult, Transport } from "@/lib/api/http-client";
    10|import { setNavigatorLanguage } from "@/test/setup";
    11|
    12|function tokenResult(): DataResult<{
    13|  TokenType: string;
    14|  AccessToken: string;
    15|  ExpiresIn: number;
    16|  RefreshToken: string;
    17|}> {
    18|  return {
    19|    Success: true,
    20|    Code: null,
    21|    Message: "ok",
    22|    Record: 1,
    23|    SkipCount: 0,
    24|    TotalCount: 1,
    25|    Attach: {
    26|      TokenType: "Bearer",
    27|      AccessToken: "access-1",
    28|      ExpiresIn: 604800,
    29|      RefreshToken: "refresh-1",
    30|    },
    31|  };
    32|}
    33|
    34|function renderAuthenticatedApp(initialEntries: string[]) {
    35|  localStorage.setItem("tokenType", "Bearer");
    36|  localStorage.setItem("accessToken", "access-1");
    37|  localStorage.setItem("refreshToken", "refresh-1");
    38|  localStorage.setItem("expiresIn", "604800");
    39|  localStorage.setItem(
    40|    "userDisplay",
    41|    JSON.stringify({
    42|      userCode: "DemoAdmin",
    43|      displayName: "DemoAdmin",
    44|    }),
    45|  );
    46|
    47|  render(<App initialEntries={initialEntries} />);
    48|}
    49|
    50|describe("App routing", () => {
    51|  beforeEach(async () => {
    52|    localStorage.clear();
    53|    setNavigatorLanguage("zh-CN");
    54|    await i18n.changeLanguage("zh-CN");
    55|  });
    56|
    57|  afterEach(() => {
    58|    resetAppTransportForTests();
    59|    vi.restoreAllMocks();
    60|  });
    61|
    62|  it("renders Chinese shell copy by default", async () => {
    63|    renderAuthenticatedApp(["/dashboard"]);
    64|
    65|    expect(
    66|      await screen.findByRole("heading", { name: "仪表盘" })
    67|    ).toBeInTheDocument();
    68|    expect(screen.getByRole("link", { name: "仪表盘" })).toBeInTheDocument();
    69|    expect(screen.getByRole("button", { name: "预览" })).toBeInTheDocument();
    70|    expect(screen.getAllByRole("button", { name: "Toggle Sidebar" }).length).toBeGreaterThan(0);
    71|  });
    72|
    73|  it("renders stable e2e markers for shell and toggles", async () => {
    74|    renderAuthenticatedApp(["/dashboard"]);
    75|
    76|    expect(await screen.findByTestId("admin-shell")).toBeInTheDocument();
    77|    expect(screen.getByTestId("sidebar-nav-dashboard")).toBeInTheDocument();
    78|    expect(screen.getByTestId("theme-toggle")).toBeInTheDocument();
    79|    expect(screen.getByTestId("language-toggle")).toBeInTheDocument();
    80|  });
    81|
    82|  it("renders the packaging module inside the admin shell", async () => {
    83|    renderAuthenticatedApp(["/packaging/packaging-type"]);
    84|
    85|    expect(await screen.findByRole("heading", { name: "包装类型维护" })).toBeInTheDocument();
    86|      expect(screen.getByText("维护包装类型基础数据、筛选条件和操作闭环。")).toBeInTheDocument();
    87|    expect(screen.getByRole("link", { name: "包装类型维护" })).toBeInTheDocument();
    88|    expect(screen.getByTestId("sidebar-nav-packaging-packaging-type")).toBeInTheDocument();
    89|    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
    90|  });
    91|
    92|  it("renders the packaging level module inside the admin shell", async () => {
    93|    renderAuthenticatedApp(["/packaging/packaging-level"]);
    94|
    95|    expect(await screen.findByRole("heading", { name: "包装层级维护" })).toBeInTheDocument();
    96|    expect(screen.getByText("维护包装层级主数据、父级约束和关系图查看。")).toBeInTheDocument();
    97|    expect(screen.getByRole("link", { name: "包装层级维护" })).toBeInTheDocument();
    98|    expect(screen.getByTestId("sidebar-nav-packaging-packaging-level")).toBeInTheDocument();
    99|    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
   100|  });
   101|
   102|   103|  it("renders the packaging kit module inside the admin shell", async () => {
   104|    renderAuthenticatedApp(["/packaging/packaging-kit"]);
   105|
   106|    expect(await screen.findByRole("heading", { name: "套包信息维护" })).toBeInTheDocument();
   107|    expect(screen.getByText("维护套包主数据、主子件关系和批量操作闭环。"))
   108|      .toBeInTheDocument();
   109|    expect(screen.getByRole("link", { name: "套包信息维护" })).toBeInTheDocument();
   110|    expect(screen.getByTestId("sidebar-nav-packaging-packaging-kit")).toBeInTheDocument();
   111|   112|  it("renders the packaging spec module inside the admin shell", async () => {
   113|    renderAuthenticatedApp(["/packaging/packaging-spec"]);
   114|
   115|    expect(await screen.findByRole("heading", { name: "包装规格维护" })).toBeInTheDocument();
   116|    expect(screen.getByText("维护包装规格主数据、尺寸重量参数和启停状态。"))
   117|      .toBeInTheDocument();
   118|    expect(screen.getByRole("link", { name: "包装规格维护" })).toBeInTheDocument();
   119|    expect(screen.getByTestId("sidebar-nav-packaging-packaging-spec")).toBeInTheDocument();
   120|   121|    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
   122|  });
   123|
   124|  it("groups example routes at the bottom of the navigation", async () => {
   125|    renderAuthenticatedApp(["/dashboard"]);
   126|
   127|    await screen.findByRole("heading", { name: "仪表盘" });
   128|
   129|    expect(screen.getByText("示例管理")).toBeInTheDocument();
   130|    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
   131|    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();
   132|    expect(screen.getByText("包装管理")).toBeInTheDocument();
   133|    expect(screen.getByRole("link", { name: "包装类型维护" })).toBeInTheDocument();
   134|    expect(screen.getByRole("link", { name: "包装层级维护" })).toBeInTheDocument();
   135|   136|    expect(screen.getByRole("link", { name: "套包信息维护" })).toBeInTheDocument();
   137|   138|    expect(screen.getByRole("link", { name: "包装规格维护" })).toBeInTheDocument();
   139|   140|  });
   141|
   142|  it("toggles grouped navigation items from the group trigger", async () => {
   143|    renderAuthenticatedApp(["/dashboard"]);
   144|
   145|    await screen.findByRole("heading", { name: "仪表盘" });
   146|
   147|    const exampleGroupTrigger = screen.getByRole("button", { name: "示例管理" });
   148|
   149|    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
   150|    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();
   151|
   152|    fireEvent.click(exampleGroupTrigger);
   153|
   154|    expect(screen.queryByRole("link", { name: "壳内示例" })).not.toBeInTheDocument();
   155|    expect(screen.queryByRole("link", { name: "独立预览" })).not.toBeInTheDocument();
   156|
   157|    fireEvent.click(exampleGroupTrigger);
   158|
   159|    expect(screen.getByRole("link", { name: "壳内示例" })).toBeInTheDocument();
   160|    expect(screen.getByRole("link", { name: "独立预览" })).toBeInTheDocument();
   161|  });
   162|
   163|  it("redirects unauthenticated shell routes to login with the original path", async () => {
   164|    render(<App initialEntries={["/packaging/packaging-type"]} />);
   165|
   166|    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
   167|    expect(screen.getByLabelText("用户编码")).toBeInTheDocument();
   168|    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
   169|  });
   170|
   171|  it("redirects unauthenticated packaging level route to login with the original path", async () => {
   172|    render(<App initialEntries={["/packaging/packaging-level"]} />);
   173|
   174|    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
   175|    expect(screen.getByLabelText("用户编码")).toBeInTheDocument();
   176|    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
   177|  });
   178|
   179|   180|  it("redirects unauthenticated packaging kit route to login with the original path", async () => {
   181|    const transport = vi.fn<Transport>(async () => ({
   182|      status: 200,
   183|      data: tokenResult(),
   184|    }));
   185|    setAppTransportForTests(transport);
   186|
   187|    render(<App initialEntries={["/packaging/packaging-kit"]} />);
   188|   189|  it("redirects unauthenticated packaging spec route to login with the original path", async () => {
   190|    render(<App initialEntries={["/packaging/packaging-spec"]} />);
   191|   192|
   193|    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
   194|    expect(screen.getByLabelText("用户编码")).toBeInTheDocument();
   195|    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
   196|   197|
   198|    fireEvent.change(screen.getByLabelText("用户编码"), {
   199|      target: { value: "DemoAdmin" },
   200|    });
   201|    fireEvent.change(screen.getByLabelText("密码"), {
   202|      target: { value: "Icpt1357!!" },
   203|    });
   204|    fireEvent.click(screen.getByRole("button", { name: "登录" }));
   205|
   206|    await waitFor(() => {
   207|      expect(transport).toHaveBeenCalledWith(
   208|        expect.objectContaining({
   209|          method: "POST",
   210|          path: "/account/login",
   211|        }),
   212|      );
   213|    });
   214|    expect(await screen.findByRole("heading", { name: "套包信息维护" })).toBeInTheDocument();
   215|   216|   217|  });
   218|
   219|  it("renders shell routes when an access token exists", async () => {
   220|    renderAuthenticatedApp(["/dashboard"]);
   221|
   222|    expect(await screen.findByRole("heading", { name: "仪表盘" })).toBeInTheDocument();
   223|    expect(screen.getByTestId("admin-shell")).toBeInTheDocument();
   224|  });
   225|
   226|  it("shows the current username inside the header user menu", async () => {
   227|    renderAuthenticatedApp(["/dashboard"]);
   228|
   229|    fireEvent.pointerDown(await screen.findByRole("button", { name: "打开用户菜单" }));
   230|
   231|    expect(await screen.findByText("DemoAdmin")).toBeInTheDocument();
   232|    expect(screen.getByText("退出登录")).toBeInTheDocument();
   233|  });
   234|
   235|  it("confirms logout before clearing session and redirecting to login", async () => {
   236|    renderAuthenticatedApp(["/dashboard"]);
   237|
   238|    fireEvent.pointerDown(await screen.findByRole("button", { name: "打开用户菜单" }));
   239|    fireEvent.click(screen.getByRole("menuitem", { name: "退出登录" }));
   240|
   241|    expect(await screen.findByRole("heading", { name: "确认退出登录" })).toBeInTheDocument();
   242|
   243|    fireEvent.click(screen.getByRole("button", { name: "退出登录" }));
   244|
   245|    expect(await screen.findByRole("heading", { name: "登录" })).toBeInTheDocument();
   246|    expect(localStorage.getItem("accessToken")).toBeNull();
   247|    expect(localStorage.getItem("userDisplay")).toBeNull();
   248|  });
   249|
   250|  it("renders standalone routes without admin navigation", async () => {
   251|    render(<App initialEntries={["/examples/standalone"]} />);
   252|
   253|    expect(
   254|      await screen.findByRole("heading", { name: "独立示例" })
   255|    ).toBeInTheDocument();
   256|    expect(screen.queryByRole("link", { name: "仪表盘" })).not.toBeInTheDocument();
   257|  });
   258|
   259|  it("renders standalone pages outside the admin shell", async () => {
   260|    render(<App initialEntries={["/examples/standalone"]} />);
   261|
   262|    expect(await screen.findByTestId("standalone-page")).toBeInTheDocument();
   263|    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
   264|  });
   265|
   266|  it("uses the browser location when initial entries are not provided", async () => {
   267|    window.history.pushState({}, "", "/examples/standalone");
   268|
   269|    render(<App />);
   270|
   271|    expect(await screen.findByTestId("standalone-page")).toBeInTheDocument();
   272|    expect(screen.queryByTestId("admin-shell")).not.toBeInTheDocument();
   273|  });
   274|
   275|  it("switches shell copy to English from the header menu", async () => {
   276|    renderAuthenticatedApp(["/dashboard"]);
   277|
   278|    fireEvent.pointerDown(await screen.findByRole("button", { name: "切换语言" }));
   279|    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));
   280|
   281|    expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
   282|    expect(screen.getByRole("link", { name: "Dashboard" })).toBeInTheDocument();
   283|    expect(screen.getByRole("button", { name: "Preview" })).toBeInTheDocument();
   284|    expect(localStorage.getItem("app-locale")).toBe("en-US");
   285|  });
   286|
   287|  it("switches page content to English", async () => {
   288|    renderAuthenticatedApp(["/examples/embedded"]);
   289|
   290|    expect(
   291|      await screen.findByText("这个页面运行在后台壳内，适合放业务表单、列表和看板。")
   292|    ).toBeInTheDocument();
   293|
   294|    fireEvent.pointerDown(screen.getByRole("button", { name: "切换语言" }));
   295|    fireEvent.click(screen.getByRole("menuitemradio", { name: "English" }));
   296|
   297|    expect(
   298|      await screen.findByText(
   299|        "This page runs inside the admin shell and fits business forms, tables, and dashboards."
   300|      )
   301|    ).toBeInTheDocument();
   302|    expect(screen.getByText("Workspace Name")).toBeInTheDocument();
   303|  });
   304|});
   305|