# WMS 包装规格维护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有后台壳内交付包装规格维护页面，完成 CRUD、包装类型和层级候选、宽表展示、路由导航、mock 数据和最小测试闭环。

**Architecture:** 按 `contract -> service -> queries -> page/component -> route` 分层实现。远程数据由 React Query 管理，页面负责协调筛选、分页、选择、弹窗和表单状态；WMS 请求统一通过 `getWmsClient()` 发起。

**Tech Stack:** React 19、TypeScript、TanStack Query、TanStack Table、React Hook Form、Zod、radix-ui Dialog、Vitest、Testing Library、MSW、sonner。

---

## 文件边界

新增核心文件：

- `apps/web/src/routes/packaging.packaging-spec.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/index.ts`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-contract.ts`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.ts`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-queries.ts`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.test.ts`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx`
- `apps/web/src/mocks/data/packaging-spec-store.ts`
- `apps/web/src/mocks/data/packaging-spec-store.test.ts`

修改核心文件：

- `apps/web/src/root-app.tsx`
- `apps/web/src/features/mes/packaging/index.ts`
- `apps/web/src/components/layout/app-sidebar.tsx`
- `apps/web/src/components/layout/admin-layout.tsx`
- `apps/web/src/app.test.tsx`
- `apps/web/src/mocks/handlers.ts`
- `apps/web/src/i18n/resources/zh-CN/common.ts`
- `apps/web/src/i18n/resources/en-US/common.ts`

## 切片 1：Contract、Mock Store 与 Service

- [ ] 新建 `packaging-spec-contract.ts`，定义 DTO、record、filters、form values、包装类型选项、包装层级选项、page size、默认筛选和映射函数。
- [ ] DTO 字段与接口文档保持一致，包含 `SpecCode`、`SpecName`、`PackagingTypeCode`、`PackagingTypeName`、`PackagingLevelCode`、`PackagingLevelName`、`BarcodeRuleCode`、`BarcodeRuleName`、尺寸重量、容量、堆叠、启用和审计字段。
- [ ] 新建 `packaging-spec-service.test.ts`，覆盖查询、包装类型候选、包装层级候选、新增、编辑、单删、批删 7 个请求。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-spec-service.test.ts`，预期失败原因是 service 文件尚未实现。
- [ ] 新建 `packaging-spec-service.ts`，封装以下接口：
  - `getPackagingSpecs`
  - `getPackagingSpecTypeOptions`
  - `getPackagingSpecLevelOptions`
  - `createPackagingSpec`
  - `updatePackagingSpec`
  - `deletePackagingSpec`
  - `deletePackagingSpecs`
- [ ] 新增 payload 包含全部必填字段和 `Remark: ""`；编辑 payload 使用 `NeedUpdateFields` 包装，并只传 `Id` 与允许编辑字段。
- [ ] 删除 payload helper 需要移除 `CompanyCode` 和 `FactoryCode`。
- [ ] 新建 `packaging-spec-store.ts` 和 `packaging-spec-store.test.ts`，为页面测试提供稳定 MSW 数据，覆盖筛选、分页、CRUD、批删和启用状态过滤。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-spec-service.test.ts packaging-spec-store.test.ts`，预期通过。

验证：

- `pnpm --filter @repo/web test -- packaging-spec-service.test.ts packaging-spec-store.test.ts`

## 切片 2：Queries 与缓存策略

- [ ] 新建 `packaging-spec-queries.ts`。
- [ ] 定义列表 query key：`["wms", "packaging-spec", "list", filters, pageIndex, refreshVersion]`。
- [ ] 定义包装类型候选 query key：`["wms", "packaging-spec", "packaging-type-options"]`。
- [ ] 定义包装层级候选 query key：`["wms", "packaging-spec", "packaging-level-options"]`。
- [ ] 实现列表 query，将空筛选映射为 `undefined`，启用状态映射为 `undefined | true | false`，固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现包装类型候选 query，调用包装类型查询接口并固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] 实现包装层级候选 query，调用包装层级查询接口并固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] 实现新增、编辑、删除、批量删除 mutations；成功后失效包装规格列表。
- [ ] 运行类型检查，确认 query hook 类型闭合。

验证：

- `pnpm --filter @repo/web typecheck`

## 切片 3：路由、导航与壳层

- [ ] 新建 `routes/packaging.packaging-spec.tsx`，导出 `PackagingSpecPage`。
- [ ] 修改 `features/mes/packaging/index.ts`，导出 `PackagingSpecPage`。
- [ ] 修改 `root-app.tsx`，注册 `/packaging/packaging-spec` 受认证路由。
- [ ] 修改 `app-sidebar.tsx`，在包装管理分组下新增包装规格维护入口，`data-testid` 使用 `sidebar-nav-packaging-packaging-spec`。
- [ ] 修改 `admin-layout.tsx`，增加 `/packaging/packaging-spec` 的标题和描述 key。
- [ ] 修改 `zh-CN/common.ts` 与 `en-US/common.ts`，补齐导航、页面标题和页面描述。
- [ ] 修改 `app.test.tsx`，增加新路由在后台壳内渲染、侧边栏入口存在、未登录跳转保留 redirect 的断言。
- [ ] 运行壳层测试，预期通过。

验证：

- `pnpm --filter @repo/web test -- app.test.tsx`

## 切片 4：列表页基础状态

- [ ] 新建 `packaging-spec-page.test.tsx`，先覆盖 loading、empty、error、列表渲染和筛选提交。
- [ ] 修改 `mocks/handlers.ts`，接入包装规格 query、create、update、delete、batch delete handlers，并在 `/__mock__/reset` 中支持 `packaging-spec`。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-spec-page.test.tsx`，预期因页面组件尚未实现而失败。
- [ ] 新建 `packaging-spec-page.tsx`，装配筛选状态、分页状态、选中状态、候选查询和查询结果。
- [ ] 新建 `packaging-spec-filter-form.tsx`，包含规格编码、规格名称、包装类型编码、启用状态、查询、重置。
- [ ] 新建 `packaging-spec-table.tsx`，展示勾选、序号、规格编码、规格名称、包装类型、包装层级、条码规则、尺寸重量、体积、容量、单位、堆叠、启用和操作列。
- [ ] 表格外层使用 `overflow-x-auto`，为宽表提供横向滚动。
- [ ] 实现列表 loading、empty、error、上一页、下一页和刷新按钮。
- [ ] 运行页面测试，确认基础状态通过。

