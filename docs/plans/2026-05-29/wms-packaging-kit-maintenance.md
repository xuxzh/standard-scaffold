# WMS 套包信息维护 Implementation Plan

> **修订说明（2026-07-13）：** 本文保留 2026-05 的历史设计与实施背景。六个包装模块现归属 MES，并统一使用 `getMesClient()`；正文中的 WMS 归属、`getWmsClient()`、`wms` Query Key 和旧 E2E 路径仅代表当时方案，不作为当前实现依据。WMS client、env、proxy、debug 配置和数据导入 module key 作为未来独立 WMS 集成基础设施继续保留。当前边界见 [ADR-0005](../../adr/0005-mes-packaging-wms-infrastructure-boundary.md)、[MES 数据接入模板](../../standards/mes-page-data-integration-template.md)、[接入计划](../2026-06-03/packaging-real-data-integration.md)和[验证报告](../../test-reports/2026-06-03/packaging-real-data-integration-report-1033.md)。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有后台壳内交付套包信息维护页面，完成 CRUD、主件/子件物料选择、子件数组维护、路由导航、mock 数据和最小测试闭环。

**Architecture:** 按 `contract -> service -> queries -> page/component -> route` 分层实现。远程数据由 React Query 管理，页面负责协调筛选、分页、选择、子件展开、套包弹窗、物料选择弹窗和表单状态；WMS 请求统一通过 `getWmsClient()` 发起。

**Tech Stack:** React 19、TypeScript、TanStack Query、TanStack Table、React Hook Form、Zod、radix-ui Dialog、Vitest、Testing Library、MSW、sonner。

---

## 文件边界

新增核心文件：

- `apps/web/src/routes/packaging.packaging-kit.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/index.ts`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-contract.ts`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-service.ts`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-queries.ts`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-filter-form.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-material-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-service.test.ts`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`
- `apps/web/src/mocks/data/packaging-kit-store.ts`
- `apps/web/src/mocks/data/packaging-kit-store.test.ts`

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

- [ ] 新建 `packaging-kit-contract.ts`，定义 DTO、record、child、filters、form values、material option、page size、默认筛选和映射函数。
- [ ] DTO 字段与接口文档保持一致，包含 `KitCode`、`KitName`、`MainMaterialCode`、`MainMaterialName`、`Unit`、`IsVirtualMain`、`ChildCount`、`Children`、`Remark` 和审计字段。
- [ ] 映射函数将 `Children` 缺失值归一为空数组，将 `ChildCount` 缺失值归一为 `children.length`。
- [ ] 新建 `packaging-kit-service.test.ts`，覆盖查询、物料候选查询、新增、编辑、单删、批删 6 个请求。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-kit-service.test.ts`，预期失败原因是 service 文件尚未实现。
- [ ] 新建 `packaging-kit-service.ts`，封装以下接口：
  - `getPackagingKits`
  - `getPackagingKitMaterialOptions`
  - `createPackagingKit`
  - `updatePackagingKit`
  - `deletePackagingKit`
  - `deletePackagingKits`
- [ ] `getPackagingKitMaterialOptions` 暂按 `/Material/GetMaterialAutoQueryDatas` 封装，入参包含 `MaterialCode`、`MaterialName`、`IsPaged`、`PageIndex`、`PageSize`。
- [ ] 新增 payload 包含全部必填字段和 `Children`，不包含 `ChildCount`。
- [ ] 编辑 payload 使用 `NeedUpdateFields` 包装，并只传 `Id`、`KitName`、`MainMaterialCode`、`MainMaterialName`、`Unit`、`IsVirtualMain`、`Children`、`Remark`。
- [ ] 删除 payload helper 需要移除 `CompanyCode` 和 `FactoryCode`。
- [ ] 新建 `packaging-kit-store.ts` 和 `packaging-kit-store.test.ts`，为页面测试提供稳定 MSW 数据，覆盖筛选、分页、CRUD、批删、子件数量计算、物料候选过滤和子件默认单位。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-kit-service.test.ts packaging-kit-store.test.ts`，预期通过。

验证：

- `pnpm --filter @repo/web test -- packaging-kit-service.test.ts packaging-kit-store.test.ts`

## 切片 2：Queries 与缓存策略

- [ ] 新建 `packaging-kit-queries.ts`。
- [ ] 定义列表 query key：`["wms", "packaging-kit", "list", filters, pageIndex, refreshVersion]`。
- [ ] 定义物料候选 query key：`["wms", "packaging-kit", "material-options", filters, pageIndex]`。
- [ ] 实现列表 query，将空筛选映射为 `undefined`，固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现物料候选 query，调用物料查询接口并固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现新增、编辑、删除、批量删除 mutations；成功后失效套包列表。
- [ ] 运行类型检查，确认 query hook 类型闭合。

验证：

- `pnpm --filter @repo/web typecheck`

## 切片 3：路由、导航与壳层

- [ ] 新建 `routes/packaging.packaging-kit.tsx`，导出 `PackagingKitPage`。
- [ ] 修改 `features/mes/packaging/index.ts`，导出 `PackagingKitPage`。
- [ ] 修改 `root-app.tsx`，注册 `/packaging/packaging-kit` 受认证路由。
- [ ] 修改 `app-sidebar.tsx`，在包装管理分组下新增套包信息维护入口，`data-testid` 使用 `sidebar-nav-packaging-packaging-kit`。
- [ ] 修改 `admin-layout.tsx`，增加 `/packaging/packaging-kit` 的标题和描述 key。
- [ ] 修改 `zh-CN/common.ts` 与 `en-US/common.ts`，补齐导航、页面标题和页面描述。
- [ ] 修改 `app.test.tsx`，增加新路由在后台壳内渲染、侧边栏入口存在、未登录跳转保留 redirect 的断言。
- [ ] 运行壳层测试，预期通过。

验证：

- `pnpm --filter @repo/web test -- app.test.tsx`

## 切片 4：列表页基础状态与子件查看

- [ ] 新建 `packaging-kit-page.test.tsx`，先覆盖 loading、empty、error、列表渲染、筛选提交和子件查看。
- [ ] 修改 `mocks/handlers.ts`，接入套包 query、create、update、delete、batch delete、material query handlers，并在 `/__mock__/reset` 中支持 `packaging-kit`。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-kit-page.test.tsx`，预期因页面组件尚未实现而失败。
- [ ] 新建 `packaging-kit-page.tsx`，装配筛选状态、分页状态、选中状态、子件展开状态、物料候选查询和查询结果。
- [ ] 新建 `packaging-kit-filter-form.tsx`，包含套包编码、套包名称、查询、重置。
- [ ] 新建 `packaging-kit-table.tsx`，展示勾选、子件展开、序号、套包编码、套包名称、主件物料编码、主件物料名称、单位、虚拟主件、子件数和操作列。
- [ ] 实现子件展开区或只读子件弹窗，展示子件编码、子件名称、数量和单位。
- [ ] 实现列表 loading、empty、error、上一页、下一页和刷新按钮。
- [ ] 运行页面测试，确认基础状态和子件查看通过。

