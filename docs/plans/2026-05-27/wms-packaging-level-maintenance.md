# WMS 包装层级维护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有后台壳内交付包装层级维护页面，完成 CRUD、父级约束、关系图查看、路由导航和最小测试闭环。

**Architecture:** 按 `contract -> service -> queries -> page/component -> route` 分层实现。远程数据由 React Query 管理，页面负责协调筛选、分页、选择、弹窗和表单状态；WMS 请求统一通过 `getWmsClient()` 发起。

**Tech Stack:** React 19、TypeScript、TanStack Query、TanStack Table、React Hook Form、Zod、radix-ui Dialog、Vitest、Testing Library、MSW、sonner。

---

## 文件边界

新增核心文件：

- `apps/web/src/components/ui/dialog.tsx`
- `apps/web/src/routes/packaging.packaging-level.tsx`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-contract.ts`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-service.ts`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-queries.ts`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-filter-form.tsx`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-tree-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-service.test.ts`
- `apps/web/src/features/mes/packaging/packaging-level/packaging-level-page.test.tsx`
- `apps/web/src/mocks/data/packaging-level-store.ts`
- `apps/web/src/mocks/data/packaging-level-store.test.ts`

修改核心文件：

- `apps/web/src/root-app.tsx`
- `apps/web/src/components/layout/app-sidebar.tsx`
- `apps/web/src/components/layout/admin-layout.tsx`
- `apps/web/src/app.test.tsx`
- `apps/web/src/mocks/handlers.ts`
- `apps/web/src/i18n/resources/zh-CN/common.ts`
- `apps/web/src/i18n/resources/en-US/common.ts`

## 切片 1：Contract、Mock Store 与 Service

- [ ] 新建 `packaging-level-contract.ts`，定义 DTO、record、filters、form values、tree node、page size、默认筛选和映射函数。
- [ ] 新建 `packaging-level-service.test.ts`，覆盖查询、选项查询、关系图、新增、编辑、单删、批删 7 个请求。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-level-service.test.ts`，预期失败原因是 service 文件尚未实现。
- [ ] 新建 `packaging-level-service.ts`，封装以下接口：
  - `getPackagingLevels`
  - `getPackagingLevelOptions`
  - `getPackagingLevelTree`
  - `createPackagingLevel`
  - `updatePackagingLevel`
  - `deletePackagingLevel`
  - `deletePackagingLevels`
- [ ] 删除 payload helper 需要移除 `CompanyCode` 和 `FactoryCode`；编辑 payload 使用 `NeedUpdateFields` 包装。
- [ ] 新建 `packaging-level-store.ts` 和 `packaging-level-store.test.ts`，为页面测试提供稳定 MSW 数据，覆盖筛选、分页、CRUD、批删和树构建。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-level-service.test.ts packaging-level-store.test.ts`，预期通过。

验证：

- `pnpm --filter @repo/web test -- packaging-level-service.test.ts packaging-level-store.test.ts`

## 切片 2：Queries 与缓存策略

- [ ] 新建 `packaging-level-queries.ts`。
- [ ] 定义列表 query key：`["wms", "packaging-level", "list", filters, pageIndex, refreshVersion]`。
- [ ] 定义选项 query key：`["wms", "packaging-level", "options"]`。
- [ ] 定义关系图 query key：`["wms", "packaging-level", "tree"]`。
- [ ] 实现列表 query，将空筛选映射为 `undefined`，固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现选项 query，固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] 实现关系图 query，通过 `enabled: open` 控制弹窗打开时拉取。
- [ ] 实现新增、编辑、删除、批量删除 mutations；成功后失效列表、选项和树 query。
- [ ] 运行类型检查，确认 query hook 类型闭合。

验证：

- `pnpm --filter @repo/web typecheck`

## 切片 3：基础 UI、路由与导航壳

- [ ] 新建 `apps/web/src/components/ui/dialog.tsx`，封装 `Dialog`、`DialogContent`、`DialogHeader`、`DialogFooter`、`DialogTitle`、`DialogDescription`、`DialogClose`。
- [ ] 新建 `routes/packaging.packaging-level.tsx`，导出 `PackagingLevelPage`。
- [ ] 修改 `root-app.tsx`，注册 `/packaging/packaging-level` 受认证路由。
- [ ] 修改 `app-sidebar.tsx`，在包装管理分组下新增包装层级维护入口，`data-testid` 使用 `sidebar-nav-packaging-packaging-level`。
- [ ] 修改 `admin-layout.tsx`，增加 `/packaging/packaging-level` 的标题和描述 key。
- [ ] 修改 `zh-CN/common.ts` 与 `en-US/common.ts`，补齐导航、页面标题和页面描述。
- [ ] 修改 `app.test.tsx`，增加新路由在后台壳内渲染、侧边栏入口存在、未登录跳转保留 redirect 的断言。
- [ ] 运行壳层测试，预期通过。

验证：

- `pnpm --filter @repo/web test -- app.test.tsx`

## 切片 4：列表页基础状态

- [ ] 新建 `packaging-level-page.test.tsx`，先覆盖 loading、empty、error、列表渲染和筛选提交。
- [ ] 修改 `mocks/handlers.ts`，接入包装层级 query、tree、create、update、delete、batch delete handlers。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-level-page.test.tsx`，预期因页面组件尚未实现而失败。
- [ ] 新建 `packaging-level-page.tsx`，装配筛选状态、分页状态、选中状态和查询结果。
- [ ] 新建 `packaging-level-filter-form.tsx`，包含层级编码、层级名称、父级层级下拉、查询、重置。
- [ ] 新建 `packaging-level-table.tsx`，展示勾选、序号、层级编码、层级序号、层级名称、上级层级编码、上级层级名称、描述、操作列。
- [ ] 实现列表 loading、empty、error toast、上一页、下一页和刷新按钮。
- [ ] 运行页面测试，确认基础状态通过。

