# Web 运行时 Mock 收敛到 MSW Spec

日期：2026-05-27

## 背景

当前 `apps/web` 的运行时 mock 存在两条并行路径：

- `apps/web/src/lib/api/app-client.ts` 在未配置真实 API base URL 时，会回退到进程内 `createMockTransport`。
- `apps/web/src/main.tsx` 在 `VITE_ENABLE_API_MOCKING=true` 时，会启动 `msw` browser worker，由浏览器层 handler 拦截请求。

这两条路径在当前仓库里同时覆盖了 `dashboard`、`/account/login` 和 `/account/refresh` 等接口，导致以下问题：

- 本地开发时，同样叫“mock”，但不一定会发出浏览器网络请求，调试体验不稳定。
- mock 逻辑同时散落在 `app-client.ts` 和 `mocks/handlers.ts`，同一接口需要维护两份 adapter。
- 开发者和 AI 很难快速判断某个请求会不会出现在浏览器 `Network` 面板。
- 随着更多模块接入，运行时 mock 行为容易继续分叉，削弱数据访问路径的可预测性。

本次变更的目标不是重写数据访问分层，而是在保持现有 `contract -> service -> route/component` 结构不变的前提下，把运行时 mock 收敛到单一路径。

## 目标

- 让 `apps/web` 的运行时 mock 统一走 `fetch + msw`。
- 保留 `Transport` seam 作为测试注入能力，而不是运行时 mock 能力。
- 让本地开发、浏览器调试和本地 E2E 对运行时请求的观察方式保持一致。
- 减少同一接口在多个 module 中重复维护 mock 响应的情况。

## 非目标

- 不改变 `contract -> service -> route/component` 的既有分层。
- 不把所有单元测试都迁移为 `msw` 驱动测试。
- 不在本次改造中引入 API schema 校验、代码生成或新的数据访问库。
- 不重构认证、刷新 token、路由守卫或 QueryClient 结构。
- 不要求所有业务接口立刻补齐完整 mock 平台，只处理当前运行时已经覆盖的接口和本次迁移直接影响的路径。

## 范围级别

- 建议任务级别：`L2`
- 判定依据：
  - 不新增终端用户功能，但会改变本地开发和 E2E 的运行时数据来源。
  - 涉及应用级 client、`msw` handlers、环境配置说明和测试调整。
  - 变更集中在数据访问 seam 和 mock adapter，不扩展到 UI 架构或业务模块重写。

如果执行过程中发现大量测试或多个业务模块强依赖当前运行时内存 mock，则应暂停并升级为 `L3`，重新评估迁移切面和回归成本。

## 受影响边界

### 应用级 Client

`apps/web/src/lib/api/app-client.ts` 当前同时承担两类职责：

- 运行时根据环境选择真实 fetch 或内存 mock。
- 为测试提供 transport 注入 seam。

迁移后，该 module 应只保留：

- 运行时 transport 选择逻辑。
- 测试 transport 注入能力。

运行时内存 mock adapter 不再留在此 module 内。

### 浏览器层 Mock

`apps/web/src/mocks/handlers.ts` 应成为运行时 mock 的唯一 adapter 集中点。凡是浏览器开发模式下需要拦截的请求，都在这里注册 handler，并复用 `mocks/data/*` 中的 fixture 或 mock store。

### 启动与环境配置

`apps/web/src/main.tsx` 继续负责在 `VITE_ENABLE_API_MOCKING=true` 时启动 `msw` worker。

环境变量语义需要更加明确：

- `VITE_ENABLE_API_MOCKING=true`：运行时请求发出后由 `msw` 拦截。
- `VITE_ENABLE_API_MOCKING=false`：运行时请求直接发往真实 API base URL。
- 未启用 mock 且缺少必要 base URL 时，不再回退到运行时内存 mock，而是明确暴露配置错误。

### 测试边界

测试继续区分两类：

- transport seam 测试：使用 `setAppTransportForTests` / `resetAppTransportForTests` 注入假 transport，验证 client、service 和错误归一化行为。
- 浏览器运行时测试：在需要验证请求行为、`msw` 拦截或用户可见集成流程时，走 `fetch + msw` 路径。

## 建议方案

### 推荐方案

采用“运行时统一 `fetch + msw`，测试保留 transport 注入”的收敛方案。

具体规则如下：

1. `app-client.ts` 在运行时只创建 `fetch transport`。
2. `VITE_ENABLE_API_MOCKING=true` 时，`createFetchTransport()` 走同源请求，由 `msw` browser worker 拦截。
3. `VITE_ENABLE_API_MOCKING=false` 时，`app-client.ts` 必须使用 `VITE_API_BASE_URL` 创建真实 transport；缺失配置时直接抛错，不再回退内存 mock。
4. `createMockTransport` 继续保留在 `http-client.ts`，但只作为测试 seam，不参与运行时默认路径。
5. `mocks/handlers.ts` 统一承接 `dashboard`、登录、刷新和后续需要的 app 级运行时 mock。

### 为什么符合当前仓库模式

- 符合 ADR-0002 中“通用 transport、错误归一化和测试注入能力继续放在 `apps/web/src/lib/api`”的约定。
- 符合 `wms-client.ts` 已经采用的模式，即 mock 模式走同源 fetch，真实模式走带 base URL 的 fetch。
- 让运行时 seam 更单一，减少 `app-client.ts` 的 adapter 负担，提升 mock 规则的 locality。

## 备选方案

### 方案 A：一次性删除所有运行时内存 mock

直接在一个提交中同时修改 `app-client.ts`、所有相关测试、文档和 E2E 配置。

不推荐作为首选，原因是：

