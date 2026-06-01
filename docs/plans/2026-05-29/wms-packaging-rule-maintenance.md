# WMS 包装规则维护 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有后台壳内交付包装规则维护页面，完成 CRUD、包装关系明细、规则配置、路由导航、mock 数据和最小测试闭环。

**Architecture:** 按 `contract -> service -> queries -> page/component -> route` 分层实现。远程数据由 React Query 管理，页面负责协调筛选、分页、选择、规则弹窗、配置弹窗和表单状态；WMS 请求统一通过 `getWmsClient()` 发起。

**Tech Stack:** React 19、TypeScript、TanStack Query、TanStack Table、React Hook Form、Zod、radix-ui Dialog、Vitest、Testing Library、MSW、sonner。

---

## 文件边界

新增核心文件：

- `apps/web/src/routes/packaging.packaging-rule.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/index.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-contract.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-service.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-queries.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-filter-form.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-config-dialog.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-service.test.ts`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.test.tsx`
- `apps/web/src/mocks/data/packaging-rule-store.ts`
- `apps/web/src/mocks/data/packaging-rule-store.test.ts`

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

- [ ] 新建 `packaging-rule-contract.ts`，定义 DTO、record、detail、filters、form values、config values、包装层级选项、包装规格选项、page size、默认筛选、默认配置和映射函数。
- [ ] DTO 字段与接口文档保持一致，包含 `RuleCode`、`RuleName`、`IsEnabled`、`IsDefault`、`Details`、`Remark`、配置四个子对象和审计字段。
- [ ] 映射函数将 `Details` 缺失值归一为空数组，将配置查询空结果归一为默认配置。
- [ ] 新建 `packaging-rule-service.test.ts`，覆盖查询、包装层级候选、包装规格候选、新增、编辑、单删、批删、配置查询、配置保存 9 个请求。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-rule-service.test.ts`，预期失败原因是 service 文件尚未实现。
- [ ] 新建 `packaging-rule-service.ts`，封装以下接口：
  - `getPackagingRules`
  - `getPackagingRuleLevelOptions`
  - `getPackagingRuleSpecOptions`
  - `createPackagingRule`
  - `updatePackagingRule`
  - `deletePackagingRule`
  - `deletePackagingRules`
  - `getPackagingRuleConfig`
  - `savePackagingRuleConfig`
