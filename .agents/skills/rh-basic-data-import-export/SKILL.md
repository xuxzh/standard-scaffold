---
name: rh-basic-data-import-export
description: 给 ruihui standard-scaffold 的通用基础数据维护页面添加导入/导出能力。用户提到“给包装层级/包装规则/包装类型/基础数据界面添加导入导出”、“按包装类型页复用导入导出”、“基础资料 Excel 导入导出”、“DataImportDialog/DataExportDialog 接入页面”时必须使用本技能，尤其适用于 apps/web/src/features 下已有列表、筛选、分页、选中行和 CRUD 的页面。
---

# Ruihui 基础数据导入导出

这个技能用于把 `apps/web` 里已有的基础数据维护页接入统一导入/导出体验。优先参考包装类型页的实现，而不是重新设计能力：

- 页面锚点：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.tsx`
- 查询锚点：`apps/web/src/features/mes/packaging/packaging-type/packaging-type-queries.ts`
- 共享导出：`apps/web/src/components/data-export`
- 共享导入：`apps/web/src/components/data-import`

## 适用边界

使用本技能时，目标通常是“已有基础数据列表页补能力”，不是新增通用组件。

- 适用：包装层级、包装规则、标签规则、物料/仓储/平台等基础资料维护页。
- 适用：页面已有筛选、分页、表格数据、选中行、刷新版本号或 query invalidation。
- 谨慎：页面没有后端导入配置，先确认 `moduleKey` 和 `businessKey`。
- 不适用：只处理本地 Excel 文件、做报表分析、重写导入组件或改造后端接口。

## 进入代码前

遵守仓库规则，先说明任务级别。

- 只给一个已有页面接入导入/导出，且复用现有组件：通常按 `L1`。
- 新增共享导入/导出组件、改接口契约、改数据导入底层行为、跨多个业务域批量改：按 `L2` 或更高，先写正式 spec/plan。
- 不在 `main`/`master` 直接编辑。先切 `codex-<task-slug>` 分支，或按仓库要求进入 `.worktrees/`。
- 先读 `docs/ai/context-index.md`，再读当前页面、query/service、contract、i18n 和测试。

最小成功标准：

1. 页面出现导入、导出按钮，按钮文案走 i18n。
2. 导出支持“全部 / 当前 / 选中”，空数据、超上限、失败都有反馈。
3. “全部”导出复用当前筛选条件，最多导出安全上限内的数据。
4. 导入成功后回到第一页并刷新列表。
5. 模板配置入口打开 `DataImportTemplateDialog`。
6. 相关单测或页面测试覆盖关键交互，至少运行定向验证。

## 代码阅读顺序

先找目标页面和最接近的已实现页面，建立一张小地图：

1. 页面文件：查 `useState`、筛选提交、分页、选中行、刷新版本号、表格 props。
2. table 文件：确认是否已有 `selectedIds`、`onToggleAll`、`onToggleOne`。没有选择态时先补最小选择态。
3. contract 文件：确认 `Record` 字段、筛选类型、DTO 映射函数和默认分页大小。
4. queries 文件：确认列表 query key、列表请求 builder、query invalidation。
5. service 文件：确认列表接口是否可用 `PageSize` 拉取较大数据量。
6. i18n：同步 `zh-CN/common.ts` 和 `en-US/common.ts`，代码中不要写中文文案。
7. 测试：优先改页面测试和 query 测试，断言用户可见行为。

## 导出接入步骤

### 1. 引入共享能力

页面通常需要：

```tsx
import { ArrowUpFromLineIcon } from "lucide-react";
import {
  DataExportDialog,
  DataExportEmptyError,
  exportRowsToExcel,
  type DataExportColumn,
  type DataExportMode,
} from "@/components/data-export";
```

如果同时做导入，`ArrowDownToLineIcon` 可和导出图标一起引入。

### 2. 在 queries 增加全量导出 helper

沿用列表请求 builder，避免导出条件和页面筛选条件分叉。

```ts
export const xxxExportMaxRows = 5000;

