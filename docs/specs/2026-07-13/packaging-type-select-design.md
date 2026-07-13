# 包装类型动态选择器设计

日期：2026-07-13

## 背景

包装规格筛选表单中的包装类型目前使用三个写死的 `TYPE-001`、`TYPE-002`、`TYPE-003` 选项。该实现不能反映包装类型维护页面中的实际数据，新增、修改或删除包装类型后，筛选条件会与服务端主数据脱节。

包装规格页面已经通过 `usePackagingSpecTypeOptionsQuery(true)` 调用 `POST /PackagingTypeApi/GetPackagingTypeAutoQueryDatas`，并把查询结果提供给新增/编辑表单。因此，本次不需要增加新的接口请求，只需抽取包装类型领域内的受控选择组件，并让筛选表单复用页面已经加载的选项。

## 目标

- 在 `packaging-type` 功能目录新增可复用的 `PackagingTypeSelect`。
- 使用现有 `Combobox` 提供按包装类型编码或名称搜索的单字段选择体验。
- 下拉项显示“类型编码-类型名称”，受控值和变更回调只使用类型编码。
- 使用真实包装类型接口数据替换包装规格筛选表单中的写死选项。
- 保持包装规格筛选的查询、清空、重置及分页重置语义不变。
- 复用包装规格页面现有的包装类型选项查询，不增加重复请求。
- 保持中英文、多语言和可访问性支持。

## 非目标

- 不修改包装类型列表接口、请求参数或服务端行为。
- 不新增包装类型远程搜索、服务端分页或虚拟滚动。
- 不改造包装规格新增/编辑表单的包装类型字段布局。
- 不把组件迁移到 `packages/ui` 或无业务语义的 `components/ui`。
- 不抽象跨实体的泛型选择器。
- 不改动包装规格其他筛选字段及列表查询契约。

## 范围级别

任务级别为 `L2`。

本次新增领域组件，并调整页面、筛选表单、契约归属、国际化和测试等多个文件的数据流。实施前必须具备正式 spec 和 plan，并在 `.worktrees/codex-packaging-type-select` 隔离 worktree 中执行。

## 现有接口与数据流

包装规格页面已有包装类型选项查询：

```text
PackagingSpecPage
  -> usePackagingSpecTypeOptionsQuery(true)
  -> getPackagingTypeOptions({ signal })
  -> POST /PackagingTypeApi/GetPackagingTypeAutoQueryDatas
     {
       IsPaged: false,
       PageIndex: 1,
       PageSize: 1000
     }
  -> PackagingTypeOptionDto[]
```

接口选项结构为：

```ts
type PackagingTypeOptionDto = {
  Id: number;
  TypeCode: string;
  TypeName: string;
};
```

该查询当前已经为 `PackagingSpecFormDialog` 提供 `typeOptions`。本次将同一个查询结果同时传给 `PackagingSpecFilterForm`，React Query 查询和网络请求数量不变。

## 设计选择

### 采用方案：领域内的受控展示组件

在 `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.tsx` 新增 `PackagingTypeSelect`。组件接收调用方已经加载的选项，只负责展示、搜索、选择和清空，不直接调用接口。

采用该方案的原因：

- 与现有 `LabelRuleSelect` 的“父级加载、组件受控展示”模式一致。
- 包装规格页面已经拥有同一份选项数据，可以避免重复请求。
- 组件不依赖具体页面或 React Query，便于独立测试和其他表单复用。
- 请求失败提示继续由项目统一的 Query 错误处理负责，避免组件重复通知。

### 未采用方案

#### 组件内部加载接口

该方案能减少调用方 props，但会让展示组件依赖查询层；在包装规格页面已有相同请求的前提下，还会形成重复的数据所有权和潜在重复请求。

#### 仅在筛选表单中动态渲染

该方案改动较少，但包装类型格式化、搜索和清空逻辑仍会绑定在包装规格筛选表单中，不能形成用户要求的可复用组件。

#### 同时支持外部选项和内部加载

双模式接口更灵活，但会增加优先级、加载状态和错误状态的组合，不符合本次明确的数据来源和 YAGNI 原则。

## 契约归属

`PackagingTypeOptionDto` 当前定义在 `packaging-spec-contract.ts`，但其语义属于包装类型领域。实施时将该类型迁移到 `packaging-type/packaging-contract.ts`，并更新包装规格 service、查询、表单及新选择组件的类型引用。

迁移只改变 TypeScript 类型归属，不改变运行时数据、接口请求或返回映射。

## 组件契约

`PackagingTypeSelect` 使用受控值：

```ts
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
```

契约约束：