- 回归面较大，问题定位难度更高。
- 当前仓库的 app 级接口虽然不多，但已有测试可能隐式依赖回退行为。

### 方案 B：保留 dashboard 的运行时内存 mock，其他接口迁移到 MSW

该方案能减少一次性改动量，但不推荐长期采用，原因是：

- 仍会保留“同一项目里有些请求出现在 `Network`，有些不会”的不一致体验。
- 会继续弱化运行时 mock 的单一入口，后续更容易新增特例。

## 分阶段实施设计

### 阶段 1：统一 app client 的运行时 transport 规则

修改 `apps/web/src/lib/api/app-client.ts`：

- 删除运行时 `defaultTransport` 回退逻辑。
- 删除仅为运行时 mock 服务的本地 handler，例如 `handleDashboardStats`。
- 保留 `setAppTransportForTests` / `resetAppTransportForTests`。

迁移后的运行时分支建议为：

- mock 开启：`createFetchTransport()`
- mock 关闭：`createFetchTransport({ baseUrl, getToken })`
- mock 关闭且缺少 `VITE_API_BASE_URL`：抛出清晰错误

这里建议 app 级真实请求也统一传入 `getAccessToken`，保持 app API 与 WMS API 的认证路径一致；若当前后端尚不要求，可保留“无 token 也可请求”的兼容行为，由 `createFetchTransport` 按 token 是否存在决定是否写入 `Authorization`。

### 阶段 2：补齐并稳定 MSW handlers

确认 `apps/web/src/mocks/handlers.ts` 覆盖所有 app 级运行时 mock 接口：

- `GET /dashboard/stats`
- `POST /account/login`
- `POST /account/refresh`

同时把相关 fixture 与 store 继续留在 `apps/web/src/mocks/data/`，避免 handler 文件堆积业务细节。

如后续新增 app 级 mock 接口，也统一按相同模式接入 `handlers.ts`，不再向 `app-client.ts` 回填内存 mock。

### 阶段 3：修正测试分工

测试按 seam 重分工：

- `http-client.test.ts`：继续覆盖 transport 层行为，包括 token 注入、错误归一化和 `createMockTransport`。
- `app-client.test.ts`：调整为验证运行时 transport 选择规则，不再假设“缺少 base URL 会回退到运行时 mock”。
- `service` 级测试：优先使用 transport 注入，保持快速、稳定和定位清晰。
- 页面或浏览器集成测试：在确实需要验证运行时请求行为时，使用 `msw`。

### 阶段 4：更新文档和环境说明

至少需要更新以下文档：

- `apps/web/.env.example`：明确 `VITE_ENABLE_API_MOCKING` 的行为。
- `docs/specs/2026-05-25-web-operations-and-data-access.md`：把“默认 mock transport”调整为“运行时统一走 fetch，mock 由 MSW 提供”。
- 如决定长期固化该决策，可新增 ADR，记录“运行时 mock 收敛到 MSW，transport mock 限定为测试 seam”。

## 实现约束

- 不在 route 或组件中绕过 service 直接决定 mock 行为。
- 不把 `msw` handler 散落到多个业务页面附近；浏览器运行时 mock 继续集中在 `mocks/`。
- 不删除 `createMockTransport`，因为它仍是测试 seam 的有效 adapter。
- 不让 `app-client.ts` 和 `wms-client.ts` 再分别维护不同的运行时 mock 语义。

## 验证计划

实现完成后至少执行：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

如果本地 E2E 已覆盖登录和基础导航流程，建议额外执行：

```bash
pnpm --filter @repo/web-e2e test:e2e
```

需要重点验证的行为：

- `VITE_ENABLE_API_MOCKING=true` 时，登录、刷新和 dashboard 请求能够出现在浏览器 `Network` 中，并由 `Service Worker` 拦截。
- `VITE_ENABLE_API_MOCKING=false` 且配置 `VITE_API_BASE_URL` 时，`app-client` 通过真实 fetch 发起请求。
- `VITE_ENABLE_API_MOCKING=false` 且未配置 `VITE_API_BASE_URL` 时，应用在启动期或首次使用 client 时给出明确错误，而不是静默回退假数据。
- 既有 transport seam 测试仍可通过注入 transport 独立验证 client 和 service。

## 风险

- 部分测试可能隐式依赖当前运行时回退逻辑，迁移后会暴露出来。
- 如果 `handlers.ts` 漏配接口，mock 模式下的请求可能落到未处理状态，需要结合 `onUnhandledRequest` 策略检查。
- 真实 API base URL 的必填要求会让某些“之前能跑起来但其实在吃内存 mock”的场景变成显式失败，但这是有意收紧，用于提升规则清晰度。
- 如果 app API 与 WMS API 的认证约定并不一致，统一 token 注入时需要确认是否会影响真实环境。

## 验收标准

- `apps/web` 的运行时 mock 不再依赖 `app-client.ts` 内的 `createMockTransport` 回退。
- `apps/web` 在 mock 模式下的运行时请求统一通过 `fetch + msw` 完成。
- `createMockTransport` 仅作为测试 seam 保留，不参与应用默认运行时链路。
- 文档和环境模板明确说明 mock 模式与真实模式的配置语义。
- 定向测试通过，并能展示至少一条浏览器层请求被 `Service Worker` 拦截的验证证据。

## 需要更新的文档

- 新增本 spec：`docs/specs/2026-05-27-web-runtime-mock-unification-design.md`
- 新增实施计划：`docs/plans/2026-05-27-web-runtime-mock-unification.md`
- 更新 `docs/specs/2026-05-25-web-operations-and-data-access.md`
- 如确认决策长期生效，新增对应 ADR
