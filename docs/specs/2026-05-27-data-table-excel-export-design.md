# 表格 Excel 导出功能 Spec

日期：2026-05-27

## 背景

当前 Web 应用已经具备通用 `DataTable` 和包装类型维护页面。业务列表后续会持续出现导出诉求，如果直接把导出逻辑写在单个页面里，容易导致列配置、数据范围、文件生成和错误反馈在多个页面重复实现。

本次需求希望用户点击导出时先打开导出设定弹窗，再选择导出模式：

- 全部：默认选项，导出当前筛选条件下的全部数据。
- 当前：导出当前页表格数据。
- 选中：导出当前页已勾选数据。

本任务按 `L2` 处理。原因是它新增用户可见行为，涉及通用组件边界、业务页面接入、数据流变化、i18n、测试，并需要引入 Excel 文件生成能力。

## 目标

- 在 `apps/web` 中沉淀通用表格导出能力，首个接入页面为包装类型维护。
- 支持导出设定弹窗，默认导出模式为“全部”。
- 导出格式为基础 `.xlsx` 文件。
- 保持 `DataTable` 只负责表格渲染，不把业务导出、数据请求或列导出规则塞入通用表格内部。
- 导出文案支持 `zh-CN` 和 `en-US`，代码中不写死中文业务文案。

## 非目标

- 不实现 CSV、PDF、复制到剪贴板等其他导出格式。
- 不实现 Excel 样式、冻结表头、复杂列宽、公式、图片或多 sheet。
- 不支持跨页选择；“选中”只表示当前页已勾选记录。
- 不新增后端导出任务、下载中心、异步任务轮询或审计能力。
- 不调整现有 provider 顺序、路由结构或 `DataTable` 的核心职责。
- 不迁移组件到 `packages/ui`。

## 范围级别

- 建议任务级别：`L2`
- 判定依据：
  - 改变用户可见行为。
  - 新增通用组件和工具函数。
  - 包装类型页面需要新增导出数据流。
  - 需要新增或确认 Excel 生成依赖。
  - 需要覆盖单元测试、页面测试、类型检查和 lint。

如果执行阶段必须调整仓库级脚本、构建配置或大范围依赖策略，则升级为 `L3` 并先人工确认。

## 受影响边界

### 共享组件

新增通用导出能力，建议放在 `apps/web/src/components/data-export/`。它和 `DataTable` 同级，作为表格周边能力存在，而不是修改 `DataTable` 的渲染边界。

### UI 基础组件

仓库当前没有 `dialog` 基础组件。导出设定需要真正的弹窗语义，建议按现有 shadcn/Radix 风格新增 `apps/web/src/components/ui/dialog.tsx`。

导出模式可用原生 radio input 组合实现，避免首版为了三个选项再引入额外 radio primitive。视觉上按分段式按钮组呈现，语义上保持 radio group。

### 数据流

通用导出组件不直接请求远程数据。业务页面通过配置提供：

- `currentRows`：当前页数据。
- `selectedRows`：当前页已选数据。
- `getAllRows`：按当前筛选条件拉取全部数据。
- `columns`：导出列配置。

### 依赖

首版建议使用 SheetJS `xlsx` 生成 `.xlsx` 文件。依据是 SheetJS 官方文档说明 `writeFile` 可在浏览器环境尝试触发客户端下载，并支持以文件扩展名输出 `.xlsx`。

执行阶段需要在 `apps/web` 增加运行时依赖：

```bash
pnpm --filter @repo/web add xlsx
```

如果后续安全或合规要求不允许新增前端 Excel 依赖，则改走后端文件导出方案，该方案不属于本 spec 首版范围。

## 导出模式语义

### 全部

默认模式。导出当前筛选条件下的全部数据。

包装类型维护页首版没有后端专用导出接口，因此通过现有查询接口重新请求数据：

- 沿用当前筛选条件。
- `PageIndex` 固定为 `1`。
- `PageSize` 使用 `min(totalCount, 5000)`。
- 如果 `totalCount > 5000`，不继续导出，提示用户缩小筛选条件。

### 当前

导出当前页表格正在展示的数据。若当前查询失败导致表格数据为空，则导出模式可选但确认时提示没有可导出的数据。

### 选中

导出当前页已选数据。未选择任何行时，该模式在弹窗中禁用，并显示短提示。

当前页选择状态继续由业务页面维护，导出组件只消费 `selectedRows`。

## 通用类型设计

首版公共类型建议如下：

```ts
export type DataExportMode = "all" | "current" | "selected";

export type DataExportColumn<TData> = {
  key: string;
  header: string;
  value: (row: TData) => string | number | boolean | Date | null | undefined;
};

export type DataExportRowsContext<TData> = {
  mode: DataExportMode;
  currentRows: TData[];
  selectedRows: TData[];
};
```

通用组件对外不暴露 TanStack Table 类型，避免导出能力和表格渲染库强耦合。

## 包装类型维护页接入

包装类型维护页导出列为：

- 类型编码
- 类型名称
- 循环包装
- 描述

“循环包装”导出用户可读文案，而不是布尔原始值。中文环境导出“是/否”，英文环境导出 “Yes/No”。

导出文件名建议：

```text
packaging-types-YYYYMMDD-HHmmss.xlsx
```

sheet 名称建议：

```text
Packaging Types
```

## 页面交互

- 工具栏新增“导出”按钮。
- 点击后打开导出设定弹窗。
- 弹窗标题为导出数据，描述说明当前将导出 Excel 文件。
- 默认选中“全部”。
- 用户确认后：
  - 根据模式解析数据。
  - 数据为空时显示错误 toast，不生成文件。
  - 生成成功后关闭弹窗并显示成功 toast。
  - 获取数据或生成文件失败时保持弹窗打开并显示错误 toast。

## 验证计划

实现完成后至少执行：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

需要覆盖的测试场景：

- 导出弹窗默认选择“全部”。
- 三种导出模式可切换。
- 没有选中行时“选中”模式不可用。
- `当前` 模式导出当前页数据。
- `选中` 模式只导出当前页选中数据。
- `全部` 模式使用当前筛选条件重新请求，并限制 `PageSize <= 5000`。
- 超过 5000 条时提示缩小筛选条件，不调用 Excel 写文件。
- Excel 工具按列配置生成数据并调用 `xlsx.writeFile`。
- 失败时显示错误 toast。

## 风险

- 前端全量导出存在浏览器内存风险，因此首版限制 5000 条。
- 新增 `xlsx` 会增加 bundle 体积；如果体积成为问题，可在实现中使用动态 import。
- 通用组件若过早绑定包装类型字段，会破坏复用边界；导出列必须由业务页面传入。
- 如果后端分页接口不支持一次请求 5000 条，需要在执行阶段改为循环分页拉取，仍保持 5000 条上限。

## 需要更新的文档

- 新增本 spec：`docs/specs/2026-05-27-data-table-excel-export-design.md`
- 新增实施计划：`docs/plans/2026-05-27/data-table-excel-export.md`
- 如实现后确认导出组件成为稳定模式，再补充 `docs/ui/components/table-patterns.md`，说明表格导出能力应放在 `components/data-export` 而不是 `DataTable` 内部。
