# 包装页面表格布尔值展示统一优化计划

> **For agentic workers:** Steps use checkbox (`- [ ]`) syntax for tracking.

**目标：** 延续包装类型表格 `isRecyclable` 的处理方式，检查其它包装相关页面的布尔表格列，避免表格单元格复用筛选项或状态项的语义标签，统一直接展示本地化的“是/否”（Yes/No）。

**任务级别：** `L2`。本次会跨多个包装页面表格组件与 i18n 资源文件做一致性调整；导出列如与对应表格布尔展示相关，也同步改为同一套表格布尔文案，避免表格与导出显示不一致。

## Context

用户先指出 `packaging-type-table.tsx` 中布尔列不应显示“循环包装/非循环包装”，而应显示“是/否”；该项已在分支 `codex-packaging-type-boolean-labels` 上完成并提交。随后用户要求“检查其他页面，进行同样的优化”。只读排查发现，包装规格、包装规则、包装套件等页面仍存在布尔列复用 `filters.options.*`、`filters.status*` 或表单 key 的情况。目标是让表格布尔值自身只承担 true/false 展示，筛选下拉仍保留原有业务语义。

## 范围

### 需要处理

- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-table.tsx`
  - `isEnabled` 表格列当前显示“启用/禁用”，改为表格布尔“是/否”。
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-table.tsx`
  - `isDefault` 当前复用筛选项“是/否”，改为表格专用布尔 key。
  - `isEnabled` 当前显示“已启用/已禁用”，改为表格布尔“是/否”。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-table.tsx`
  - `isVirtualMain` 当前复用 `form.virtualMainTrue/False`，值已是“是/否”，但改为表格专用布尔 key，避免表格依赖表单文案。
- 与上述表格列对应的导出配置（如 `packaging-spec-page.tsx`、`packaging-rule-page.tsx`）同步使用同一表格布尔 key；`packaging-type-page.tsx` 也同步使用已新增的 `pages.packagingType.table.isRecyclableTrue/False`，保持导出与表格一致。
- `apps/web/src/i18n/resources/zh-CN/common.ts` 与 `apps/web/src/i18n/resources/en-US/common.ts` 补齐页面级 `table.*True/*False` key。

### 不处理

- 不改筛选表单的 `filters.options.true/false`，筛选下拉继续显示原有业务语义（例如“启用/禁用”“循环包装/非循环包装”）。
- 不新增全局 boolean helper 或跨页面通用 i18n key，保持当前页面级 i18n 组织方式，避免跨页面耦合。
- 不改 API 字段、表格结构、路由、provider 顺序或导入/导出流程本身。

## 实施步骤

- [ ] **步骤 1：补齐页面级表格布尔翻译 key**
  - 在 `zh-CN/common.ts`：
    - `pages.packagingSpec.table.isEnabledTrue = "是"`
    - `pages.packagingSpec.table.isEnabledFalse = "否"`
    - `pages.packagingRule.table.isDefaultTrue = "是"`
    - `pages.packagingRule.table.isDefaultFalse = "否"`
    - `pages.packagingRule.table.isEnabledTrue = "是"`
    - `pages.packagingRule.table.isEnabledFalse = "否"`
    - `pages.packagingKit.table.isVirtualMainTrue = "是"`
    - `pages.packagingKit.table.isVirtualMainFalse = "否"`
  - 在 `en-US/common.ts` 同步新增对应 `Yes` / `No`。

- [ ] **步骤 2：更新表格布尔列渲染**
  - `packaging-spec-table.tsx`：`isEnabled` cell 使用 `pages.packagingSpec.table.isEnabledTrue/False`。
  - `packaging-rule-table.tsx`：`isDefault` cell 使用 `pages.packagingRule.table.isDefaultTrue/False`；`isEnabled` cell 使用 `pages.packagingRule.table.isEnabledTrue/False`。
  - `packaging-kit-table.tsx`：`isVirtualMain` cell 使用 `pages.packagingKit.table.isVirtualMainTrue/False`。

- [ ] **步骤 3：同步相关导出显示**
  - `packaging-type-page.tsx`：`isRecyclable` 导出值使用 `pages.packagingType.table.isRecyclableTrue/False`。
  - `packaging-spec-page.tsx`：`isEnabled` 导出值使用 `pages.packagingSpec.table.isEnabledTrue/False`。
  - `packaging-rule-page.tsx`：`isDefault` / `isEnabled` 导出值使用 `pages.packagingRule.table.isDefaultTrue/False` 与 `pages.packagingRule.table.isEnabledTrue/False`。

- [ ] **步骤 4：验证**
  - 运行 `pnpm --filter @repo/web typecheck`。
  - 检查 diff，确认筛选表单仍使用 `filters.options.*` / `filters.status*`，只调整表格与对应导出值。

## 关键文件

- `apps/web/src/i18n/resources/zh-CN/common.ts`
- `apps/web/src/i18n/resources/en-US/common.ts`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-table.tsx`
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`
- `apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-page.tsx`

## 验收标准

- 包装类型、包装规格、包装规则、包装套件页面的布尔表格列均显示“是/否”（英文环境为 Yes/No）。
- 筛选条件下拉的文案不受影响。
- 相关导出列与表格列的布尔展示保持一致。
- Web TypeScript 类型检查通过。
