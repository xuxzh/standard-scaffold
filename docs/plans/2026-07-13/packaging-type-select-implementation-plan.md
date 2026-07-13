# 包装类型动态选择器实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增受控、可搜索、可清空的 `PackagingTypeSelect`，并让包装规格筛选区复用现有包装类型接口数据，彻底移除写死选项。

**Architecture:** `PackagingSpecPage` 继续拥有唯一的包装类型选项查询，并把结果同时传给新增/编辑表单和筛选表单。`PackagingTypeSelect` 位于包装类型领域，只接收选项和受控编码值；基础 `Combobox` 补充兼容的禁用态和清空按钮国际化能力。

**Tech Stack:** React 19、TypeScript、TanStack Query、react-i18next、shadcn/Radix、Vitest、Testing Library、pnpm workspace

---

## 前置资料

- 设计规格：`docs/specs/2026-07-13/packaging-type-select-design.md`
- Web 代码规范：`docs/standards/web-code-guidelines.md`
- Web 多语言规范：`docs/standards/web-i18n-guidelines.md`
- 参考组件：`apps/web/src/features/mes/packaging/label-rule/label-rule-select.tsx`
- 基础组件：`apps/web/src/components/ui/combobox.tsx`

## 文件结构

### 新增

- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.tsx`：把包装类型 DTO 映射为 `Combobox` 选项，并提供包装类型领域默认文案。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx`：覆盖显示、搜索、选择、清空、空结果、禁用和文案透传。

### 修改