验证：

- `pnpm --filter @repo/web test -- packaging-spec-page.test.tsx`

## 切片 5：新增/编辑表单闭环

- [ ] 在 `packaging-spec-page.test.tsx` 增加新增规格、编辑规格、包装类型自动带出名称、包装层级自动带出名称、长宽高自动计算体积的断言。
- [ ] 运行页面测试，预期表单流程尚未实现而失败。
- [ ] 新建 `packaging-spec-form-dialog.tsx`，使用 React Hook Form 和 Zod 管理表单。
- [ ] 表单字段包括规格编码、规格名称、包装类型编码、包装类型名称、包装层级编码、包装层级名称、条码规则编码、条码规则名称、长、宽、高、体积、最大承重、毛重、皮重、标准容量、单位、堆叠上限、启用。
- [ ] 编辑态将规格编码设为只读。
- [ ] 包装类型编码使用候选下拉，选择后自动展示包装类型名称。
- [ ] 包装层级编码使用候选下拉，选择后自动展示包装层级名称。
- [ ] 条码规则编码和名称首版使用文本输入；字段必填。
- [ ] 长、宽、高均为有效正数时，按 `length * width * height / 1_000_000` 写入体积字段，允许用户继续编辑体积。
- [ ] 提交成功后关闭弹窗、清理编辑记录、刷新列表。
- [ ] 提交失败时保留输入并展示后端错误消息。
- [ ] 运行页面测试，确认新增和编辑流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-spec-page.test.tsx`

## 切片 6：删除、批量删除与分页回退

- [ ] 在 `packaging-spec-page.test.tsx` 增加单删、批删、未选择时批删禁用、删除当前页最后一条后回退上一页的断言。
- [ ] 运行页面测试，预期删除流程尚未实现而失败。
- [ ] 在 `packaging-spec-page.tsx` 实现单删和批删确认、mutation 调用、toast 成功反馈、选中状态清理。
- [ ] 当当前页删除后为空且页码大于 `1`，回退到上一页。
- [ ] 运行页面测试，确认删除和分页回退流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-spec-page.test.tsx`

## 切片 7：i18n、全量回归与人工检查

- [ ] 补齐 `zh-CN/common.ts` 和 `en-US/common.ts` 中 `pages.packagingSpec` 的筛选、表格、表单、反馈和校验文案。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-spec`，确认用户可见文案均来自 i18n。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-spec`，确认 `CompanyCode` 和 `FactoryCode` 只出现在删除 payload 清理 helper 或相关测试断言中。
- [ ] 运行 `pnpm --filter @repo/web test`。
- [ ] 运行 `pnpm --filter @repo/web typecheck`。
- [ ] 启动本地开发服务并人工检查 `/packaging/packaging-spec` 的列表、筛选、表单和宽表横向滚动在桌面视口下不重叠。

验证：

- `rg "CompanyCode|FactoryCode" apps/web/src/features/mes/packaging/packaging-spec`
- `rg "[\\u4e00-\\u9fff]" apps/web/src/features/mes/packaging/packaging-spec`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 非目标提醒

- 不实现导入、导出、列设置和全屏。
- 不实现条码规则选择弹窗，除非后续补充候选查询接口。
- 不引入新的共享 UI 包。
- 不在 route 文件中增加请求逻辑。
