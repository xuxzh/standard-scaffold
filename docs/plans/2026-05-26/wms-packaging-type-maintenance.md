# WMS 包装类型维护 Implementation Plan

> For agentic workers: steps use checkbox syntax for tracking and should be executed in small, verifiable slices.

**Goal:** 在现有后台壳内交付包装类型维护 CRUD 页面，完成接口接入、列表筛选、表单操作和最小测试闭环。

**Architecture:** 按 `contract -> service -> queries -> page/component -> route` 分层实现。远程数据由 React Query 管理，页面仅负责装配筛选、选择和表单状态；WMS 请求统一通过 `getWmsClient()` 发起。

**Tech Stack:** React 19、TypeScript、TanStack Query、TanStack Table、React Hook Form、Zod、Vitest、Testing Library、sonner。

---

## 文件边界

新增或修改的核心文件：

- 修改 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
- 替换 `apps/web/src/features/mes/packaging/packaging-type/packaging-contract.ts`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-service.ts`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-queries.ts`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-filter-form.tsx`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-form-sheet.tsx`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-table.tsx`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-service.test.ts`
- 新增 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`
- 修改 `apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改 `apps/web/src/i18n/resources/en-US/common.ts`

## 切片 1：Contract 与 Service

- [ ] 定义前端消费类型、筛选模型、表单模型和分页常量。
- [ ] 先写 `packaging-type-service.test.ts`，覆盖查询/新增/编辑/单删/批删 5 个请求。
- [ ] 运行定向测试，确认失败原因是目标 service 尚不存在。
- [ ] 实现 `packaging-type-service.ts`，只做到让 service 测试通过。
- [ ] 再次运行定向测试，确认 service 层通过。

验证：

- `pnpm --filter @repo/web test -- packaging-type-service.test.ts`

## 切片 2：Queries 与缓存失效

- [ ] 追加 query hook 和 mutation hook。
- [ ] 统一包装 query key：`["wms", "packaging-type", "list", filters, page]`。
- [ ] mutation 成功后失效包装类型列表。
- [ ] 如有必要，为 payload 映射补充小型单测或类型验证。

验证：

- `pnpm --filter @repo/web typecheck`

## 切片 3：列表页基础状态

- [ ] 先写 `packaging-type-page.test.tsx` 的 loading、empty、error、list 渲染测试。
- [ ] 运行定向测试，确认页面因尚未实现列表结构而失败。
- [ ] 实现筛选区、错误态、表格骨架和分页状态。
- [ ] 让页面通过 query hook 获取数据并渲染。
- [ ] 再次运行页面测试，确认基础状态通过。

验证：

- `pnpm --filter @repo/web test -- packaging-type-page.test.tsx`

## 切片 4：表单与操作闭环

- [ ] 在页面测试中加入新增、编辑、删除、批量删除主流程断言。
- [ ] 运行测试，确认操作闭环尚未实现而失败。
- [ ] 实现 `Sheet` 表单、校验、toast、确认删除和批量删除。
- [ ] 让 mutation 成功后刷新列表并清理选中状态。
- [ ] 重新运行页面测试，确认关键交互通过。

验证：

- `pnpm --filter @repo/web test -- packaging-type-page.test.tsx`

## 切片 5：i18n 与回归验证

- [ ] 补齐 `zh-CN` / `en-US` 文案。
- [ ] 检查壳层页面标题与描述是否需要切换到包装类型维护语义。
- [ ] 运行 `apps/web` 范围测试与类型检查。

验证：

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 非目标提醒

- 不实现导入/导出/刷新/列设置。
- 不引入新的共享 UI 包。
- 不在 route 文件中增加请求逻辑。
