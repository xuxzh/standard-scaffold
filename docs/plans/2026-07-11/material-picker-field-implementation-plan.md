# 可复用物料选择字段实施计划

> **面向 Agent 执行者：** REQUIRED SUB-SKILL：使用 `superpowers:subagent-driven-development`（推荐）或 `superpowers:executing-plans` 逐任务执行。所有步骤使用复选框追踪，并严格遵守 RED → GREEN → REFACTOR。

**目标：** 新增表单无关的单选物料字段，在套包主件表单中通过 Search 图标打开物料弹窗并回填编码、名称和单位，同时保持套包查询语义与子件多选行为不变。

**实现方式：** 在物料 feature 内为 `MaterialPickerDialog` 增加成对的数据源注入，再组合为受控 `MaterialPickerField`。套包 feature 提供现有 service 的查询适配器，表单只负责把返回的 `MaterialPickerRecord` 映射到 React Hook Form 字段。

**技术栈：** React 19、TypeScript、React Query、React Hook Form、Vitest、Testing Library、i18next、shadcn UI。

---

## 文件清单

新增：

- `apps/web/src/features/mes/material/material-picker-field.tsx`：受控物料选择字段。
- `apps/web/src/features/mes/material/material-picker-field.test.tsx`：字段行为测试。

修改：

- `apps/web/src/features/mes/material/material-picker-dialog.tsx`：支持可选 `dataSource`。
- `apps/web/src/features/mes/material/index.ts`：导出字段和数据源类型。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-queries.ts`：增加主件查询适配器和独立 query key。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`：接入字段并回填表单。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`：更新主件选择断言并补回归场景。
- `apps/web/src/i18n/resources/zh-CN/common.ts`：增加中文字段文案。
- `apps/web/src/i18n/resources/en-US/common.ts`：增加英文字段文案。

保留不改：

- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-material-dialog.tsx`：子件多选继续沿用现状。

## 任务 1：为通用物料弹窗增加数据源注入

**文件：**

- 修改：`apps/web/src/features/mes/material/material-picker-dialog.tsx`
- 测试：`apps/web/src/features/mes/material/material-picker-field.test.tsx`

- [x] **步骤 1：先写自定义数据源失败测试**

新增测试辅助类型和用例，直接渲染 `MaterialPickerDialog`，传入：

```tsx
const customSearch = vi.fn(async () => ({
  items: [material],
  totalCount: 1,
}));

<MaterialPickerDialog
  open
  dataSource={{
    queryKey: ["test", "custom-material-picker"],
    search: customSearch,
  }}
  onSelect={onSelect}
  onOpenChange={onOpenChange}
/>
```

断言 `customSearch` 收到默认筛选、第一页、20 条分页参数，并且表格展示自定义返回记录。

- [x] **步骤 2：运行测试并确认 RED**

执行：

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/material/material-picker-field.test.tsx
```

预期：测试因 `MaterialPickerDialogProps` 不存在 `dataSource` 而失败；不能是测试环境或拼写错误。

- [x] **步骤 3：实现最小数据源契约**

在 `material-picker-dialog.tsx` 导出：

```ts
export type MaterialPickerSearch = (
  params: DataPickerSearchParams<MaterialPickerFilters>,
) => Promise<DataPickerSearchResult<MaterialPickerRecord>>;

export type MaterialPickerDataSource = {
  queryKey: readonly unknown[];
  search: MaterialPickerSearch;
};
```

为弹窗增加 `dataSource?: MaterialPickerDataSource`。将当前内联默认查询提取为 `searchDefaultMaterials`，渲染时使用：

```tsx
queryKey={dataSource?.queryKey ?? ["mes", "material-picker"]}
search={dataSource?.search ?? searchDefaultMaterials}
```

默认查询 payload、映射和现有文案保持不变。

- [x] **步骤 4：运行测试并确认 GREEN**

执行同一测试命令，预期新增数据源测试通过且输出无未处理异常。

- [x] **步骤 5：提交切片**

```bash
git add apps/web/src/features/mes/material/material-picker-dialog.tsx apps/web/src/features/mes/material/material-picker-field.test.tsx
git commit -m "refactor(web): allow material picker data sources"
```

## 任务 2：TDD 新增 `MaterialPickerField`

**文件：**

- 新增：`apps/web/src/features/mes/material/material-picker-field.tsx`
- 修改：`apps/web/src/features/mes/material/index.ts`
- 修改：`apps/web/src/i18n/resources/zh-CN/common.ts`
- 修改：`apps/web/src/i18n/resources/en-US/common.ts`
- 测试：`apps/web/src/features/mes/material/material-picker-field.test.tsx`

- [x] **步骤 1：写字段展示和打开弹窗的失败测试**

用 `QueryClientProvider` 渲染：

```tsx
<MaterialPickerField
  inputId="main-material"
  value={material}
  onChange={onChange}
  dataSource={{ queryKey: ["test", "field"], search }}
