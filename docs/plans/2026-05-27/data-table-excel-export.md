# 表格 Excel 导出功能 Implementation Plan

> 面向 Agent 执行者：优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 新增通用表格 Excel 导出能力，并在包装类型维护页接入“全部 / 当前 / 选中”三种导出模式。

**实现方式：** 保持 `DataTable` 只负责表格渲染；新增相邻的 `components/data-export` 通用导出组件和 Excel 工具。包装类型页面负责提供当前页、当前页选中行、按筛选条件拉取全部行的方法，以及导出列配置。

**技术栈：** React 19、TypeScript、shadcn/Radix 风格 Dialog、SheetJS `xlsx`、TanStack Query、Vitest、Testing Library、sonner、i18next。

---

## 文件清单

- 新建：
  - `apps/web/src/components/ui/dialog.tsx`
  - `apps/web/src/components/data-export/data-export-dialog.tsx`
  - `apps/web/src/components/data-export/export-to-excel.ts`
  - `apps/web/src/components/data-export/index.ts`
  - `apps/web/src/components/data-export/export-to-excel.test.ts`
  - `apps/web/src/components/data-export/data-export-dialog.test.tsx`
- 修改：
  - `apps/web/package.json`
  - `pnpm-lock.yaml`
  - `apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.tsx`
  - `apps/web/src/features/wms/packaging/packaging-type/packaging-type-queries.ts`
  - `apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.test.tsx`
  - `apps/web/src/i18n/resources/zh-CN/common.ts`
  - `apps/web/src/i18n/resources/en-US/common.ts`
- 可选修改：
  - `docs/ui/components/table-patterns.md`，仅当实现后确认导出边界成为稳定通用规则时更新。

## 切片 1：引入 Excel 依赖和基础导出工具

**文件：**

- 修改：`apps/web/package.json`
- 修改：`pnpm-lock.yaml`
- 新建：`apps/web/src/components/data-export/export-to-excel.ts`
- 新建：`apps/web/src/components/data-export/export-to-excel.test.ts`
- 新建：`apps/web/src/components/data-export/index.ts`

- [ ] **步骤 1：安装依赖**

从仓库根目录执行：

```bash
pnpm --filter @repo/web add xlsx
```

预期：

```text
apps/web/package.json 增加 xlsx 依赖，pnpm-lock.yaml 同步更新。
```

- [ ] **步骤 2：编写 Excel 工具测试**

测试目标：

```text
mock xlsx 工具方法，验证 exportRowsToExcel 使用传入 columns 生成表头和数据行，并调用 writeFile 输出 .xlsx 文件。
```

建议覆盖：

- 空数据时抛出 `DataExportEmptyError`。
- 列配置按顺序输出。
- `null` 和 `undefined` 输出为空字符串。
- 文件名不是 `.xlsx` 时自动补 `.xlsx`。

- [ ] **步骤 3：实现导出工具**

公共接口固定为：

```ts
export type DataExportCellValue = string | number | boolean | Date | null | undefined;

export type DataExportColumn<TData> = {
  key: string;
  header: string;
  value: (row: TData) => DataExportCellValue;
};

export type ExportRowsToExcelOptions<TData> = {
  filename: string;
  sheetName: string;
  columns: DataExportColumn<TData>[];
  rows: TData[];
};

export class DataExportEmptyError extends Error {}

export async function exportRowsToExcel<TData>(
  options: ExportRowsToExcelOptions<TData>,
): Promise<void>;
```

实现要求：

- 使用动态 import 加载 `xlsx`，降低首屏 bundle 压力。
- 使用 `utils.aoa_to_sheet` 和 `utils.book_new` / `utils.book_append_sheet` 创建工作簿。
- 使用 `writeFile(workbook, normalizedFilename, { compression: true })` 下载文件。
- 空数据直接抛 `DataExportEmptyError`。

- [ ] **步骤 4：运行工具测试**

执行：

```bash
pnpm --filter @repo/web test -- export-to-excel.test.ts
```

预期：

```text
export-to-excel.test.ts 通过。
```

## 切片 2：新增导出设定弹窗

**文件：**

- 新建：`apps/web/src/components/ui/dialog.tsx`
- 新建：`apps/web/src/components/data-export/data-export-dialog.tsx`
- 新建：`apps/web/src/components/data-export/data-export-dialog.test.tsx`
- 修改：`apps/web/src/components/data-export/index.ts`

- [ ] **步骤 1：新增 Dialog 基础组件**

按现有 `sheet.tsx` 和 shadcn new-york 风格新增 `dialog.tsx`，导出：

```ts
Dialog;
DialogTrigger;
DialogPortal;
DialogClose;
DialogOverlay;
DialogContent;
DialogHeader;
DialogFooter;
DialogTitle;
DialogDescription;
```

实现使用 `radix-ui` 包中的 `Dialog as DialogPrimitive`，样式保持 8px 以内圆角，关闭按钮使用 `lucide-react` 的 `XIcon`。

- [ ] **步骤 2：编写弹窗组件测试**

测试目标：

```text
渲染 DataExportDialog，验证默认模式为 all，可切换 current 和 selected，确认时调用 onConfirm(mode)。
```

建议覆盖：

- 默认选中 `all`。
- `selectedCount` 为 0 时禁用 `selected` 模式。
- `exporting` 为 true 时禁用确认按钮。
- 点击取消关闭弹窗。

- [ ] **步骤 3：实现弹窗组件**

公共接口固定为：

