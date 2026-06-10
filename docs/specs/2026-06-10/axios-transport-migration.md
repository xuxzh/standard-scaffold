# Axios Transport 统一迁移设计

## 背景

当前 Web 应用通过 `Transport -> HttpClient -> feature service` 访问远程接口，
运行时 transport 使用原生 `fetch`。项目已经明确需要持续增加请求和响应横切
能力，继续在自定义 fetch transport 中逐项实现会扩大维护成本。

本次迁移在业务调用面尚未继续扩张前完成，以 Axios 实例和拦截器承载 transport
级横切能力，同时保留现有数据访问分层、鉴权刷新和错误模型。

## 目标

使用 Axios 的 fetch adapter 统一替换 App、MES、WMS、Print 四个 client 的运行时
transport，且不改变 feature service、React Query 和测试注入接口。

## 非目标

- 不让 feature 或页面直接依赖 Axios。
- 不开放业务模块动态注册全局拦截器的 API。
- 不新增请求超时、自动重试、日志、埋点、签名或租户协议。
- 不迁移现有 401 刷新、请求重放、`DataResult` 校验和错误归一化职责。
- 不改变 API base URL、mock、IP 改写或用户可见错误行为。

## 范围级别

- 任务级别：`L3` 受控 patch。
- 原计划按 `L2` 提出，但新增依赖且触及共享请求与鉴权链路，按仓库治理规则提升
  为 `L3`。
- 用户已明确批准本 spec 所列范围；AI 只执行该范围，不扩展新的横切能力。

## 受影响边界

- `apps/web/src/lib/api/http-client.ts`：新增 Axios transport，保留公共
  `Transport` 和 `HttpClient` 契约。
- `apps/web/src/lib/api/*-client.ts`：四个应用级 client 统一创建 Axios transport。
- `apps/web/package.json` 和 `pnpm-lock.yaml`：新增 Axios 运行时依赖。
- `docs/adr/` 和 `docs/api/http-contract-guidelines.md`：更新默认 transport 决策。

## 建议方案

新增 `createAxiosTransport(options)`：

1. 内部创建独立 Axios 实例并显式指定 `adapter: "fetch"`。
2. 设置 `validateStatus: () => true`，确保非 2xx 状态仍作为
   `TransportResponse` 返回，由 `HttpClient` 统一处理。
3. 请求拦截器在每次请求时：
   - 动态解析字符串或 getter 形式的 base URL；
   - 拼接请求 path；
   - 在生产构建中执行现有 IP 改写；
   - 动态读取 access token；
   - 设置 JSON 和 Bearer Authorization 请求头。
4. transport 调用 Axios 实例并把响应映射为 `{ status, data }`。
5. 保留原生 `AbortSignal` 透传，维持 React Query 取消请求行为。

`HttpClient` 继续负责 401 刷新和单次重放。这样重放时会再次经过 Axios 请求
拦截器，并读取刷新后的 token。

## 备选方案

### 直接在 service 中使用 Axios

拒绝。它会让底层库类型和异常结构扩散到业务层，并破坏现有测试注入边界。

### 把 401 和错误处理迁入 Axios 响应拦截器

拒绝。当前实现已经覆盖并发刷新合并、登录与刷新接口排除、单次重放和统一错误
模型；迁移这些职责会显著扩大回归面。

### 使用 Axios 默认 XHR adapter

拒绝。本次目标是引入拦截器能力，不需要同时改变 MSW、取消请求和底层网络适配
行为。

## 验证计划

- `http-client` 单元测试覆盖：
  - JSON 请求和响应；
  - 动态 base URL；
  - 每次请求动态读取 token；
  - 非 2xx 状态返回；
  - 文本、空响应和取消请求；
  - 生产环境 IP 改写。
- client 单元测试覆盖 mock 同源请求、环境 base URL 和测试 transport 注入。
- 现有鉴权测试继续证明并发 401 合并和单次重放。
- 执行：
  - `pnpm --filter @repo/web test`
  - `pnpm --filter @repo/web typecheck`
  - `pnpm --filter @repo/web lint`
  - `pnpm --filter @repo/web-e2e test:e2e`
  - `pnpm verify`

## 风险

- Axios 默认拒绝非 2xx 响应；遗漏 `validateStatus` 会绕过现有 401 和 HTTP 错误
  处理。
- Axios 默认的请求数据转换可能与 fetch 行为不同；测试必须锁定 JSON 和空响应。
- token 若只在实例创建时读取，刷新后重放会继续携带旧 token；必须在请求拦截器
  中动态读取。
- runtime mock 决策原文使用了 `fetch + MSW`；迁移后应明确为
  `Axios fetch adapter + MSW`，同时保持行为不变。

## 需要更新的文档

- 新增 Axios transport ADR。
- 更新 `docs/api/http-contract-guidelines.md` 的默认 transport 约定。
- 更新 ADR-0003 中运行时 mock 的底层描述。