/>
```

断言：输入框值为 `MAT001`；点击 `getByRole("button", { name: "选择物料" })` 后出现物料弹窗。先运行测试，预期因组件不存在而失败。

- [x] **步骤 2：实现最小字段外壳并转绿**

组件 props 固定为：

```ts
type MaterialPickerFieldProps = {
  value?: MaterialPickerRecord | null;
  onChange: (material: MaterialPickerRecord) => void;
  dataSource?: MaterialPickerDataSource;
  disabled?: boolean;
  invalid?: boolean;
  inputId?: string;
  placeholder?: string;
};
```

实现只读 `Input`、图标 `Button`、本地 `open` 状态和 `MaterialPickerDialog`。按钮使用 `SearchIcon`，`aria-label` 和 tooltip 均来自 `pages.materialPicker.field.select`。

- [x] **步骤 3：写选择、取消、禁用和错误态失败测试**

分开验证：

- 选择一行后 `onChange` 恰好收到完整记录一次。
- 点击返回或关闭弹窗不调用 `onChange`。
- `disabled` 同时禁用输入框与按钮，点击不打开弹窗。
- `invalid` 让输入框具有 `aria-invalid="true"`。
- 查询失败显示错误提示，点击“重试”会再次调用 search。

先运行，确认至少一个断言因缺少对应行为失败。

- [x] **步骤 4：补齐最小行为并转绿**

选择时只执行 `onChange(record)`；关闭只更新 `open`。不得保存第二份已选记录，也不得在字段内部调用表单 API。

在中英文 `pages.materialPicker` 下新增：

```ts
field: {
  placeholder: "请选择物料", // en-US: "Select a material"
  select: "选择物料",        // en-US: "Select material"
}
```

从 `features/mes/material/index.ts` 导出组件及其 props/data source 类型。

- [x] **步骤 5：运行字段完整测试**

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/material/material-picker-field.test.tsx
```

预期：全部通过，无 React `act`、未处理 Promise 或可访问性定位警告。

- [x] **步骤 6：提交切片**

```bash
git add apps/web/src/features/mes/material apps/web/src/i18n/resources/zh-CN/common.ts apps/web/src/i18n/resources/en-US/common.ts
git commit -m "feat(web): add reusable material picker field"
```

## 任务 3：TDD 接入套包主件表单

**文件：**

- 修改：`apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-queries.ts`
- 修改：`apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`
- 测试：`apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`

- [x] **步骤 1：把主件集成测试改成目标交互并确认 RED**

在现有“creates and edits a packaging kit with material selection”附近先把主件入口改为：

```ts
fireEvent.click(screen.getByRole("button", { name: "选择物料" }));
```

选择 `MAT001` 后断言主件编码、名称与单位字段值，并保留最终 Store/Update payload 断言。运行：

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx -t "creates and edits a packaging kit with material selection"
```

预期：因当前按钮仍名为“选择主件”而失败。

- [x] **步骤 2：增加套包主件查询适配器**

在 `packaging-kit-queries.ts` 导出稳定数据源：

```ts
export const packagingKitMainMaterialDataSource: MaterialPickerDataSource = {
  queryKey: ["mes", "packaging-kit", "material-options", "main-picker"],
  search: async ({ filters, pageIndex, pageSize, signal }) => {
    const result = await getPackagingKitMaterialOptions(
      buildPackagingKitMaterialRequest(filters, pageIndex, pageSize),
      { signal },
    );

    return {
      items: result.Attach.map((dto) => ({
        id: String(dto.Id ?? dto.MaterialCode),
        materialCode: dto.MaterialCode,
        materialName: dto.MaterialName,
        materialSpecification: "",
        materialType: dto.MaterialTypeName ?? "",
        unit: dto.Unit ?? "",
      })),
      totalCount: result.TotalCount,
    };
  },
};
```

实际实现优先复用现有映射函数，不能改变请求字段。

- [x] **步骤 3：用 `MaterialPickerField` 替换主件入口**

将 `handleMainMaterialSelect(rows)` 改为接收单条 `MaterialPickerRecord`，保持三个 `setValue` 的 dirty/validate 规则。主件 `Controller` 内构造当前 value：

```ts
const selectedMainMaterial: MaterialPickerRecord | null =
  currentValues.mainMaterialCode
    ? {
        id: currentValues.mainMaterialCode,
        materialCode: currentValues.mainMaterialCode,
        materialName: currentValues.mainMaterialName,
        materialSpecification: "",
        materialType: "",
        unit: currentValues.unit,
      }
    : null;