验证：

- `pnpm --filter @repo/web test -- packaging-level-page.test.tsx`

## 切片 5：新增/编辑表单闭环

- [ ] 在 `packaging-level-page.test.tsx` 增加新增层级、编辑层级、层级序号为 1 时清空父级、父级候选只展示更小序号层级的断言。
- [ ] 运行页面测试，预期表单流程尚未实现而失败。
- [ ] 新建 `packaging-level-form-dialog.tsx`，使用 React Hook Form 和 Zod 管理表单。
- [ ] 表单字段包括层级编码、层级序号、层级名称、上级层级编码、上级层级名称、描述。
- [ ] 编辑态将层级编码设为只读。
- [ ] 当层级序号为 `1` 时，禁用父级下拉并清空父级值。
- [ ] 当层级序号大于 `1` 时，父级候选过滤为 `option.levelSequence < currentLevelSequence`。
- [ ] 选择父级后自动展示父级层级名称。
- [ ] 提交成功后关闭弹窗、清理编辑记录、刷新列表和选项。
- [ ] 提交失败时保留输入并展示后端错误消息。
- [ ] 运行页面测试，确认新增和编辑流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-level-page.test.tsx`

## 切片 6：删除、批量删除与关系图

- [ ] 在 `packaging-level-page.test.tsx` 增加单删、批删、关系图 loading、关系图 empty、关系图 error、关系图树节点渲染断言。
- [ ] 运行页面测试，预期删除和关系图流程尚未实现而失败。
- [ ] 在 `packaging-level-page.tsx` 实现单删和批删确认、mutation 调用、toast 成功反馈、选中状态清理。
- [ ] 当当前页删除后为空且页码大于 `1`，回退到上一页。
- [ ] 新建 `packaging-level-tree-dialog.tsx`，递归渲染 `PackagingLevelTreeNode.children`。
- [ ] 关系图弹窗打开时启用 tree query，展示 loading、empty、error、success 四种状态。
- [ ] 关系图错误态提供重试按钮，调用 `query.refetch()`。
- [ ] 运行页面测试，确认删除和关系图流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-level-page.test.tsx`

## 切片 7：i18n、全量回归与人工检查

- [ ] 补齐 `zh-CN/common.ts` 和 `en-US/common.ts` 中 `pages.packagingLevel` 的筛选、表格、表单、关系图、反馈和校验文案。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-level`，确认用户可见文案均来自 i18n。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-level`，确认 `CompanyCode` 和 `FactoryCode` 只出现在删除 payload 清理 helper 或相关测试断言中。
- [ ] 运行 `pnpm --filter @repo/web test`。
- [ ] 运行 `pnpm --filter @repo/web typecheck`。
- [ ] 启动本地开发服务并人工检查 `/packaging/packaging-level` 的列表、表单和关系图在桌面视口下不重叠。

验证：

- `rg "CompanyCode|FactoryCode" apps/web/src/features/mes/packaging/packaging-level`
- `rg "[\\u4e00-\\u9fff]" apps/web/src/features/mes/packaging/packaging-level`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 非目标提醒

- 不实现导入、导出、列设置和全屏。
- 不实现关系图拖拽或树节点内联编辑。
- 不引入新的共享 UI 包。
- 不在 route 文件中增加请求逻辑。