- [ ] `getPackagingRuleLevelOptions` 调用 `/PackagingLevelApi/GetPackagingLevelAutoQueryDatas`，固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] `getPackagingRuleSpecOptions` 调用 `/PackagingSpecApi/GetPackagingSpecAutoQueryDatas`，固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] 新增 payload 包含主信息、`Details` 和 `Remark`。
- [ ] 编辑 payload 包含 `Id`、主信息、当前表单中的完整 `Details` 数组和 `Remark`，用于支持用户清空明细。
- [ ] 删除 payload helper 需要移除 `CompanyCode` 和 `FactoryCode`，单删至少保留 `Id` 和 `RuleCode`。
- [ ] 配置查询取 `Attach[0]`，空数组时返回默认配置。
- [ ] 配置保存 payload 始终提交 `RuleCode` 和四个配置子对象。
- [ ] 新建 `packaging-rule-store.ts` 和 `packaging-rule-store.test.ts`，为页面测试提供稳定 MSW 数据，覆盖筛选、分页、CRUD、批删、明细维护、配置读取和配置全量覆盖。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-rule-service.test.ts packaging-rule-store.test.ts`，预期通过。

验证：

- `pnpm --filter @repo/web test -- packaging-rule-service.test.ts packaging-rule-store.test.ts`

## 切片 2：Queries 与缓存策略

- [ ] 新建 `packaging-rule-queries.ts`。
- [ ] 定义列表 query key：`["wms", "packaging-rule", "list", filters, pageIndex, refreshVersion]`。
- [ ] 定义包装层级候选 query key：`["wms", "packaging-rule", "packaging-level-options"]`。
- [ ] 定义包装规格候选 query key：`["wms", "packaging-rule", "packaging-spec-options"]`。
- [ ] 定义配置 query key：`["wms", "packaging-rule", "config", ruleCode]`。
- [ ] 实现列表 query，将空筛选映射为 `undefined`，默认和启用状态映射为 `undefined | true | false`，固定传 `IsPaged: true`、`PageIndex`、`PageSize`。
- [ ] 实现包装层级候选 query，调用包装层级查询接口并固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] 实现包装规格候选 query，调用包装规格查询接口并固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- [ ] 实现配置 query，仅在配置弹窗打开且存在 `ruleCode` 时启用。
- [ ] 实现新增、编辑、删除、批量删除 mutations；成功后失效包装规则列表。
- [ ] 实现保存配置 mutation；成功后失效对应规则配置 query，不刷新列表。
- [ ] 运行类型检查，确认 query hook 类型闭合。

验证：

- `pnpm --filter @repo/web typecheck`

## 切片 3：路由、导航与壳层

- [ ] 新建 `routes/packaging.packaging-rule.tsx`，导出 `PackagingRulePage`。
- [ ] 修改 `features/mes/packaging/index.ts`，导出 `PackagingRulePage`。
- [ ] 修改 `root-app.tsx`，注册 `/packaging/packaging-rule` 受认证路由。
- [ ] 修改 `app-sidebar.tsx`，在包装管理分组下新增包装规则维护入口，`data-testid` 使用 `sidebar-nav-packaging-packaging-rule`。
- [ ] 修改 `admin-layout.tsx`，增加 `/packaging/packaging-rule` 的标题和描述 key。
- [ ] 修改 `zh-CN/common.ts` 与 `en-US/common.ts`，补齐导航、页面标题和页面描述。
- [ ] 修改 `app.test.tsx`，增加新路由在后台壳内渲染、侧边栏入口存在、未登录跳转保留 redirect 的断言。
- [ ] 运行壳层测试，预期通过。

验证：

- `pnpm --filter @repo/web test -- app.test.tsx`

## 切片 4：列表页基础状态

- [ ] 新建 `packaging-rule-page.test.tsx`，先覆盖 loading、empty、error、列表渲染和筛选提交。
- [ ] 修改 `mocks/handlers.ts`，接入包装规则 query、create、update、delete、batch delete、level options、spec options、config query、config save handlers，并在 `/__mock__/reset` 中支持 `packaging-rule`。
- [ ] 运行 `pnpm --filter @repo/web test -- packaging-rule-page.test.tsx`，预期因页面组件尚未实现而失败。
- [ ] 新建 `packaging-rule-page.tsx`，装配筛选状态、分页状态、选中状态、候选查询、配置查询状态和列表查询结果。
- [ ] 新建 `packaging-rule-filter-form.tsx`，包含规则编码、规则名称、默认、状态、查询、重置。
- [ ] 新建 `packaging-rule-table.tsx`，展示勾选、序号、规则编码、规则名称、默认、状态、明细数量和操作列。
- [ ] 操作列包含配置规则、编辑和删除。
- [ ] 实现列表 loading、empty、error、上一页、下一页和刷新按钮。
- [ ] 运行页面测试，确认基础状态通过。

验证：

- `pnpm --filter @repo/web test -- packaging-rule-page.test.tsx`

## 切片 5：新增/编辑规则表单闭环

- [ ] 在 `packaging-rule-page.test.tsx` 增加新增规则、编辑规则、添加明细、删除明细、层级选择带出名称和序号、规格选择带出名称和单位、最大数量不能小于标准数量的断言。
- [ ] 运行页面测试，预期表单流程尚未实现而失败。
- [ ] 新建 `packaging-rule-form-dialog.tsx`，使用 React Hook Form 和 Zod 管理表单。
- [ ] 表单主信息字段包括规则编码、规则名称、默认、状态和备注。
- [ ] 编辑态将规则编码设为只读。
- [ ] 明细表字段包括层级编码、层级名称、层级序号、规格编码、规格名称、标准包装数量、最大包装数量、包装方式、单位、包装类型和操作。
- [ ] 层级编码使用候选下拉，选择后自动展示层级名称和层级序号。
- [ ] 规格编码使用候选下拉，选择后自动展示规格名称、单位和包装类型。
- [ ] 包装方式首版使用下拉，表单值为 `auto` 和 `manual`，用户可见标签从 i18n 读取。
- [ ] 如果后端确认 `PackagingMethod` 请求值必须使用中文枚举，在 `packaging-rule-service.ts` 的请求边界集中映射，并在 service 测试中固定该 payload；不要在组件层散落协议值。
- [ ] 数量字段提交前转换为正整数。
- [ ] 明细为空时，提交前展示弱提示；用户确认后继续提交。
- [ ] 提交成功后关闭弹窗、清理编辑记录、刷新列表。
- [ ] 提交失败时保留输入并展示后端错误消息。
- [ ] 运行页面测试，确认新增和编辑流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-rule-page.test.tsx`

