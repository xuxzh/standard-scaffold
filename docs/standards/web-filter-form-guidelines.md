# Web 列表筛选表单规范

本文档定义 `apps/web` 列表筛选表单（`apps/web/src/features/.../*-filter-form.tsx`）在 contract、filter form、queries、i18n 各层如何表达"不选等于全部"的统一约定。它服务于日常功能开发和 AI 执行，回答"筛选条件到底是三态字符串还是带 `| undefined` 的原生类型"和"下拉占位 / `options.all` 要不要保留"。

本规范是 `web-code-guidelines.md`、`web-i18n-guidelines.md` 与 `mes-page-data-integration-template.md` 的补充，专门解决散落在多份 spec / plan / template / UI 原型里的 boolean 三态约定。

## 基线

- filter 状态用"原生类型 + `| undefined`"表达"不选"，不要发明三态字符串、哨兵字符串或额外的适配函数。
- `undefined` ≡ 不过滤该字段。后端在列表查询请求体里收到 `undefined` 或缺省字段等价于"全部"。
- contract、queries、form 之间直接透传 `boolean | undefined` / `string | undefined`，**不再写 `mapTriStateBoolean` / `mapEnabledFilter` / `mapRecyclableFilter` 之类的字段适配函数**。
- UI 控件沿用 `docs/ui/components/form-patterns.md`：filter 表单里的 boolean / 枚举字段继续用 `Select`，**不再提供"全部"选项**——未选时显示 placeholder 占位，等价于"全部"。

## 适用范围

- `apps/web/src/features/.../*-filter-form.tsx`：所有列表筛选表单（MES / WMS / 其他业务模块）。
- 与之配套的 `*-contract.ts` 中的 `XxxFilters` 类型与默认 filter 值。
- 与之配套的 `*-queries.ts` 中的列表请求体拼装。
- `apps/web/src/i18n/resources/<locale>/common.ts` 中对应 namespace 的 placeholder / options 文案。

不在本规范约束范围内的场景：

- 业务表单（`*form*.tsx` / `*-form-dialog.tsx`）中的二值布尔字段，沿用 `docs/ui/components/form-patterns.md` 的 Switch 写法，不在本规范管辖。
- 数据导出范围（"全部 / 当前 / 选中"）的 `export.options.all`，与查询表单无关，继续保留 `options.all`。
- 跨 Tab / 跨页面的可分享筛选状态（TanStack Router search params），由 `web-code-guidelines.md` 的 Zustand / search-params 章节约束，不在本规范重复。

## contract 层规则

filter 状态统一表达为原生类型 + `| undefined`，默认值显式声明 `undefined`：

```typescript
// boolean 字段
export type PackagingTypeFilters = {
  typeCode: string;
  typeName: string;
  // 不传值代表不过滤，等价于"全部"
  isRecyclable: boolean | undefined;
};

// 字符串枚举字段
export type PackagingSpecFilters = {
  specCode: string;
  specName: string;
  // 不传值代表不过滤，等价于"全部"
  packagingTypeCode: string | undefined;
  isEnabled: boolean | undefined;
};
```

约束：

- 布尔字段：`field: boolean | undefined`。
- 字符串枚举字段（多选一，例如包装类型编码、规格编码等候选列表）：`field: string | undefined`。
- 默认值显式 `undefined`，即使 TS 能推断也写出来，便于 `rg` 检索：

  ```typescript
  export const packagingTypeDefaultFilters: PackagingTypeFilters = {
    typeCode: "",
    typeName: "",
    isRecyclable: undefined,
  };
  ```

- 不要在 contract 里发明 `"all" | "true" | "false"`、`"all" | true | false`、`0 | 1 | 2`、哨兵字符串（`__all__`、`__all_<field>__`）等三态表达。

## filter form 规则

受控 `Select` 直接绑定 `boolean | undefined` / `string | undefined`：

```tsx
<Select
  value={values.isRecyclable === undefined ? "" : values.isRecyclable ? "true" : "false"}
  onValueChange={(value) =>
    setValues((current) => ({
      ...current,
      // 不传值（空字符串）=> undefined => 不过滤
      isRecyclable: value === "" ? undefined : value === "true",
    }))
  }
>
  <SelectTrigger aria-label={t("pages.<feature>.filters.<field>")} className="w-full">
    <SelectValue placeholder={t("pages.<feature>.filters.<field>Placeholder")} />
  </SelectTrigger>
  <SelectContent>
    <SelectGroup>
      <SelectItem value="true">{t("pages.<feature>.filters.options.true")}</SelectItem>
      <SelectItem value="false">{t("pages.<feature>.filters.options.false")}</SelectItem>
    </SelectGroup>
  </SelectContent>
</Select>
```

字符串枚举字段的写法相同，只是 `onValueChange` 不需要做 boolean 解析：

```tsx
<Select
  value={values.packagingTypeCode ?? ""}
  onValueChange={(value) =>
    setValues((current) => ({
      ...current,
      packagingTypeCode: value === "" ? undefined : value,
    }))
  }
>
```