```

主件使用 `MaterialPickerField`；`materialMode` 改为 `childrenMaterialDialogOpen`，原 `PackagingKitMaterialDialog` 固定 `mode="children"`，子件 `selectedCodes`、`selectedItems` 和 `handleChildrenSelect` 保持原样。

- [x] **步骤 4：运行套包测试并确认 GREEN**

执行套包测试。预期：目标交互、回填、提交 payload、子件多选与跨页用例全部通过。

- [x] **步骤 5：补“无单位不覆盖”和请求载荷回归测试**

先写测试使其在缺少保护时失败，再确认实现使用：

```ts
form.setValue("unit", material.unit || form.getValues("unit"), {
  shouldDirty: true,
  shouldValidate: true,
});
```

同时断言主件查询仍请求 `/MaterialInfoApi/GetMaterialInfoAutoQueryDatas`，且未新增通用 picker 的固定公司/工厂字段。

- [x] **步骤 6：提交切片**

```bash
git add apps/web/src/features/mes/packaging/packaging-kit
git commit -m "feat(web): use material picker for kit main material"
```

## 任务 4：回归、静态检查与交付验证

**文件：**

- 修改：仅限前述验证暴露出的本任务相关文件。

- [x] **步骤 1：运行全部相关单测**

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/material/material-picker-field.test.tsx
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx -t "material dialog|creates and edits a packaging kit with material selection|keeps the current unit|rejects malformed child quantity"
```

预期：相关测试全部通过。

- [x] **步骤 2：运行 Web 类型检查与 lint**

```bash
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

预期：两个命令均以 0 退出，无新增错误。

实际：typecheck 通过；全量 lint 被 `src/lib/notify.ts` 两个既有 `_raw` 未使用错误阻断，在 `main` 工作区复跑结果相同。对本次修改文件执行定向 ESLint，结果为 0 error、2 个套包表单既有 warning。

- [x] **步骤 3：运行 Web 完整验证**

```bash
pnpm verify:web
```

预期：Web 测试、lint、typecheck 和构建相关任务全部通过。

实际：`pnpm verify:web` 已执行，在上述既有 lint 错误处停止；随后单独执行 `pnpm --filter @repo/web build`，构建通过。

- [x] **步骤 4：浏览器人工检查**

在 `/packaging/packaging-kit` 验证：

- 新增和编辑弹窗显示只读物料编码与右侧 Search 图标。
- Search tooltip、中文和英文可访问名称正确。
- 选中物料后编码、名称和单位同步回填。
- 返回或关闭物料弹窗不改变原值。
- 表单重置清空新增态主件。
- 子件多选仍可打开、选择并确认。

实际：浏览器确认 Search 图标入口可用；选择 `KitTest` 后编码、名称和单位回填为 `KitTest`、`套包测试`、`TAO-套`；子件弹窗仍展示 checkbox 多选并加载 20 行候选。

- [x] **步骤 5：最终差异审计**

```bash
git status --short
git diff origin/main...HEAD --check
git diff origin/main...HEAD --stat
```

确认所有代码改动都能追溯到 spec，未修改 `packaging-kit-material-dialog.tsx` 的子件行为，未出现调试输出或无关格式化。

- [x] **步骤 6：提交必要的验证修正**

若步骤 1–5 产生本任务内修正，按实际文件提交：

```bash
git add apps/web/src/features/mes/material apps/web/src/features/mes/packaging/packaging-kit apps/web/src/i18n/resources/zh-CN/common.ts apps/web/src/i18n/resources/en-US/common.ts
git commit -m "test(web): verify reusable material picker flow"
```

若工作区已干净，不创建空提交。
