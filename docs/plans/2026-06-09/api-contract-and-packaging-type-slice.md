# 自有 API 契约与包装类型第一切片计划

## Summary

- 任务级别：L2。
- 目标：新增 NestJS + Prisma + PostgreSQL API 工程骨架，落地 `REST + camelCase + XzHttpResponse<T>` 契约。
- 第一切片只覆盖包装类型 CRUD，作为后续包装层级、规格、套包、规则和物料包装关系的模板。

## Key Changes

- 新增 `apps/api` workspace，包含 NestJS 启动入口、全局响应拦截器、异常过滤器、ValidationPipe 配置、Prisma schema 和包装类型模块。
- 请求/响应模型参考 `docs/business/api/request.model.ts`、`docs/business/api/response.model.ts`，但修正 JSON 时间戳和分页泛型类型安全。
- 包装类型接口采用：
  - `GET /api/packaging/types`
  - `POST /api/packaging/types`
  - `PATCH /api/packaging/types/:id`
  - `DELETE /api/packaging/types/:id`
  - `POST /api/packaging/types:batch-delete`
- 前端新增自有 API client，解析 `XzHttpResponse<T>` 与 `XzPageResponse<T>`。
- 迁移包装类型 service/query 到 `data.records`、`data.total`，页面 record 层保持稳定。

## Test Plan

- 后端先写失败测试，再实现：
  - 响应包装 interceptor。
  - 异常过滤器和校验错误结构。
  - 分页、排序字段白名单和租户过滤。
  - 包装类型 service CRUD。
- 前端先写失败测试，再实现：
  - 自有 API client 响应解析。
  - 包装类型 service REST 请求和响应映射。
- 最小验证：
  - `pnpm --filter @repo/api test`
  - `pnpm --filter @repo/api typecheck`
  - `pnpm --filter @repo/web test -- --run src/lib/api/xz-api-client.test.ts src/features/mes/packaging/packaging-type/packaging-type-service.test.ts`
  - `pnpm --filter @repo/web typecheck`

## Assumptions

- `docs/business/api/*.ts` 是新 API 契约来源之一，可以做类型安全和 JSON 兼容性优化。
- 第一切片不完整实现 JWT 登录；包装类型 service 必须显式接收租户上下文，后续 auth guard 再把 JWT claims 映射为租户上下文。
- Prisma schema 先覆盖包装类型表，后续业务模块按同样租户和审计字段模式扩展。
