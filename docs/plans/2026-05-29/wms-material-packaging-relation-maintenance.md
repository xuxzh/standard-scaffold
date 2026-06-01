# WMS 物料包装关系维护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有后台壳内交付物料包装关系维护页面，完成物料侧栏筛选、CRUD、包装规则明细回填、明细展平列表、路由导航、mock 数据和最小测试闭环。

**Architecture:** 按 `contract -> service -> queries -> page/component -> route` 分层实现。远程数据由 React Query 管理，页面负责协调物料侧栏、筛选、分页、选择、关系弹窗、物料选择弹窗、包装规则选择弹窗和表单状态；WMS 请求统一通过 `getWmsClient()` 发起。

**Tech Stack:** React 19、TypeScript、TanStack Query、TanStack Table、React Hook Form、Zod、radix-ui Dialog、Vitest、Testing Library、MSW、sonner。

---

## 文件边界

新增核心文件：

- `apps/web/src/routes/packaging.material-packaging-relation.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/index.ts`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-contract.ts`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-service.ts`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-queries.ts`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-material-sidebar.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-filter-form.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-material-dialog.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-rule-dialog.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.tsx`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-service.test.ts`
- `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx`
- `apps/web/src/mocks/data/material-packaging-relation-store.ts`
- `apps/web/src/mocks/data/material-packaging-relation-store.test.ts`

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

- [ ] 新建 `material-packaging-relation-contract.ts`，定义 DTO、record、detail、table row、filters、form values、material option、packaging rule option、page size、默认筛选和映射函数。
- [ ] DTO 字段与接口文档保持一致，包含 `Id`、`MaterialCode`、`MaterialName`、`PackagingRuleCode`、`PackagingRuleName`、`Details`、`Remark` 和审计字段。
- [ ] 映射函数将 `Details` 缺失值归一为空数组，并提供 `flattenMaterialPackagingRelationRows(records)`，将主表记录展平为表格行。
- [ ] 展平行的 `rowId` 使用 `${relationId}:${detailIndex ?? "empty"}`；无明细记录生成一条 `detail: null` 的行。
- [ ] 新建 `material-packaging-relation-service.test.ts`，覆盖查询、物料候选查询、包装规则候选查询、新增、编辑、单删、批删 7 个请求。
- [ ] 运行 `pnpm --filter @repo/web test -- material-packaging-relation-service.test.ts`，预期失败原因是 service 文件尚未实现。
- [ ] 新建 `material-packaging-relation-service.ts`，封装以下接口：
  - `getMaterialPackagingRelations`
  - `getMaterialPackagingRelationMaterialOptions`
  - `getMaterialPackagingRelationRuleOptions`
  - `createMaterialPackagingRelation`
  - `updateMaterialPackagingRelation`
  - `deleteMaterialPackagingRelation`
  - `deleteMaterialPackagingRelations`
- [ ] `getMaterialPackagingRelationMaterialOptions` 暂按 `/Material/GetMaterialAutoQueryDatas` 封装，入参包含 `MaterialCode`、`MaterialName`、`IsPaged`、`PageIndex`、`PageSize`。
- [ ] `getMaterialPackagingRelationRuleOptions` 调用 `/PackagingRuleApi/GetPackagingRuleAutoQueryDatas`，入参包含 `RuleCode`、`RuleName`、`IsPaged`、`PageIndex`、`PageSize`。
- [ ] 包装规则明细转换为关系明细时，`Quantity` 优先取规则明细 `StandardQuantity`；缺失时回退为 `1`，并在 service 测试中固定该适配。
- [ ] 新增 payload 包含 `MaterialCode`、`MaterialName`、`PackagingRuleCode`、`PackagingRuleName`、`Details` 和 `Remark`，不包含 `CompanyCode`、`FactoryCode`。
- [ ] 编辑 payload 使用 `NeedUpdateFields` 包装，并只传 `Id`、`MaterialName`、`PackagingRuleName`、`Details`、`Remark`。
- [ ] 删除 payload helper 需要移除 `CompanyCode` 和 `FactoryCode`，单删和批删都传业务 DTO 对象，不只传 `Id`。
- [ ] 新建 `material-packaging-relation-store.ts` 和 `material-packaging-relation-store.test.ts`，为页面测试提供稳定 MSW 数据，覆盖筛选、分页、CRUD、批删、明细展平、物料候选过滤、包装规则候选过滤和规则明细转换。
- [ ] 运行 `pnpm --filter @repo/web test -- material-packaging-relation-service.test.ts material-packaging-relation-store.test.ts`，预期通过。

验证：

- `pnpm --filter @repo/web test -- material-packaging-relation-service.test.ts material-packaging-relation-store.test.ts`

## 切片 2：Queries 与缓存策略

- [ ] 新建 `material-packaging-relation-queries.ts`。
- [ ] 定义列表 query key：`["wms", "material-packaging-relation", "list", filters, selectedMaterialCode, pageIndex, refreshVersion]`。
- [ ] 定义物料候选 query key：`["wms", "material-packaging-relation", "material-options", keyword, pageIndex, usage]`。
- [ ] 定义包装规则候选 query key：`["wms", "material-packaging-relation", "rule-options", filters, pageIndex]`。
- [ ] 实现列表 query，将空筛选映射为 `undefined`，固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现物料候选 query，调用物料查询接口并固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现包装规则候选 query，调用包装规则查询接口并固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现新增、编辑、删除、批量删除 mutations；成功后失效物料包装关系列表。
- [ ] 运行类型检查，确认 query hook 类型闭合。

验证：

- `pnpm --filter @repo/web typecheck`

## 切片 3：路由、导航与壳层

- [ ] 新建 `routes/packaging.material-packaging-relation.tsx`，导出 `MaterialPackagingRelationPage`。
- [ ] 修改 `features/mes/packaging/index.ts`，导出 `MaterialPackagingRelationPage`。
- [ ] 修改 `root-app.tsx`，注册 `/packaging/material-packaging-relation` 受认证路由。
- [ ] 修改 `app-sidebar.tsx`，在包装管理分组下新增物料包装关系入口，`data-testid` 使用 `sidebar-nav-packaging-material-packaging-relation`。
- [ ] 修改 `admin-layout.tsx`，增加 `/packaging/material-packaging-relation` 的标题和描述 key。
- [ ] 修改 `zh-CN/common.ts` 与 `en-US/common.ts`，补齐导航、页面标题和页面描述。
- [ ] 修改 `app.test.tsx`，增加新路由在后台壳内渲染、侧边栏入口存在、未登录跳转保留 redirect 的断言。
- [ ] 运行壳层测试，预期通过。

验证：

- `pnpm --filter @repo/web test -- app.test.tsx`

## 切片 4：列表页基础状态与物料侧栏

- [ ] 新建 `material-packaging-relation-page.test.tsx`，先覆盖 loading、empty、error、列表展平渲染、右侧筛选提交、左侧物料搜索和点击物料筛选。
- [ ] 修改 `mocks/handlers.ts`，接入物料包装关系 query、create、update、delete、batch delete、material query、packaging rule query handlers，并在 `/__mock__/reset` 中支持 `material-packaging-relation`。
- [ ] 运行 `pnpm --filter @repo/web test -- material-packaging-relation-page.test.tsx`，预期因页面组件尚未实现而失败。
- [ ] 新建 `material-packaging-relation-page.tsx`，装配物料搜索状态、选中物料、筛选状态、分页状态、选中关系、候选查询和列表查询结果。
- [ ] 新建 `material-packaging-relation-material-sidebar.tsx`，包含物料搜索输入、物料列表、选中态、清除选择、loading、empty、error 和重试。
- [ ] 新建 `material-packaging-relation-filter-form.tsx`，包含物料编码、物料名称、包装规则编码、包装规则名称、查询、重置。
- [ ] 新建 `material-packaging-relation-table.tsx`，展示勾选、序号、物料编码、物料名称、包装规则编码、包装规则名称、明细字段、备注、包装类型和操作列。
- [ ] 操作列包含编辑和删除。
- [ ] 批量选择按 `relationId` 去重；同一关系多条明细被选中时只保留一条待删除 DTO。
- [ ] 实现列表 loading、empty、error、上一页、下一页和刷新按钮。
- [ ] 运行页面测试，确认基础状态和物料侧栏通过。

验证：

- `pnpm --filter @repo/web test -- material-packaging-relation-page.test.tsx`

## 切片 5：物料与包装规则选择弹窗

- [ ] 在 `material-packaging-relation-page.test.tsx` 增加表单内物料选择、包装规则搜索、选择包装规则后回填规则名称和明细、候选加载失败重试的断言。
- [ ] 运行页面测试，预期选择弹窗流程尚未实现而失败。
- [ ] 新建 `material-packaging-relation-material-dialog.tsx`，用于表单内物料单选。
- [ ] 物料弹窗筛选区包含物料编码或名称关键字、查询、重置。
- [ ] 物料弹窗列表展示物料编码、物料名称和类型，使用 radio 或单选 checkbox，未选择时确认按钮禁用。
- [ ] 新建 `material-packaging-relation-rule-dialog.tsx`，用于包装规则单选。
- [ ] 包装规则弹窗筛选区包含规则编码、规则名称、查询、重置。
- [ ] 包装规则弹窗列表展示规则编码、规则名称和明细数量，未选择时确认按钮禁用。
- [ ] 确认包装规则后，表单回填 `PackagingRuleCode`、`PackagingRuleName`，并将规则明细转换为关系明细初始值。
- [ ] 实现两个选择弹窗的 loading、empty、error 和重试状态。
- [ ] 运行页面测试，确认物料和包装规则选择流程通过。

验证：

- `pnpm --filter @repo/web test -- material-packaging-relation-page.test.tsx`

## 切片 6：新增/编辑关系表单闭环

- [ ] 在 `material-packaging-relation-page.test.tsx` 增加新增关系、编辑关系、物料编码和规则编码编辑态只读、明细数量校验、调整模板字段、提交失败保留输入的断言。
- [ ] 运行页面测试，预期表单流程尚未实现而失败。
- [ ] 新建 `material-packaging-relation-form-dialog.tsx`，使用 React Hook Form 和 Zod 管理表单。
- [ ] 表单主信息字段包括物料编码、物料名称、包装规则编码、包装规则名称和备注。
- [ ] 新增态物料编码和包装规则编码通过选择弹窗回填；编辑态物料编码和包装规则编码只读。
- [ ] 明细表字段包括层级序号、包装层级编码、包装层级名称、包装规格编码、包装规格名称、包装数量、单位、包装类型名称、箱标签打印模板和装箱单打印模板。
- [ ] 层级、规格和包装类型字段只读展示；包装数量、单位和模板字段允许编辑。
- [ ] 数量字段提交前转换为正整数。
- [ ] 表单校验要求至少一条明细，且每条明细的层级序号和包装数量为正整数。
- [ ] 新增提交调用 `createMaterialPackagingRelation`。
- [ ] 编辑提交调用 `updateMaterialPackagingRelation`，payload 使用 `NeedUpdateFields`，并传当前完整 `Details` 数组。
- [ ] 提交成功后关闭弹窗、清理编辑记录、刷新列表。
- [ ] 提交失败时保留输入并展示后端错误消息。
- [ ] 运行页面测试，确认新增和编辑流程通过。

验证：

- `pnpm --filter @repo/web test -- material-packaging-relation-page.test.tsx`

## 切片 7：删除、批量删除与分页回退

- [ ] 在 `material-packaging-relation-page.test.tsx` 增加单删、批删、同一关系多条明细选择去重、未选择时批删禁用、删除当前页最后一条后回退上一页的断言。
- [ ] 运行页面测试，预期删除流程尚未实现而失败。
- [ ] 在 `material-packaging-relation-page.tsx` 实现单删和批删确认、mutation 调用、toast 成功反馈、选中状态清理。
- [ ] 删除确认文案提示会一并删除关联包装关系明细。
- [ ] 单删和批删都传业务 DTO 对象，不只传 `Id`；提交前移除 `CompanyCode` 和 `FactoryCode`。
- [ ] 当当前页删除后为空且页码大于 `1`，回退到上一页。
- [ ] 运行页面测试，确认删除和分页回退流程通过。

验证：

- `pnpm --filter @repo/web test -- material-packaging-relation-page.test.tsx`

## 切片 8：i18n、全量回归与人工检查

- [ ] 补齐 `zh-CN/common.ts` 和 `en-US/common.ts` 中 `pages.materialPackagingRelation` 的导航、页面标题、页面描述、物料侧栏、筛选、表格、表单、物料选择、包装规则选择、明细表、反馈和校验文案。
- [ ] 搜索 `apps/web/src/features/mes/packaging/material-packaging-relation`，确认用户可见文案均来自 i18n。
- [ ] 搜索 `apps/web/src/features/mes/packaging/material-packaging-relation`，确认 `CompanyCode` 和 `FactoryCode` 只出现在删除 payload 清理 helper 或测试断言中。
- [ ] 运行 `pnpm --filter @repo/web test`。
- [ ] 运行 `pnpm --filter @repo/web typecheck`。
- [ ] 启动本地开发服务并人工检查 `/packaging/material-packaging-relation` 的物料侧栏、筛选区、明细展平表格、关系表单、物料选择弹窗和包装规则选择弹窗在桌面视口下不重叠。

验证：

- `rg "CompanyCode|FactoryCode" apps/web/src/features/mes/packaging/material-packaging-relation`
- `rg "[\\u4e00-\\u9fff]" apps/web/src/features/mes/packaging/material-packaging-relation`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 非目标提醒

- 不实现导入、导出、列设置和全屏。
- 不新增物料主数据、包装规则或标签模板维护能力。
- 不展示后端未支持的包装层级、包装规格、包装类型远程筛选。
- 不在 route 文件中增加请求逻辑。
- 不引入新的共享 UI 包。