约束：

- 不放"全部" `SelectItem`；未选即显示 placeholder 占位。
- `onValueChange` 把空串归为 `undefined`，避免把空字符串误传给后端。
- 布尔字段用三目把 `boolean | undefined` 转回 `"true"` / `"false"` 字符串供 SelectItem 匹配；不要再二次 `as` 断言，三目本身就够。
- 字符串枚举字段用 `values.field ?? ""`，三目里 `value === "" ? undefined : value` 即可。
- filter form 内部不引入任何 `"all"` 哨兵或额外适配函数。

## queries / 列表请求规则

`*-queries.ts` 直接透传 filter 字段，不要再加 map* 适配函数：

```typescript
function buildListRequest(
  filters: XxxFilters,
  pageIndex: number,
  pageSize: number,
) {
  return {
    IsPaged: true,
    PageIndex: pageIndex,
    PageSize: pageSize,
    SpecCode: filters.specCode || undefined,
    SpecName: filters.specName || undefined,
    // 不再写 mapEnabledFilter / mapTriStateBoolean；undefined 透传即"不过滤"
    PackagingTypeCode: filters.packagingTypeCode,
    IsEnabled: filters.isEnabled,
    IsRecyclable: filters.isRecyclable,
  } as const;
}
```

约束：

- `IsXxx` 字段直接 `= filters.field`，由 React Query / fetch 序列化时把 `undefined` 字段自动剔除。
- 不要写 `field || undefined` 把已经是 `undefined` 的字段再归一化一次。
- 不要新增 `mapTriStateBoolean` / `mapEnabledFilter` / `mapRecyclableFilter` / `mapXxxFilter` 之类的字段适配函数。

## i18n 规则

placeholder 走 `filters.<field>Placeholder`，与现有 `filters.<field>Placeholder` 输入框占位命名风格一致：

```typescript
filters: {
  specCode: "规格编码",
  specCodePlaceholder: "请输入规格编码",
  packagingTypeCode: "包装类型编码",
  packagingTypeCodePlaceholder: "请选择包装类型",
  isEnabled: "启用状态",
  isEnabledPlaceholder: "请选择启用状态",
  options: {
    true: "启用",
    false: "禁用",
  },
}
```

约束：

- `options` 字典只保留业务值键：布尔字段保留 `options.true` / `options.false`；字符串枚举字段保留各自的枚举 key。
- **不要在 `options` 里出现 `all` 这类"全部"语义键**——它的语义已经由 placeholder 占位承担。
- placeholder 文案面向用户，必须走 i18n，不要硬编码中英文。
- 数据导出范围的 `options.all` 与本规范无关，按既有约定保留。

## 测试与验证

落盘每条规则后，至少跑：

- `pnpm --filter @repo/web typecheck`
- `pnpm --filter @repo/web exec eslint <改动文件>`
- 对应模块的 vitest：`pnpm --filter @repo/web exec vitest run src/features/<feature>`

测试断言优用户可见行为：

- 点开筛选下拉只看到业务值（true / false 或枚举候选），不出现"全部"项。
- 未选时 placeholder 文本可见。
- 提交搜索后，列表请求体里"未选字段"必须不存在；选中字段值与下拉选项一致。
- 重置按钮回到默认值，三个字段（boolean / 字符串枚举 / 文本输入）都应该恢复"不过滤 / 不过滤 / 空字符串"。

E2E：

- `apps/web-e2e/pages/<feature>/<feature>.page.ts` 的 `FilterValues` 类型从 `"all" | "true" | "false"` 改为 `boolean | undefined`。
- `apps/web-e2e/tests/<feature>/<feature>.spec.ts` 里调用 `filter()` 时直接传 `true` / `false`，"不过滤"场景不传该字段。

## 反模式索引

不要：

- 在 contract 里发明 `"all" | "true" | "false"` / `0 | 1 | 2` / 哨兵字符串等三态。
- 在 filter form 里渲染"全部" `SelectItem`，或把"全部"作为 sentinel 字符串用户可见。
- 在 queries 层写 `mapTriStateBoolean` / `mapEnabledFilter` / `mapRecyclableFilter` / `mapXxxFilter`。
- 在 i18n 里出现 `options.all` 这类"全部"键（仅数据导出范围例外）。
- 用 `value === "true" as Filters["field"]` 这种二次断言，三目足够。

## 例外路径

仅当后端协议要求在请求体里显式传 `"all"` 或不接受字段缺省时，才退回三态字符串。使用例外时需要：

- 在该模块对应的 ADR 或注释里写清楚后端约束。
- 在 `queries` 层提供**唯一**一个集中适配函数（例如 `mapLegacyBooleanFilter`），而不是每个 caller 各自写。
- 把该字段的 i18n key 与 UI 控件更新为遵循本规范的形式，仅在请求适配层做一次性转换。