## 切片 6：规则配置弹窗

- [ ] 在 `packaging-rule-page.test.tsx` 增加打开配置弹窗、配置 loading、配置查询失败重试、混箱规则全选清空、保存配置、保存失败保留输入的断言。
- [ ] 运行页面测试，预期配置流程尚未实现而失败。
- [ ] 新建 `packaging-rule-config-dialog.tsx`，使用 React Hook Form 和 Zod 管理配置表单。
- [ ] 弹窗顶部展示规则编码和规则名称，只读。
- [ ] 弹窗主体实现四个局部页签或分段面板：混箱规则、标签打印规则、封箱触发规则、异常处理规则。
- [ ] 混箱规则包含五个开关：禁止不同产品混箱、禁止不同批次混箱、禁止不同工单混箱、禁止不同生产任务混箱、禁止跨质量状态混箱。
- [ ] 混箱规则提供一键全选和一键清空按钮。
- [ ] 标签打印规则包含重复打印次数上限和默认标签模板名称。
- [ ] 封箱触发规则包含超时未封箱预警、工单完成自动封箱、任务完成自动封箱、满箱自动封箱。
- [ ] 异常处理规则包含周转工具强制清空。
- [ ] 配置查询返回空结果时回填默认配置。
- [ ] 点击重置恢复为本次打开弹窗时从后端读到的配置或默认配置。
- [ ] 保存成功后关闭弹窗并提示成功，不刷新列表。
- [ ] 保存失败时保留输入并展示后端错误消息。
- [ ] 运行页面测试，确认配置流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-rule-page.test.tsx`

## 切片 7：删除、批量删除与分页回退

- [ ] 在 `packaging-rule-page.test.tsx` 增加单删、批删、未选择时批删禁用、删除当前页最后一条后回退上一页的断言。
- [ ] 运行页面测试，预期删除流程尚未实现而失败。
- [ ] 在 `packaging-rule-page.tsx` 实现单删和批删确认、mutation 调用、toast 成功反馈、选中状态清理。
- [ ] 删除确认文案提示会一并删除关联包装明细。
- [ ] 当当前页删除后为空且页码大于 `1`，回退到上一页。
- [ ] 运行页面测试，确认删除和分页回退流程通过。

验证：

- `pnpm --filter @repo/web test -- packaging-rule-page.test.tsx`

## 切片 8：i18n、全量回归与人工检查

- [ ] 补齐 `zh-CN/common.ts` 和 `en-US/common.ts` 中 `pages.packagingRule` 的筛选、表格、规则表单、明细表、配置弹窗、反馈和校验文案。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-rule`，确认用户可见文案均来自 i18n。
- [ ] 搜索 `apps/web/src/features/mes/packaging/packaging-rule`，确认 `CompanyCode` 和 `FactoryCode` 只出现在删除 payload 清理 helper 或测试断言中。
- [ ] 运行 `pnpm --filter @repo/web test`。
- [ ] 运行 `pnpm --filter @repo/web typecheck`。
- [ ] 启动本地开发服务并人工检查 `/packaging/packaging-rule` 的列表、筛选、规则表单、明细表和配置弹窗在桌面视口下不重叠。

验证：

- `rg "CompanyCode|FactoryCode" apps/web/src/features/mes/packaging/packaging-rule`
- `rg "[\\u4e00-\\u9fff]" apps/web/src/features/mes/packaging/packaging-rule`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 非目标提醒

- 不实现导入、导出、列设置和全屏。
- 不新增包装层级、包装规格或标签模板维护能力。
- 不实现默认规则唯一性的前端互斥逻辑，除非后端补充明确规则。
- 不引入新的共享 UI 包。
- 不在 route 文件中增加请求逻辑。