- `options` 是唯一选项来源；组件不发起网络请求。
- `value` 是当前包装类型编码，空字符串表示未选择。
- `onValueChange` 在选择时返回 `TypeCode`，清空时返回空字符串。
- 组件将每个选项映射为 `{ value: TypeCode, label: `${TypeCode}-${TypeName}` }`。
- `disabled` 用于初次加载期间禁止交互。
- placeholder、搜索提示、空结果和清空按钮的可访问文案支持调用方覆盖；未传入时使用包装类型领域的 i18n 默认值。
- 现有 `Combobox` 增加通用的 `disabled` 与 `clearLabel` props：`disabled` 同时禁用触发按钮和清空按钮，`clearLabel` 替代当前硬编码的英文清空名称；默认值保持现有行为，避免破坏其他调用方。
- 组件只渲染单个 `Combobox`，不渲染额外的只读名称输入框，适配筛选区布局。
- 组件不包含 `Field` 或可见标签；调用方通过 `aria-label` 或外层字段结构建立语义。

## 页面接入与状态流

`PackagingSpecPage` 向筛选表单新增以下输入：

```text
typeOptions = typeOptionsQuery.data ?? []
typeOptionsLoading = typeOptionsQuery.isLoading
```

筛选表单将写死的 shadcn `Select` 替换为：

```text
PackagingTypeSelect
  options = typeOptions
  value = values.packagingTypeCode ?? ""
  disabled = typeOptionsLoading
  onValueChange(value)
    -> value === "" ? undefined : value
    -> 更新本地 PackagingSpecFilters
```

完整筛选数据流为：

```text
PackagingSpecPage 已有选项查询
  -> PackagingSpecFilterForm
  -> PackagingTypeSelect
  -> 用户按编码或名称搜索并选择
  -> onValueChange(TypeCode)
  -> filter local state.packagingTypeCode
  -> 用户点击查询
  -> PackagingSpecPage filters
  -> 包装规格列表请求 PackagingTypeCode
```

页面仍只在用户点击“查询”时提交筛选条件。选择下拉项本身不立即刷新列表。

## 清空与重置语义

- `Combobox` 的清空按钮调用 `onValueChange("")`。
- `PackagingSpecFilterForm` 将空字符串转换为 `packagingTypeCode: undefined`。
- `undefined` 表示包装规格列表请求不传 `PackagingTypeCode`，即查询全部包装类型。
- 点击“重置”继续使用 `packagingSpecDefaultFilters`，清空包装类型并立即调用现有 `onReset`。
- `PackagingSpecPage` 的查询和重置仍将页码恢复为第一页并递增 `searchVersion`。
- 其他筛选字段和本地表单状态模式保持不变。

## 加载、失败与边界行为

- 初次加载选项时禁用选择器，避免用户打开尚未准备好的空列表。
- 后台重新获取已有选项时保留当前数据和交互，不因 `isFetching` 临时禁用。
- 请求失败由现有 Query 全局错误处理统一提示，选择组件不重复弹出通知。
- 请求失败且没有缓存数据时，组件收到空数组，并显示国际化空结果文案。
- 选项数组为空时仍允许清空已有筛选值。
- 当前值不在选项数组中时不伪造名称；组件保持受控编码值，待选项恢复后重新得到正确标签。
- 重复的 `TypeCode` 不由前端修正；接口应保证包装类型编码唯一。测试数据保持编码唯一。
- 类型名称为空时仍按统一格式生成标签；本次不增加额外数据清洗规则。

## 多语言与可访问性

在 `zh-CN/common.ts` 和 `en-US/common.ts` 中为包装类型选择器补充对等文案：

- 默认选择 placeholder。
- 搜索输入 placeholder。
- 空结果提示。
- 清空按钮的可访问名称。

筛选场景继续使用 `pages.packagingSpec.filters.packagingTypeCode` 作为 `aria-label`。选择器基于现有 `Combobox` 获得键盘导航、搜索和清空能力。`Combobox` 新增的 `clearLabel` 让清空按钮不再依赖硬编码英文；其他调用方未传入时仍使用原默认值。测试通过角色、可访问名称和用户可见文案定位，不依赖 Tailwind 类名或脆弱 DOM 结构。

## 文件影响

### 新增

- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.tsx`：受控包装类型选择组件。
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-select.test.tsx`：组件渲染、搜索、选择、清空和禁用测试。

### 修改

- `apps/web/src/components/ui/combobox.tsx`：增加通用 `disabled` 和 `clearLabel` 透传，默认行为保持兼容。
- `apps/web/src/components/ui/combobox.test.tsx`：验证禁用态和自定义清空可访问名称。