```ts
export type DataExportMode = "all" | "current" | "selected";

export type DataExportDialogOptionLabels = {
  all: string;
  current: string;
  selected: string;
};

export type DataExportDialogMessages = {
  title: string;
  description: string;
  confirm: string;
  cancel: string;
  exporting: string;
  selectedDisabledHint: string;
};

export type DataExportDialogProps = {
  open: boolean;
  exporting?: boolean;
  selectedCount: number;
  defaultMode?: DataExportMode;
  optionLabels: DataExportDialogOptionLabels;
  messages: DataExportDialogMessages;
  onOpenChange: (open: boolean) => void;
  onConfirm: (mode: DataExportMode) => void;
};
```

实现要求：

- `defaultMode` 默认 `all`。
- 使用 radio 语义表达三种互斥模式。
- 没有选中行时禁用 `selected`。
- 弹窗关闭后重置为 `defaultMode`。

- [ ] **步骤 4：运行弹窗测试**

执行：

```bash
pnpm --filter @repo/web test -- data-export-dialog.test.tsx
```

预期：

```text
data-export-dialog.test.tsx 通过。
```

## 切片 3：包装类型页接入导出数据流

**文件：**

- 修改：`apps/web/src/features/wms/packaging/packaging-type/packaging-type-queries.ts`
- 修改：`apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.tsx`
- 修改：`apps/web/src/features/wms/packaging/packaging-type/packaging-type-page.test.tsx`

- [ ] **步骤 1：补充页面测试**

在包装类型页面测试中新增导出场景：

```text
点击“导出”打开弹窗，默认选择“全部”。
选择“当前”后确认，导出当前页数据。
勾选一行后选择“选中”确认，只导出该行。
选择“全部”确认，重新调用查询接口，PageIndex 为 1，PageSize 不超过 5000。
当 TotalCount 超过 5000 时，不调用 Excel 写文件，并显示上限提示。
```

测试中 mock `@/components/data-export` 的 `exportRowsToExcel`，避免真实下载文件。

- [ ] **步骤 2：暴露按筛选拉取全部数据的方法**

在 `packaging-type-queries.ts` 中新增纯函数或 hook 辅助，使页面可以按当前筛选条件请求导出数据。

固定行为：

```text
输入：filters、totalCount、AbortSignal 可选项。
输出：PackagingTypeRecord[]。
PageIndex 固定为 1。
PageSize 为 Math.min(totalCount, 5000)。
筛选字段映射与 usePackagingTypeListQuery 保持一致。
```

避免复制筛选映射逻辑；如果当前 `mapRecyclableFilter` 只在文件内使用，可保留文件内复用。

- [ ] **步骤 3：页面接入导出弹窗**

在包装类型页面中：

- 新增“导出”按钮。
- 新增 `exportDialogOpen` 和 `exporting` 局部状态。
- 计算 `selectedRows = tableData.filter((record) => selectedIds.includes(record.id))`。
- 定义导出列，列标题使用 i18n。
- 根据模式分发数据：
  - `all`：检查 `totalCount <= 5000`，然后请求全部行。
  - `current`：使用 `tableData`。
  - `selected`：使用 `selectedRows`。
- 调用 `exportRowsToExcel`。
- 成功后关闭弹窗并 toast 成功。
- 空数据、超过上限和异常时 toast 错误。

- [ ] **步骤 4：运行页面测试**

执行：

```bash
pnpm --filter @repo/web test -- packaging-type-page.test.tsx
```

预期：

```text
packaging-type-page.test.tsx 通过，且既有 CRUD 测试不回归。
```

## 切片 4：i18n 和用户反馈

**文件：**

- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`

- [ ] **步骤 1：补充中文文案**

在 `pages.packagingType.actions`、`states` 或新增 `export` 节点中补充：

```text
导出、导出数据、导出为 Excel、全部、当前、选中、导出中、导出成功、暂无可导出数据、最多支持导出 5000 条数据、请缩小筛选条件、导出失败。
```

- [ ] **步骤 2：补充英文文案**

补齐对应英文：

```text
Export, Export data, Export to Excel, All, Current, Selected, Exporting, Export complete, No data to export, Export supports up to 5000 rows, Narrow the filters, Export failed.
```

- [ ] **步骤 3：运行 i18n 相关测试**

执行：

```bash
pnpm --filter @repo/web test -- packaging-type-page.test.tsx data-export-dialog.test.tsx
```

预期：

```text
页面和弹窗测试通过，测试不依赖硬编码中文以外的脆弱 DOM 结构。
```

## 切片 5：收敛验证和文档回写判断

**文件：**

- 可选修改：`docs/ui/components/table-patterns.md`

- [ ] **步骤 1：运行 Web 范围验证**

执行：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

预期：

```text
三条命令全部通过。
```

- [ ] **步骤 2：判断是否更新表格规范**

如果实现确认 `components/data-export` 成为后续列表页默认导出模式，则更新 `docs/ui/components/table-patterns.md`：

```text
表格导出能力不放入 DataTable 内部；通用导出配置和 Excel 工具放在 components/data-export，业务页面负责提供导出列和数据来源。
```

如果实现只是包装类型页的首个试点，暂不更新长期 UI 规范。

- [ ] **步骤 3：最终检查**

执行：

```bash
git status --short
```

预期：

```text
只包含本任务相关文件变化，没有无关格式化或顺手改动。
```

## 非目标提醒

- 不实现跨页选择。
- 不实现后端导出文件。
- 不实现 Excel 样式和多 sheet。
- 不修改 `DataTable` 的核心渲染职责。
- 不调整路由、provider、应用壳层或 workspace 结构。