export async function getXxxExportRows(
  filters: XxxFilters,
  totalCount: number,
  options: { signal?: AbortSignal } = {},
): Promise<XxxRecord[]> {
  const result = await getXxxList(
    buildXxxListRequest(filters, 1, Math.min(totalCount, xxxExportMaxRows)),
    options,
  );

  return result.Attach.map(mapXxxDtoToRecord);
}
```

注意：

- `buildXxxListRequest` 如果当前是私有函数，可以继续保持私有；导出 helper 放同文件即可复用。
- 如果目标接口使用 `IsPaged: false` 拉全量，先看同模块现有模式。不要猜接口。
- `xxxExportMaxRows` 放 query 层，页面只消费常量。

### 3. 在页面添加导出状态和列定义

添加：

- `exportDialogOpen`
- `exporting`
- `selectedRows`
- `exportColumns`

列定义只放用户需要导出的业务字段。不要导出操作列、勾选列、内部 id，除非用户明确要求。

```tsx
const selectedRows = tableData.filter((record) => selectedIds.includes(record.id));
const exportColumns: DataExportColumn<XxxRecord>[] = [
  {
    key: "code",
    header: t("pages.xxx.table.code"),
    value: (row) => row.code,
  },
];
```

布尔、枚举、状态字段要导出用户可读文案，优先复用筛选选项或表格文案：

```tsx
value: (row) =>
  row.enabled
    ? t("pages.xxx.filters.options.true")
    : t("pages.xxx.filters.options.false"),
```

### 4. 实现导出模式解析

保持包装类型页的三段逻辑：

```tsx
async function resolveExportRows(mode: DataExportMode) {
  if (mode === "current") {
    return tableData;
  }

  if (mode === "selected") {
    return selectedRows;
  }

  const totalCount = query.data?.totalCount ?? 0;

  if (totalCount > xxxExportMaxRows) {
    throw new Error("EXPORT_LIMIT_EXCEEDED");
  }

  return await getXxxExportRows(filters, totalCount);
}
```

如果页面 query 变量叫 `listQuery` 或刷新状态叫 `refreshVersion`，使用页面现有命名，不要为了示例重命名。

### 5. 实现导出动作

文件名使用稳定英文 kebab-case，不要用中文；时间戳可复制包装类型页的 `formatExportTimestamp`，或复用页面已有工具。

```tsx
async function handleExport(mode: DataExportMode) {
  setExporting(true);

  try {
    const rows = await resolveExportRows(mode);

    if (rows.length === 0) {
      throw new DataExportEmptyError();
    }

    await exportRowsToExcel({
      filename: `xxx-${formatExportTimestamp(new Date())}.xlsx`,
      sheetName: "Xxx",
      columns: exportColumns,
      rows,
    });

    setExportDialogOpen(false);
    toast.success(t("pages.xxx.export.successTitle"));
  } catch (error) {
    if (error instanceof DataExportEmptyError) {
      toast.error(t("pages.xxx.export.emptyTitle"));
      return;
    }

    if (error instanceof Error && error.message === "EXPORT_LIMIT_EXCEEDED") {
      toast.error(t("pages.xxx.export.limitTitle"), {
        description: t("pages.xxx.export.limitDescription"),
      });
      return;
    }

    toast.error(t("pages.xxx.export.errorTitle"));
  } finally {
    setExporting(false);
  }
}
```

### 6. 渲染按钮和弹窗

按钮放在现有操作栏右侧，和包装类型页一致：

```tsx
<Button type="button" variant="outline" disabled={exporting} onClick={() => setExportDialogOpen(true)}>
  <ArrowUpFromLineIcon data-icon="inline-start" />
  {t("pages.xxx.actions.export")}
</Button>
```

弹窗放在页面 JSX 末尾、表单/删除弹窗附近：

```tsx
<DataExportDialog
  open={exportDialogOpen}
  exporting={exporting}
  selectedCount={selectedRows.length}
  optionLabels={{
    all: t("pages.xxx.export.options.all"),
    current: t("pages.xxx.export.options.current"),
    selected: t("pages.xxx.export.options.selected"),
  }}
  messages={{
    title: t("pages.xxx.export.dialogTitle"),
    description: t("pages.xxx.export.dialogDescription"),
    confirm: t("pages.xxx.actions.export"),
    cancel: t("pages.xxx.actions.cancel"),
    exporting: t("pages.xxx.export.exporting"),
    selectedDisabledHint: t("pages.xxx.export.selectedDisabledHint"),
  }}
  onOpenChange={setExportDialogOpen}
  onConfirm={(mode) => {
    void handleExport(mode);
  }}
