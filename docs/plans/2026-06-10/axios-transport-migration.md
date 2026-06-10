# Axios Transport 统一迁移实施计划

> **面向 Agent 执行者：** 使用测试驱动方式逐项完成，步骤使用复选框跟踪。

**目标：** 使用 Axios fetch adapter 替换四个 API client 的 fetch transport，同时
保持业务调用、鉴权刷新、错误模型、MSW 和测试注入行为不变。

**实现方式：** 保留 `Transport` 和 `HttpClient`，仅替换 transport adapter。
Axios 请求拦截器负责动态 URL、IP 改写、token 和请求头；`HttpClient` 继续负责
HTTP 状态、401 重放和业务响应。

**技术栈：** React 19、TypeScript、Axios、Vitest、MSW、pnpm。

---

## 文件清单

- 新建：`docs/adr/0004-web-axios-transport.md`
- 修改：`apps/web/src/lib/api/http-client.ts`
- 修改：`apps/web/src/lib/api/app-client.ts`
- 修改：`apps/web/src/lib/api/mes-client.ts`
- 修改：`apps/web/src/lib/api/wms-client.ts`
- 修改：`apps/web/src/lib/api/print-client.ts`
- 修改：`apps/web/package.json`
- 修改：`pnpm-lock.yaml`
- 修改：`docs/adr/0003-web-runtime-mock-unification.md`
- 修改：`docs/api/http-contract-guidelines.md`
- 测试：`apps/web/src/lib/api/http-client.test.ts`
- 测试：现有 App、MES、WMS client 测试
- 新建测试：`apps/web/src/lib/api/print-client.test.ts`

### 任务 1：锁定 Axios transport 契约

- [x] 在 `http-client.test.ts` 将 fetch transport 测试改为
  `createAxiosTransport`，新增动态 token、非 2xx、文本、空响应和取消请求断言。
- [x] 运行定向测试，确认因 `createAxiosTransport` 尚不存在而失败。
- [x] 添加 Axios 依赖。
- [x] 实现最小 `createAxiosTransport`，显式使用 fetch adapter 和
  `validateStatus: () => true`。
- [x] 运行 `http-client.test.ts`，确认新旧 HttpClient 契约全部通过。

### 任务 2：迁移四个应用级 client

- [x] 更新 App、MES、WMS client 测试，并为 Print client 新增等价请求测试。
- [x] 运行四个 client 测试，确认仍引用 `createFetchTransport` 的实现不能满足新
  契约。
- [x] 将 App、MES、WMS、Print client 统一改为 `createAxiosTransport`。
- [x] 删除 `createFetchTransport` 和仅服务于它的类型、解析函数。
- [x] 运行 `apps/web/src/lib/api` 相关测试。

### 任务 3：更新长期架构文档

- [x] 新增 ADR-0004，记录 Axios 只作为 transport 实现、业务层不直接依赖。
- [x] 更新 ADR-0003，将运行时 mock 描述调整为 Axios fetch adapter + MSW。
- [x] 更新 HTTP 接口契约规范，明确拦截器职责和禁止 feature 注册全局拦截器。
- [x] 检查文档不存在占位内容、职责冲突或未解释的行为变化。

### 任务 4：完整验证

- [x] 运行 Web 单元测试、类型检查和变更文件 lint。
- [x] 运行 API mock E2E，验证主数据请求链路。
- [ ] 运行 `pnpm verify`。
- [x] 检查 Git diff，确认没有业务 service API、错误类型或无关文件变化。

## 验证记录

- Web 单元测试、类型检查、变更文件 lint 和生产构建通过。
- API mock E2E 通过。
- 全量 Web lint 被两个既有 `react-hooks/refs` 错误阻塞，错误文件不在本次 diff。
- 全量 E2E 的接口加载用例通过，但后续筛选用例因页面对象对 Radix combobox 调用
  原生 `selectOption` 失败，错误文件不在本次 diff。
- `pnpm verify` 和 Turbo 子任务在当前终端环境中被命令包装层以
  `[ERROR] fetch failed` 中断，未进入有效的仓库级聚合验证。