- `apps/web/src/features/mes/packaging/packaging-type/packaging-contract.ts`：承接 `PackagingTypeOptionDto` 类型。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-contract.ts`：移除迁移后的包装类型选项类型。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-service.ts`：从包装类型契约导入选项类型。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-form-dialog.tsx`：更新选项类型导入，不改变表单行为。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-filter-form.tsx`：接收动态选项和加载状态，使用 `PackagingTypeSelect` 替换写死数据。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.tsx`：把现有查询结果和初次加载状态传给筛选表单。
- `apps/web/src/features/mes/packaging/packaging-spec/packaging-spec-page.test.tsx`：验证筛选区使用接口选项及提交、清空、重置行为。
- `apps/web/src/i18n/resources/zh-CN/common.ts`：增加中文选择器文案。
- `apps/web/src/i18n/resources/en-US/common.ts`：增加英文选择器文案。

筛选本地状态与页面请求装配统一在现有 `packaging-spec-page.test.tsx` 中验证，本次不新增独立的 `packaging-spec-filter-form.test.tsx`，避免重复覆盖同一行为。

## 测试设计

### `PackagingTypeSelect` 组件测试

- 选项以“编码-名称”展示。
- 可通过类型编码搜索并选择。
- 可通过类型名称搜索并选择。
- 选择后 `onValueChange` 只收到类型编码。
- 清空后 `onValueChange` 收到空字符串。
- 传入当前值时展示对应的“编码-名称”。
- 空选项时展示国际化空结果文案。
- `disabled` 时不能打开或修改选择器。
- 自定义 placeholder、搜索提示、空结果提示、清空按钮名称和选择框可访问名称能够透传。
- `disabled` 会传递到基础 `Combobox`，触发按钮和清空按钮均不可操作。

### 包装规格筛选集成测试

- 包装类型接口返回的动态选项出现在筛选区。
- 原写死的 `TYPE-001`、`TYPE-002`、`TYPE-003` 不再由筛选表单源码提供。
- 选择包装类型并点击查询后，列表请求包含对应 `PackagingTypeCode`。
- 清空选择并点击查询后，列表请求不包含 `PackagingTypeCode`。
- 点击重置后选择器清空，页码恢复为第一页，并按默认筛选重新查询。
- 初次加载选项期间选择器不可交互。
- 页面只使用已有的包装类型选项查询，不引入第二个查询 hook 或额外请求。

### 回归测试

- 包装规格新增/编辑表单继续使用同一选项查询结果。
- 包装类型名称自动回填和提交 payload 保持不变。
- 启用状态、规格编码、规格名称筛选行为保持不变。
- 中英文资源键完整且类型检查通过。

## 验证计划

实施阶段按由窄到宽的顺序执行：

```bash
pnpm --filter @repo/web test -- packaging-type-select
pnpm --filter @repo/web test -- packaging-spec-page
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm verify:web
```

本次不新增独立筛选表单测试；第一组定向测试运行 `packaging-type-select`，筛选集成行为由 `packaging-spec-page` 定向测试覆盖。本次不新增 Playwright E2E；现有 Testing Library 页面测试足以验证选项接口装配和筛选请求行为。

## 风险与缓解

### 重复请求

风险：选择组件内部再次调用包装类型接口，造成页面与组件各自持有查询状态。

缓解：组件契约只接收 `options`；页面复用现有 `typeOptionsQuery`。

### 空值语义漂移

风险：`Combobox` 清空返回空字符串，而筛选契约使用 `undefined` 表示全部，可能导致列表请求携带错误空值。

缓解：转换逻辑保留在筛选表单边界，并通过请求断言验证清空后不发送 `PackagingTypeCode`。

### DTO 归属调整造成导入遗漏

风险：迁移 `PackagingTypeOptionDto` 后，包装规格 service 或表单仍引用旧路径。

缓解：用 TypeScript 类型检查覆盖全部引用，并保持迁移仅限类型声明和 import。

### 加载失败影响新增/编辑表单

风险：筛选组件接入时错误修改现有查询或错误状态，导致表单候选项不可用。

缓解：不改变 query hook、service 或请求参数；页面继续把同一 `typeOptionsQuery.data` 传给表单，并保留现有 `optionsError` 逻辑。

### 搜索标签与提交值混淆

风险：把“编码-名称”标签误作为筛选值提交。

缓解：`Combobox` option 的 `value` 固定为 `TypeCode`，测试同时断言可见标签和回调参数。

## 完成标准

- 包装规格筛选区不再包含写死包装类型选项。
- 筛选区展示接口返回的“类型编码-类型名称”可搜索选项。
- 选中后仅以类型编码提交筛选条件。
- 清空和重置仍使用 `undefined` 表示查询全部包装类型。
- 包装规格页面复用现有选项请求，没有新增重复请求。
- 包装规格新增/编辑表单行为不变。
- 新增组件测试、筛选集成测试、typecheck、lint 和 `verify:web` 均通过。
- 中英文资源完整，代码中不出现面向用户的硬编码中文。

## 文档更新

- 本设计记录于 `docs/specs/2026-07-13/packaging-type-select-design.md`。
- 设计确认后在 `docs/plans/2026-07-13/packaging-type-select-implementation-plan.md` 编写正式实施计划。
- 本次不改变长期架构决策，无需修改 ADR、`AGENTS.md` 或通用 runbook。