/>
```

## 导入接入步骤

### 1. 引入共享能力

```tsx
import { ArrowDownToLineIcon } from "lucide-react";
import {
  DataImportDialog,
  DataImportTemplateDialog,
} from "@/components/data-import";
```

### 2. 添加状态

```tsx
const [importDialogOpen, setImportDialogOpen] = useState(false);
const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
```

### 3. 渲染导入按钮

导入按钮通常和导出按钮相邻，放在右侧工具组：

```tsx
<Button type="button" variant="outline" onClick={() => setImportDialogOpen(true)}>
  <ArrowDownToLineIcon data-icon="inline-start" />
  {t("pages.xxx.actions.import")}
</Button>
```

### 4. 渲染导入弹窗

`moduleKey` 和 `businessKey` 是后端导入路由契约。不要凭页面名硬猜；能从旧系统、接口文档、包装类型示例或后端配置确认时再写。

```tsx
<DataImportDialog
  open={importDialogOpen}
  moduleKey="MOM"
  businessKey="XxxBusinessKey"
  businessName={t("pages.xxx.title")}
  onOpenChange={setImportDialogOpen}
  onConfigureTemplate={() => {
    setTemplateDialogOpen(true);
  }}
  onImported={() => {
    setPageIndex(1);
    setRefreshVersion((current) => current + 1);
  }}
/>

<DataImportTemplateDialog
  open={templateDialogOpen}
  moduleKey="MOM"
  businessKey="XxxBusinessKey"
  onOpenChange={setTemplateDialogOpen}
/>
```

刷新状态的名字要沿用页面现状：

- 包装类型页用 `searchVersion`。
- 包装层级页用 `refreshVersion`。
- 如果页面只依赖 React Query invalidation，可调用现有 `refetch` 或递增已有刷新 key；不要并行制造第二套刷新机制。

## i18n 清单

目标页面的 `actions` 至少补：

```ts
import: "...",
export: "...",
```

目标页面的 `export` 至少补：

```ts
export: {
  dialogTitle: "...",
  dialogDescription: "...",
  exporting: "...",
  options: {
    all: "...",
    current: "...",
    selected: "...",
  },
  selectedDisabledHint: "...",
  successTitle: "...",
  emptyTitle: "...",
  limitTitle: "...",
  limitDescription: "...",
  errorTitle: "...",
},
```

同步 `zh-CN` 和 `en-US`。代码中不要出现中文用户文案。

## 测试建议

优先写能证明页面行为的测试。不要为了导入/导出改一大片无关测试。

建议覆盖：

- 导入按钮打开 `DataImportDialog`。
- 模板配置按钮打开 `DataImportTemplateDialog`。
- 导入成功后回到第一页并刷新列表。
- 导出按钮打开 `DataExportDialog`。
- 当前页导出调用 `exportRowsToExcel`，列头和值符合 i18n 和记录映射。
- 选中导出只导出选中行；没有选中行时弹窗里选中项不可用。
- 全部导出使用当前筛选条件调用 query helper。
- 总数超过 `xxxExportMaxRows` 时提示 limit，不调用 Excel 写入。
- 空数据提示 empty。

常用验证：

```bash
pnpm --filter @repo/web test -- <相关测试文件>
pnpm --filter @repo/web typecheck
```

如果改了共享 `components/data-import` 或 `components/data-export`，再补跑相关组件测试和更宽验证。

## 完成汇报

汇报时说明：

- 改了哪些页面、query、i18n、测试。
- `moduleKey` / `businessKey` 的来源。
- 导出字段清单和导出上限。
- 实际运行的验证命令和结果。
- 未覆盖的风险，例如后端导入模板配置尚未在当前环境联调。