验证：

- `pnpm --filter @repo/web test -- packaging-kit-page.test.tsx`

## 切片 5：物料选择弹窗

- [ ] 在 `packaging-kit-page.test.tsx` 增加主件物料选择、子件物料多选、物料搜索、未选择时确认禁用的断言。
- [ ] 运行页面测试，预期物料选择流程尚未实现而失败。
- [ ] 新建 `packaging-kit-material-dialog.tsx`，支持 `mode: "main" | "children"`。
- [ ] 主件模式使用单选，确认后回填主件编码、主件名称和单位。
- [ ] 子件模式使用多选，底部显示已选数量，未选择时确认按钮禁用。
- [ ] 弹窗筛选区包含物料编码、物料名称、查询、重置。
- [ ] 弹窗列表展示物料编码、物料名称和类型，选择器优先使用 checkbox 或 radio。
- [ ] 实现物料候选 loading、empty、error 和重试状态。
- [ ] 运行页面测试，确认物料选择流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-kit-page.test.tsx`

## 切片 6：新增/编辑表单闭环

- [ ] 在 `packaging-kit-page.test.tsx` 增加新增套包、编辑套包、主件与子件不能重复、子件去重、子件数量校验、删除子件的断言。
- [ ] 运行页面测试，预期表单流程尚未实现而失败。
- [ ] 新建 `packaging-kit-form-dialog.tsx`，使用 React Hook Form 和 Zod 管理表单。
- [ ] 表单字段包括套包编码、套包名称、主件物料编码、主件物料名称、单位、虚拟主件、备注和子件列表。
- [ ] 编辑态将套包编码设为只读。
- [ ] 主件物料编码使用选择输入，选择后自动展示主件物料名称和单位。
- [ ] 子件列表支持添加子件、删除子件、修改子件数量。
- [ ] 子件数量提交前转换为正整数。
- [ ] 表单校验要求至少一条子件，主件物料编码不能出现在子件列表中，子件编码不能重复。
- [ ] 提交成功后关闭弹窗、清理编辑记录、刷新列表。
- [ ] 提交失败时保留输入并展示后端错误消息。
- [ ] 运行页面测试，确认新增和编辑流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-kit-page.test.tsx`

## 切片 7：删除、批量删除与分页回退

- [ ] 在 `packaging-kit-page.test.tsx` 增加单删、批删、未选择时批删禁用、删除当前页最后一条后回退上一页的断言。
- [ ] 运行页面测试，预期删除流程尚未实现而失败。
- [ ] 在 `packaging-kit-page.tsx` 实现单删和批删确认、mutation 调用、toast 成功反馈、选中状态清理。
- [ ] 当当前页删除后为空且页码大于 `1`，回退到上一页。
- [ ] 运行页面测试，确认删除和分页回退流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-kit-page.test.tsx`

## 切片 8：i18n、全量回归与人工检查

- [ ] 补齐 `zh-CN/common.ts` 和 `en-US/common.ts` 中 `pages.packagingKit` 的筛选、表格、表单、物料选择、子件列表、反馈和校验文案。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-kit`，确认用户可见文案均来自 i18n。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-kit`，确认 `CompanyCode` 和 `FactoryCode` 只出现在删除 payload 清理 helper 或测试断言中。
- [ ] 运行 `pnpm --filter @repo/web test`。
- [ ] 运行 `pnpm --filter @repo/web typecheck`。
- [ ] 启动本地开发服务并人工检查 `/packaging/packaging-kit` 的列表、筛选、表单、物料选择弹窗和子件列表在桌面视口下不重叠。

验证：

- `rg "CompanyCode|FactoryCode" apps/web/src/features/mes/packaging/packaging-kit`
- `rg "[\\u4e00-\\u9fff]" apps/web/src/features/mes/packaging/packaging-kit`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 非目标提醒

- 不实现导入、导出、列设置和全屏。
- 不实现批量新增和批量修改页面入口。
- 不新增物料主数据维护页面。
- 不引入新的共享 UI 包。
- 不在 route 文件中增加请求逻辑。
