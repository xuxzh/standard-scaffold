# Web 业务模块组织规范

本文档定义 `apps/web` 中业务模块的默认组织方式。它适用于包装、盘点、上架、出库等会逐步增长的业务功能。

## 默认目录结构

WMS 相关模块默认放在 `apps/web/src/features/mes/<module>`：

```txt
apps/web/src/features/mes/
  packaging/
    packaging-contract.ts
    packaging-service.ts
    packaging-queries.ts
    packaging-page.tsx
    packaging-table.tsx
    packaging-form.tsx
    packaging-service.test.ts
    packaging-page.test.tsx
  inventory/
    inventory-contract.ts
    inventory-service.ts
    inventory-queries.ts
    inventory-page.tsx
  shared/
    wms-types.ts
    wms-formatters.ts
```

业务域使用二级目录，例如 `features/mes/packaging`、`features/mes/inventory`。如果未来出现非 WMS 模块，可以使用相同模式，例如 `features/finance/billing`。

## 文件职责

- `*-contract.ts`：定义前端消费侧类型、查询条件、枚举、稳定 mock 或初始数据。
- `*-service.ts`：调用 API client，处理接口响应适配和错误归一化。
- `*-queries.ts`：封装 React Query key、query hook、mutation hook 和失效策略。
- `*-page.tsx`：模块页面装配，表达用户可见状态，不直接写底层 HTTP 请求。
- `*-table.tsx`、`*-form.tsx`：模块内业务组件，优先留在模块目录内。
- `*.test.ts`、`*.test.tsx`：和被测模块放在一起，覆盖 service、query、page 或关键交互。

新增远程资源时，继续沿用 `contract -> service/query -> route/component` 分层。route 文件只负责路由装配和壳层接入。

## Route 边界

模块路由放在 `apps/web/src/routes`，命名按路径展开：

```txt
apps/web/src/routes/wms.packaging.tsx
apps/web/src/routes/wms.inventory.tsx
```

route 文件应保持轻量，只导入 feature page 并交给 `AdminLayout` 渲染。不要在 route 中写请求逻辑、复杂表格状态或业务表单。

## 共享代码上提规则

模块内组件和工具默认留在模块目录。只有满足以下条件之一时，才上提到 `features/mes/shared`：

- 已被两个或更多 WMS 模块使用。
- 表达的是稳定 WMS 领域概念，例如仓库、库区、货品、单据状态或权限。
- 上提后不会让调用方依赖另一个具体模块的内部语义。

与业务无关的基础 UI 能力继续优先放在 `apps/web/src/components`。除非明确需要跨 workspace 共享，否则不要迁移到 `packages/ui`。

## 导航与文案

- 后台主导航继续由 `AppSidebar` 承载。
- 页面标题和描述继续由 `AdminLayout` 根据当前路径选择。
- 新模块文案应同步补充 `zh-CN` 和 `en-US` 资源。
- 用户可见文案不要直接硬编码在 route 或壳层组件里。

## 验证要求

新增业务模块至少应具备：

- route 或 page 测试，验证页面能在 `AdminLayout` 中渲染。
- service 测试，如果模块接入真实 API 或做响应适配。
- 影响导航、路由、语言或壳层时，运行 `pnpm --filter @repo/web test` 和 `pnpm --filter @repo/web typecheck` 的相关检查。

涉及主业务链路、权限、跨页面状态或关键操作闭环时，应评估是否补充 `apps/web-e2e` 覆盖。