- `apps/web/src/components/ui/combobox.tsx`：增加通用 `disabled`、`clearLabel` props。
- `apps/web/src/components/ui/combobox.test.tsx`：锁定新增 props 的行为和向后兼容默认值。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-contract.ts`：承接 `PackagingTypeOptionDto`。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-contract.ts`：移除不属于包装规格领域的选项类型。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.ts`：从包装类型契约导入选项 DTO。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx`：删除重复本地类型，使用包装类型领域契约。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx`：接收动态选项和加载状态，替换三个写死选项。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`：把现有 query 数据传给筛选表单。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx`：验证接口选项、搜索筛选、清空、重置和加载禁用态。
- `apps/web/src/i18n/resources/zh-CN/common.ts`：增加包装类型选择器中文文案。
- `apps/web/src/i18n/resources/en-US/common.ts`：增加包装类型选择器英文文案。

## 实施约束

- 全程在 `.worktrees/codex-packaging-type-select` 中执行。
- 严格按红—绿—重构顺序推进，每个行为先写失败测试。
- 不新增第二个包装类型 query hook，不改变 `/PackagingTypeApi/GetPackagingTypeAutoQueryDatas` 请求参数。
- 不修改包装规格新增/编辑表单的用户可见交互。
- 代码中不得出现面向用户的硬编码中文。
- 下列 commit 步骤仅在用户明确授权创建提交后执行；未授权时跳过并在交付说明中如实记录。

### Task 1: 扩展基础 Combobox 的禁用态和清空文案

**Files:**
- Modify: `apps/web/src/components/ui/combobox.tsx:24-55,67-92,128-141`
- Test: `apps/web/src/components/ui/combobox.test.tsx`

- [ ] **Step 1: 写禁用态和清空文案的失败测试**

在现有 `describe("Combobox")` 中追加：

```tsx
it("disables both the trigger and clear button", () => {
  const onValueChange = vi.fn();

  render(
    <Combobox
      options={[{ value: "box", label: "Box Label" }]}
      value="box"
      disabled
      onValueChange={onValueChange}
    />,
  );

  expect(screen.getByRole("combobox")).toBeDisabled();
  expect(screen.getByRole("button", { name: "Clear selection" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Clear selection" }));
  expect(onValueChange).not.toHaveBeenCalled();
});

it("uses a custom accessible label for the clear button", () => {
  render(
    <Combobox
      options={[{ value: "box", label: "Box Label" }]}
      value="box"
      clearLabel="Clear packaging type"
      onValueChange={vi.fn()}
    />,
  );

  expect(
    screen.getByRole("button", { name: "Clear packaging type" }),
  ).toBeInTheDocument();
});
```

- [ ] **Step 2: 运行测试并确认失败原因正确**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/components/ui/combobox.test.tsx
```

Expected: FAIL；TypeScript 或断言指出 `Combobox` 不支持 `disabled`、`clearLabel`，或清空按钮仍使用默认英文名称。

- [ ] **Step 3: 最小实现 `disabled` 和 `clearLabel`**

在 `ComboboxProps` 中加入：

```tsx
disabled?: boolean;
clearLabel?: string;
```

在参数解构中加入兼容默认值：

```tsx
disabled = false,
clearLabel = "Clear selection",
```

触发按钮增加：

```tsx
disabled={disabled}
```

清空按钮将固定名称替换为 props，并同步禁用：

```tsx
<Button
  type="button"
  variant="ghost"
  size="icon"
  className="absolute top-0 right-0 size-9"
  aria-label={clearLabel}
  disabled={disabled}
  onClick={() => {
    onValueChange("");
    setOpen(false);
  }}
>
  <XIcon className="size-4 opacity-50 hover:opacity-100" />
</Button>
```

不要改变 `clearable`、选项筛选、Popover 或现有调用方的默认行为。

- [ ] **Step 4: 运行基础组件测试并确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/components/ui/combobox.test.tsx
```

Expected: PASS；原有浮层层级测试和两个新增测试全部通过。

- [ ] **Step 5: 运行基础组件类型检查**

Run:

```bash
pnpm --filter @repo/web typecheck
```

Expected: PASS，无新增 TypeScript 错误。

- [ ] **Step 6: 创建提交（仅在用户明确授权后）**

```bash
git add apps/web/src/components/ui/combobox.tsx apps/web/src/components/ui/combobox.test.tsx
git commit -m "feat(web): extend combobox disabled behavior"
```

### Task 2: 建立包装类型选项契约和 PackagingTypeSelect

**Files:**
- Create: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.tsx`
- Create: `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx`
- Modify: `apps/web/src/features/mes/packaging/packaging-type/packaging-contract.ts:6-18`
- Modify: `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-contract.ts:72-76`
- Modify: `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.ts:1-8`
- Modify: `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx:33-56`
- Modify: `apps/web/src/i18n/resources/zh-CN/common.ts:193-208`
- Modify: `apps/web/src/i18n/resources/en-US/common.ts:198-214`

- [ ] **Step 1: 写 PackagingTypeSelect 的失败测试**

创建 `packaging-type-select.test.tsx`：

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PackagingTypeSelect } from "@/features/mes/packaging/packaging-type/packaging-type-select";
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";
import { i18n } from "@/i18n/config";
import { setNavigatorLanguage } from "@/test/setup";

const options: PackagingTypeOptionDto[] = [
  { Id: 1, TypeCode: "TYPE-001", TypeName: "Carton" },
  { Id: 2, TypeCode: "TYPE-002", TypeName: "Pallet" },
];

function renderSelect({
  value = "",
  onValueChange = vi.fn(),
  ...props
}: Partial<Parameters<typeof PackagingTypeSelect>[0]> = {}) {
  render(
    <PackagingTypeSelect
      options={options}
      value={value}
      onValueChange={onValueChange}
      {...props}
    />,
  );
}

describe("PackagingTypeSelect", () => {
  beforeEach(async () => {
    setNavigatorLanguage("zh-CN");
    await i18n.changeLanguage("zh-CN");
  });

  it("displays the code and name for the selected option", () => {
    renderSelect({ value: "TYPE-002" });

    expect(screen.getByRole("combobox")).toHaveTextContent(
      "TYPE-002-Pallet",
    );
  });

  it.each(["TYPE-002", "Pallet"])(
    "filters by %s and returns only the type code",
    async (searchTerm) => {
      const onValueChange = vi.fn();
      renderSelect({ onValueChange });

      fireEvent.click(screen.getByRole("combobox"));
      fireEvent.change(
        screen.getByPlaceholderText("搜索包装类型编码或名称"),
        { target: { value: searchTerm } },
      );

      expect(
        screen.queryByRole("option", { name: "TYPE-001-Carton" }),
      ).not.toBeInTheDocument();
      fireEvent.click(
        await screen.findByRole("option", { name: "TYPE-002-Pallet" }),
      );

      expect(onValueChange).toHaveBeenCalledWith("TYPE-002");
    },
  );

  it("returns an empty string when cleared", () => {
    const onValueChange = vi.fn();
    renderSelect({ value: "TYPE-001", onValueChange });

    fireEvent.click(screen.getByRole("button", { name: "清空包装类型" }));

    expect(onValueChange).toHaveBeenCalledWith("");
  });

  it("shows the localized empty result", async () => {
    renderSelect({ options: [] });

    fireEvent.click(screen.getByRole("combobox"));

    expect(await screen.findByText("暂无包装类型")).toBeInTheDocument();
  });

  it("disables the trigger and clear button", () => {
    renderSelect({ value: "TYPE-001", disabled: true });

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "清空包装类型" }),
    ).toBeDisabled();
  });

  it("forwards custom copy and accessible names", async () => {
    renderSelect({
      options: [],
      value: "TYPE-001",
      "aria-label": "Custom type",
      placeholder: "Custom placeholder",
      searchPlaceholder: "Custom search",
      emptyText: "Custom empty",
      clearLabel: "Custom clear",
    });

    expect(
      screen.getByRole("combobox", { name: "Custom type" }),
    ).toHaveTextContent("Custom placeholder");
    expect(
      screen.getByRole("button", { name: "Custom clear" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("combobox", { name: "Custom type" }));
    expect(screen.getByPlaceholderText("Custom search")).toBeInTheDocument();
    expect(await screen.findByText("Custom empty")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行组件测试并确认因缺少组件/类型失败**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx
```

Expected: FAIL，模块 `packaging-type-select` 或包装类型领域中的 `PackagingTypeOptionDto` 尚不存在。

- [ ] **Step 3: 把 PackagingTypeOptionDto 迁移到包装类型契约**

在 `packaging-contract.ts` 的 `PackagingTypeApiDto` 后加入：

```ts
export type PackagingTypeOptionDto = {
  Id: number;
  TypeCode: string;
  TypeName: string;
};
```

从 `packaging-spec-contract.ts` 删除同名类型。

在 `packaging-spec-service.ts` 中保留包装规格类型导入：

```ts
import type {
  CreatePackagingSpecInput,
  PackagingSpecApiDto,
  PackagingSpecListQuery,
  UpdatePackagingSpecInput,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
```

并新增：

```ts
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";
```

在 `packaging-spec-form-dialog.tsx` 删除本地 `PackagingTypeOption` 声明，新增：

```ts
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";
```

将 props 改为：

```ts
typeOptions: PackagingTypeOptionDto[];
```

运行时对象形状不变，不添加 DTO 映射。

- [ ] **Step 4: 增加中英文包装类型选择器文案**

在 `zh-CN/common.ts` 的 `pages.packagingType` 下、`filters` 后加入：

```ts
select: {
  placeholder: "请选择包装类型",
  searchPlaceholder: "搜索包装类型编码或名称",
  emptyText: "暂无包装类型",
  clearLabel: "清空包装类型",
},
```

在 `en-US/common.ts` 对应位置加入：

```ts
select: {
  placeholder: "Select packaging type",
  searchPlaceholder: "Search packaging type code or name",
  emptyText: "No packaging types",
  clearLabel: "Clear packaging type",
},
```

- [ ] **Step 5: 最小实现 PackagingTypeSelect**

创建 `packaging-type-select.tsx`：

```tsx
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Combobox } from "@/components/ui/combobox";
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";

type PackagingTypeSelectProps = {
  options: PackagingTypeOptionDto[];
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
  "data-testid"?: string;
  "aria-label"?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  clearLabel?: string;
};

export function PackagingTypeSelect({
  options,
  value,
  onValueChange,
  disabled = false,
  id,
  "data-testid": dataTestId,
  "aria-label": ariaLabel,
  placeholder,
  searchPlaceholder,
  emptyText,
  clearLabel,
}: PackagingTypeSelectProps) {
  const { t } = useTranslation("common");
  const comboboxOptions = useMemo(
    () =>
      options.map((option) => ({
        value: option.TypeCode,
        label: `${option.TypeCode}-${option.TypeName}`,
      })),
    [options],
  );

  return (
    <Combobox
      id={id}
      data-testid={dataTestId}
      options={comboboxOptions}
      value={value}
      disabled={disabled}
      aria-label={
        ariaLabel ?? t("pages.packagingType.filters.typeCode")
      }
      placeholder={
        placeholder ?? t("pages.packagingType.select.placeholder")
      }
      searchPlaceholder={
        searchPlaceholder ??
        t("pages.packagingType.select.searchPlaceholder")
      }
      emptyText={emptyText ?? t("pages.packagingType.select.emptyText")}
      clearLabel={
        clearLabel ?? t("pages.packagingType.select.clearLabel")
      }
      onValueChange={onValueChange}
    />
  );
}
```

不要在组件中调用 query hook，不渲染 `Field` 或额外名称输入框。

- [ ] **Step 6: 运行组件测试并确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx
```

Expected: PASS，七个组件行为测试全部通过。

- [ ] **Step 7: 运行受影响的包装规格页面测试**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

Expected: PASS；现有页面测试证明类型归属迁移没有改变新增/编辑表单行为。

- [ ] **Step 8: 创建提交（仅在用户明确授权后）**

```bash
git add \
  apps/web/src/features/mes/packaging/packaging-type/packaging-contract.ts \
  apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.tsx \
  apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-contract.ts \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.ts \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx \
  apps/web/src/i18n/resources/zh-CN/common.ts \
  apps/web/src/i18n/resources/en-US/common.ts
git commit -m "feat(mes): add packaging type select"
```

### Task 3: 接入包装规格筛选并锁定数据流

**Files:**
- Modify: `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx:1-85`
- Modify: `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx:109-116,331-345`
- Test: `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx:52-200,361-556`

- [ ] **Step 1: 把现有筛选测试改为期待接口标签**

在 `filters the list with code, type, and enabled status` 测试中，把包装类型选项名称从：

```tsx
"TYPE-002"
```

改为：

```tsx
"TYPE-002-Pallet"
```

这一步必须先于实现执行，以证明当前写死选择器无法展示接口返回的编码和名称。

- [ ] **Step 2: 新增清空和重置集成测试**

在 `packaging-spec-page.test.tsx` 的筛选测试后追加：

```tsx
it("clears and resets the dynamic packaging type filter", async () => {
  setMesTransportForTests(createStatefulPackagingSpecTransport());

  render(<App initialEntries={["/packaging/packaging-spec"]} />);

  await screen.findByText("SPEC-001");

  await selectRadixOption(
    screen.getByRole("combobox", { name: "包装类型编码" }),
    "TYPE-002-Pallet",
  );
  fireEvent.click(screen.getByRole("button", { name: "查询" }));

  expect(await screen.findByText("SPEC-002")).toBeInTheDocument();
  expect(screen.queryByText("SPEC-001")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "清空包装类型" }));
  fireEvent.click(screen.getByRole("button", { name: "查询" }));

  expect(await screen.findByText("SPEC-001")).toBeInTheDocument();
  expect(screen.getByText("SPEC-002")).toBeInTheDocument();

  await selectRadixOption(
    screen.getByRole("combobox", { name: "包装类型编码" }),
    "TYPE-002-Pallet",
  );
  fireEvent.click(screen.getByRole("button", { name: "重置" }));

  expect(await screen.findByText("SPEC-001")).toBeInTheDocument();
  expect(screen.getByText("SPEC-002")).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "清空包装类型" }),
  ).not.toBeInTheDocument();
});
```

该测试通过 transport 对请求 body 的现有过滤逻辑，间接锁定：选择时发送 `PackagingTypeCode`，清空和重置时不发送该字段。

- [ ] **Step 3: 新增初次加载禁用态测试**

追加：

```tsx
it("disables the packaging type filter while options load", async () => {
  const baseTransport = createStatefulPackagingSpecTransport();
  let resolveOptions!: () => void;
  const optionsGate = new Promise<void>((resolve) => {
    resolveOptions = resolve;
  });
  const transport = vi.fn<Transport>(async (request) => {
    if (
      request.path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas"
    ) {
      await optionsGate;
    }

    return await baseTransport(request);
  });

  setMesTransportForTests(transport);
  render(<App initialEntries={["/packaging/packaging-spec"]} />);

  const typeSelect = await screen.findByRole("combobox", {
    name: "包装类型编码",
  });
  expect(typeSelect).toBeDisabled();

  resolveOptions();

  await waitFor(() => expect(typeSelect).toBeEnabled());
});
```

- [ ] **Step 4: 运行页面测试并确认失败原因正确**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

Expected: FAIL；当前筛选区找不到 `TYPE-002-Pallet`，也没有国际化清空按钮或加载禁用行为。

- [ ] **Step 5: 修改 PackagingSpecFilterForm 的契约和渲染**

新增 imports：

```tsx
import { PackagingTypeSelect } from "@/features/mes/packaging/packaging-type/packaging-type-select";
import type { PackagingTypeOptionDto } from "@/features/mes/packaging/packaging-type/packaging-contract";
```

扩展 props：

```tsx
type PackagingSpecFilterFormProps = {
  defaultValues: PackagingSpecFilters;
  typeOptions: PackagingTypeOptionDto[];
  typeOptionsLoading: boolean;
  onSubmit: (values: PackagingSpecFilters) => void;
  onReset: (values: PackagingSpecFilters) => void;
};
```

在函数参数中解构 `typeOptions`、`typeOptionsLoading`。把包装类型的整个写死 `<Select>...</Select>` 替换为：

```tsx
<PackagingTypeSelect
  options={typeOptions}
  value={values.packagingTypeCode ?? ""}
  disabled={typeOptionsLoading}
  aria-label={t("pages.packagingSpec.filters.packagingTypeCode")}
  placeholder={t(
    "pages.packagingSpec.filters.packagingTypeCodePlaceholder",
  )}
  onValueChange={(value) =>
    setValues((current) => ({
      ...current,
      // An empty string maps to undefined, which means all packaging types.
      packagingTypeCode: value === "" ? undefined : value,
    }))
  }
/>
```

保留启用状态使用的 `Select` imports，不要删除 `SelectContent`、`SelectGroup`、`SelectItem`、`SelectTrigger`、`SelectValue`。

- [ ] **Step 6: 从 PackagingSpecPage 传入现有查询结果**

把页面中的筛选表单调用改为：

```tsx
<PackagingSpecFilterForm
  defaultValues={filters}
  typeOptions={typeOptionsQuery.data ?? []}
  typeOptionsLoading={typeOptionsQuery.isLoading}
  onSubmit={(nextFilters) => {
    setFilters(nextFilters);
    setPageIndex(1);
    setSearchVersion((current) => current + 1);
  }}
  onReset={(nextFilters) => {
    setFilters(nextFilters);
    setPageIndex(1);
    setSearchVersion((current) => current + 1);
  }}
/>
```

不要新增 query hook；页面下方的 `PackagingSpecFormDialog` 继续接收：

```tsx
typeOptions={typeOptionsQuery.data ?? []}
```

- [ ] **Step 7: 运行页面测试并确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

Expected: PASS；动态标签筛选、清空、重置、加载禁用以及原有页面行为全部通过。

- [ ] **Step 8: 运行三个定向测试文件**

Run:

```bash
pnpm --filter @repo/web exec vitest run \
  src/components/ui/combobox.test.tsx \
  src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx \
  src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
```

Expected: PASS，无定向回归。

- [ ] **Step 9: 创建提交（仅在用户明确授权后）**

```bash
git add \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx
git commit -m "refactor(mes): use dynamic packaging type filter"
```

### Task 4: 完整验证和交付检查

**Files:**
- Verify: all files listed above
- Verify: `docs/specs/2026-07-13/packaging-type-select-design.md`
- Verify: `docs/plans/2026-07-13/packaging-type-select-implementation-plan.md`

- [ ] **Step 1: 运行 Web 全部单元测试**

Run:

```bash
pnpm --filter @repo/web test
```

Expected: PASS，无失败测试。

- [ ] **Step 2: 运行 Web 类型检查**

Run:

```bash
pnpm --filter @repo/web typecheck
```

Expected: PASS，类型迁移后的所有 import 和 props 均一致。

- [ ] **Step 3: 运行 Web lint**

Run:

```bash
pnpm --filter @repo/web lint
```

Expected: PASS，无 ESLint 错误。

- [ ] **Step 4: 运行 Web 完整验证**

Run:

```bash
pnpm verify:web
```

Expected: PASS，Web 的测试、类型检查、lint 和构建链路全部通过。

- [ ] **Step 5: 检查代码中不再存在写死筛选项**

Run:

```bash
rg -n 'SelectItem value="TYPE-00[123]"' \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx
```

Expected: 无输出，命令退出码为 1；筛选表单中没有写死包装类型。

- [ ] **Step 6: 检查包装类型选项查询没有重复**

Run:

```bash
rg -n "usePackagingSpecTypeOptionsQuery" \
  apps/web/src/features/mes/packaging/packaging-spec
```

Expected: 仅显示 query hook 定义、`packaging-spec-page.tsx` 的 import 和页面中的唯一调用；`PackagingTypeSelect` 与筛选表单内没有调用。

- [ ] **Step 7: 检查 diff 和工作区状态**

Run:

```bash
git diff --check
git status --short
git diff --stat
```

Expected: `git diff --check` 无输出；状态只包含本 spec、plan 和本计划列出的代码/测试/i18n 文件，没有无关改动。

- [ ] **Step 8: 按设计规格逐项复核完成标准**

确认以下结果全部成立：

```text
[ ] 筛选表单没有 TYPE-001/002/003 写死选项
[ ] 接口选项显示为 TypeCode-TypeName
[ ] Combobox 按编码和名称搜索
[ ] onValueChange 和列表请求只使用 TypeCode
[ ] 清空和重置映射为 undefined
[ ] 初次加载时禁用，后台刷新已有数据时不禁用
[ ] 页面没有新增第二个包装类型 query hook
[ ] 新增/编辑表单继续复用原 typeOptionsQuery
[ ] 中英文选择、搜索、空结果、清空文案完整
[ ] 所有实际执行的验证命令及结果已记录
```

- [ ] **Step 9: 创建最终提交（仅在用户明确授权且前面未按任务提交时）**

```bash
git add docs/specs/2026-07-13/packaging-type-select-design.md \
  docs/plans/2026-07-13/packaging-type-select-implementation-plan.md \
  apps/web/src/components/ui/combobox.tsx \
  apps/web/src/components/ui/combobox.test.tsx \
  apps/web/src/features/mes/packaging/packaging-type/packaging-contract.ts \
  apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.tsx \
  apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-contract.ts \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.ts \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx \
  apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx \
  apps/web/src/i18n/resources/zh-CN/common.ts \
  apps/web/src/i18n/resources/en-US/common.ts
git commit -m "feat(mes): add dynamic packaging type select"
```

若之前已经按 Task 1–3 创建提交，本步骤不再创建重复提交，只确认工作区干净。
