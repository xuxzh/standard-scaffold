# Web 运行与数据访问约定

日期：2026-05-25

## 目的

补充当前仓库已经落地的交付约定，覆盖持续集成、静态部署前提，以及 `apps/web` 中新的数据访问与状态边界。

## CI 约定

- 根目录新增 `.gitlab-ci.yml`，作为当前仓库默认的 CI 入口。
- CI 使用 Playwright 官方 Node 镜像，统一安装 workspace 依赖后串行执行以下命令：
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm --filter @repo/web test`
  - `pnpm --filter @repo/web-e2e test:e2e`
  - `pnpm build`
- Playwright 报告产物通过 `apps/web-e2e/playwright-report/` 和 `apps/web-e2e/test-results/` 保留，便于在 CI 失败时回看。
- `apps/web-e2e` 的本地启动流程会显式绕过 `localhost` / `127.0.0.1` 代理，避免 shell 中的代理环境变量误伤本地 E2E。

## 部署契约

当前仓库仍未绑定具体托管平台，但 `apps/web` 已满足静态 SPA 部署的基本前提：

- 生产产物目录为 `apps/web/dist/ruihui-next`。
- 应用使用浏览器 history 路由，因此静态托管环境必须把未知路径重写到 `index.html`。
- 至少需要验证以下直达路径在生产托管中可访问：
  - `/dashboard`
  - `/examples/embedded`
  - `/examples/standalone`
- 当前 dashboard、登录和本地业务请求在 mock 模式下由 `msw` 提供浏览器层拦截；关闭 mock 时需要配置真实 API 地址。

## 状态管理边界

`apps/web` 目前采用三层边界，避免在脚手架阶段直接引入重型全局 store：

- 组件局部交互状态：优先留在组件内。
- 跨树 UI 偏好状态：继续使用 Context，例如 theme。
- 远程数据状态：统一交给 `@tanstack/react-query` 管理加载、缓存、重试和错误态。

除非后续出现明确的跨页面复杂客户端状态需求，否则不要默认引入 Redux、Zustand 等额外全局状态方案。

## 数据访问约定

- 通用 transport 与错误归一化位于 `apps/web/src/lib/api/http-client.ts`。
- 应用级 client 与 WMS client 在运行时统一走 fetch transport。
- 本地 mock 模式通过 `VITE_ENABLE_API_MOCKING=true` 启动 `msw`，由浏览器层 handlers 拦截请求。
- dashboard 作为首个消费者，通过 `apps/web/src/features/dashboard/dashboard-service.ts` 暴露 query hook 和数据读取入口。
- `apps/web/src/root-app.tsx` 现在在 router 外层挂载 `QueryClientProvider`；Theme 与 i18n provider 顺序保持不变。
- 测试如果需要替换数据源，应使用 `setAppTransportForTests` / `resetAppTransportForTests` 或 `setWmsTransportForTests` / `resetWmsTransportForTests` 注入 transport，而不是直接改组件实现。

## 后续扩展规则

- 新增远程资源时，优先按“contract -> service -> route/component”这一层级扩展，而不是在页面中直接发请求。
- 如果未来扩展新的远程 client，继续沿用“运行时统一 fetch，测试通过 transport seam 注入替身”的模式。
- 一旦确定部署平台，再单独补充该平台的 rewrite、缓存和环境注入配置，不把平台细节直接混入当前通用文档。
