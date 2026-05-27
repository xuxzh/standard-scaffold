# Token 上下文接口迁移 Spec

日期：2026-05-27

## 背景

当前部分 WMS 接口请求体依赖 `CompanyCode` 和 `FactoryCode` 表达当前用户所属公司与工厂。后续接口契约将改为通过通用 `Authorization: Bearer {token}` 传递用户身份，由后端从 token 或服务端会话解析公司与工厂上下文，前端不再在业务 payload 中传递这两个字段。

仓库现状：

- `apps/web/src/lib/api/http-client.ts` 的 `createFetchTransport` 已支持 `getToken` 并可自动写入 `Authorization` 请求头。
- `apps/web/src/lib/api/wms-client.ts` 尚未把 token provider 接入 WMS transport。
- `ApiQueryParams` 仍暴露 `CompanyCode`、`FactoryCode`。
- 包装类型维护模块仍把查询返回记录映射回删除 payload，并包含 `CompanyCode`、`FactoryCode`。
- `docs/api/common-api-spec.md` 和包装类型接口文档中仍有把租户字段放入请求示例的内容。

## 目标

- WMS 远程请求统一通过 transport 注入 bearer token。
- 前端业务请求体不再主动构造或补充 `CompanyCode`、`FactoryCode`。
- 通用查询参数类型不再暴露租户字段。
- 包装类型维护的单删和批删请求不依赖 `CompanyCode`、`FactoryCode`。
- 文档明确 token 是用户与租户上下文来源。

## 非目标

- 不实现完整登录页、刷新 token、权限控制或路由守卫。
- 不改变 `DataResult<T>` 响应模型。
- 不要求后端立刻从响应 DTO 移除 `CompanyCode`、`FactoryCode`。
- 不改造尚未在代码中出现的业务模块。
- 不调整 React Query、路由、Provider 顺序或应用壳层结构。

## 契约设计

### 请求认证

所有调用 WMS 后端的真实网络请求都应包含：

```http
Authorization: Bearer {token}
```

token 由统一 token provider 提供。当前实现只提供最小读取能力，优先从浏览器存储读取访问令牌，后续登录模块可以复用同一边界写入、清理或替换 token 来源。

### 租户上下文

`CompanyCode` 和 `FactoryCode` 不再作为前端请求参数。后端应从 token 中解析当前用户上下文，并在服务端完成数据隔离、默认赋值、权限校验和审计字段填充。

### 响应兼容

过渡期内，接口响应 DTO 可以继续返回 `CompanyCode` 和 `FactoryCode`。前端允许在 DTO 类型中保留可选字段，但不得依赖这些字段构造请求。

## 前端架构

### Token 边界

新增 `apps/web/src/lib/auth/token-store.ts`，作为当前最小 token 边界：

- `getAccessToken()`：从 `localStorage` 读取 access token。
- `setAccessTokenForTests()`：供测试或未来登录流程写入 token。
- `clearAccessTokenForTests()`：供测试清理 token。

命名带 `ForTests` 的写入 API 当前只服务测试闭环，避免在没有完整认证设计前扩大业务语义。

### WMS Client

`apps/web/src/lib/api/wms-client.ts` 创建真实 WMS transport 时传入 `getAccessToken`：

- mock 模式继续走同源 fetch，保持 MSW 和本地测试行为。
- 真实 WMS base URL 模式自动带上 bearer token。
- 缺少 token 时不注入 `Authorization`，由后端按认证规则返回 401/403。

### 业务模块

包装类型模块调整为：

- `ApiQueryParams` 仅保留分页参数。
- 删除 payload 从前端 record 映射为业务 DTO 时不再包含 `CompanyCode`、`FactoryCode`。
- DTO 类型可继续保留可选响应字段，以兼容后端返回和 mock fixture。
- 页面展示不使用租户字段。

## 测试策略

- `wms-client.test.ts` 增加断言：设置 token 后，真实 WMS 请求包含 `Authorization: Bearer ...`。
- `packaging-type-service.test.ts` 保持查询、新增、编辑 payload 不含租户字段。
- `packaging-type-page.test.tsx` 增加或更新删除行为断言，确保页面发起删除时不会把 `CompanyCode`、`FactoryCode` 放进请求体。
- `http-client.test.ts` 现有 bearer token 测试继续覆盖 transport 层行为。

## 文档更新

- `docs/api/common-api-spec.md`：明确 `Authorization` 是用户身份和公司/工厂上下文来源，业务请求体不传 `CompanyCode`、`FactoryCode`。
- `docs/business/wms/packaging/packaging-type/api.md`：移除请求示例里的 `CompanyCode`、`FactoryCode`，并说明响应可选兼容字段。

## 验收标准

- WMS client 在配置 base URL 且存在 access token 时发送 bearer token。
- 包装类型单删和批删请求体不包含 `CompanyCode`、`FactoryCode`。
- TypeScript 类型不再鼓励业务查询传租户字段。
- 定向测试通过：`pnpm --filter @repo/web test`。
- 文档中请求示例不再要求前端传租户字段。
