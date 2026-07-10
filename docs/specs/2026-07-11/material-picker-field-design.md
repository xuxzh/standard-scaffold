# 可复用物料选择字段设计

日期：2026-07-11

## 背景

套包新增/编辑表单当前在“主件物料编码”字段旁提供“选择主件”文字按钮。表单直接控制 `PackagingKitMaterialDialog` 的打开状态，并在确认后分别回填物料编码、名称和单位。这种实现包含了可复用的“只读物料编码 + 查询入口 + 单选弹窗”交互，但组件和状态仍绑定在套包功能内部。

仓库已经存在通用 `MaterialPickerDialog`，负责物料筛选、分页、异常状态和单行选择；套包功能另有 `PackagingKitMaterialDialog`，同时承载主件单选和子件跨页多选。本次需要复用已有通用能力，抽离一个完整的单选物料字段，供其他表单通过受控接口接入。

需要特别保留的现状是：通用物料选择器与套包物料查询虽然调用同一后端路径，但当前请求载荷不完全相同。UI 抽离不得隐式改变套包页的候选物料范围。

## 目标

- 新增表单无关的 `MaterialPickerField`，组合只读物料编码输入框、右侧 Search 图标按钮和物料单选弹窗。
- 点击 Search 图标后打开物料选择弹窗；选择物料后通过 `onChange` 返回完整 `MaterialPickerRecord`。
- 在套包表单中使用该组件替换现有主件选择入口，并回填 `mainMaterialCode`、`mainMaterialName` 和非空 `unit`。
- 保留套包页当前物料查询请求语义、字段校验、重置行为和提交 payload。
- 保持中英文、键盘操作、无障碍名称和现有测试定位能力。

## 非目标

- 本次不改造子件物料多选；子件继续使用 `PackagingKitMaterialDialog`。
- 本次不将 `DataPickerDialog` 扩展为通用多选框架。
- 本次不抽象 `EntityPickerField<T>` 等跨实体泛型组件。
- 本次不改变物料主数据接口、公司/工厂上下文规则或后端筛选条件。
- 本次不改变套包表单 schema、单位选择规则、子件去重规则和主子件互斥校验。
- 本次不迁移组件到 `packages/ui`。

## 范围级别

建议任务级别：`L2`。

本次涉及共享组件接口、套包表单数据流、查询适配以及用户可见交互变化，属于跨目录、跨文件的公共组件行为调整。实施前必须有正式 spec 和 plan，并在 `.worktrees/` 中执行。

## 设计选择

### 采用方案：物料领域内的受控组合字段

在 `apps/web/src/features/mes/material/` 下新增 `MaterialPickerField`。组件属于应用内物料领域能力，不放入无业务语义的 `components/ui`，也不提升到 `packages/ui`。

组件负责：

- 展示当前物料编码。
- 管理自身物料弹窗开关。
- 将查询适配器传给 `MaterialPickerDialog`。
- 在用户选中记录后原样调用 `onChange(record)`。
- 处理禁用态、输入错误态、国际化无障碍名称和图标 tooltip。

组件不负责：

- 感知 React Hook Form。
- 知道“主件”“子件”等套包业务语义。
- 修改物料名称、单位或其他外部表单字段。
- 持有独立的已选物料副本。

### 未采用方案

#### 仅复用弹窗

只增强 `MaterialPickerDialog`、继续由每个页面组合输入框和按钮，改动更少，但会重复弹窗开关、Search 入口、禁用态和无障碍属性，不能完整解决字段复用问题。

#### 通用实体选择字段

将能力抽象为 `EntityPickerField<T>` 可以覆盖包装规则、标签规则等其他实体，但当前没有统一的展示、查询和回填契约。此时引入泛型配置会扩大共享接口和测试面，超出本次需求。

## 组件契约

`MaterialPickerField` 使用受控值和选择回调：

```ts
type MaterialPickerSearch = (
  params: DataPickerSearchParams<MaterialPickerFilters>,
) => Promise<DataPickerSearchResult<MaterialPickerRecord>>;

type MaterialPickerDataSource = {
  queryKey: readonly unknown[];
  search: MaterialPickerSearch;
};

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

契约约束：

- `value` 是唯一展示来源；组件仅读取 `value.materialCode`。
- `onChange` 只在用户明确选择物料时触发，关闭、返回或查询失败均不触发。
- `dataSource` 未提供时使用通用物料查询；业务页面可以注入查询函数与专属 query key 以保留自己的请求语义。
- `dataSource` 将 `search` 和 `queryKey` 绑定为一个必需同时提供的对象，避免不同候选范围误用同一 React Query 缓存。
- `invalid` 映射为输入框的 `aria-invalid`；错误文案继续由父表单的 `FieldError` 渲染。
- `disabled` 同时禁用输入框和 Search 图标按钮。

`MaterialPickerDialog` 增加同类型的可选 `dataSource` 属性。默认值保持当前通用物料查询，因此现有使用方不需要修改。

## 交互设计

- 字段主体使用只读 `Input` 展示物料编码，用户不能手工编辑。
- 输入框右侧使用 `Button` 的图标尺寸展示 `SearchIcon`，不再显示“选择主件”业务文字。
- 图标按钮提供国际化 `aria-label`、视觉隐藏文本和 tooltip；可见提示语义为“选择物料”。
- 点击按钮打开 `MaterialPickerDialog`。
- 在弹窗中选择一行后立即返回记录并关闭物料弹窗，沿用通用单选弹窗行为。
- 用户关闭或返回弹窗时保留原值。
- 本组件不提供单独清除按钮，避免编码、名称和单位被部分清除；清空由父表单重置流程统一完成。

## 数据流

### 默认通用流程

```text
MaterialPickerField
  -> MaterialPickerDialog
  -> default search/getMaterialPickerRecords
  -> MaterialPickerRecord
  -> onChange(record)
  -> consumer-owned state or form
```

### 套包主件流程

```text
Search 图标
  -> MaterialPickerField 打开弹窗
  -> 套包 search 适配器调用 getPackagingKitMaterialOptions
  -> PackagingKitMaterialOption 映射为 MaterialPickerRecord
  -> MaterialPickerField.onChange(record)
  -> PackagingKitFormDialog:
       mainMaterialCode = record.materialCode
       mainMaterialName = record.materialName
       unit = record.unit || currentUnit
  -> shouldDirty + shouldValidate
  -> 关闭物料弹窗
```

套包编辑态根据表单已有的编码、名称和单位构造当前 `MaterialPickerRecord`。其中 `id` 使用物料编码，当前表单没有持久化的规格和类型字段时填空字符串。该对象仅用于受控展示，不作为提交 DTO。

## 查询兼容设计

套包主件必须继续通过 `getPackagingKitMaterialOptions` 产生候选数据，不直接切换到 `getMaterialPickerRecords`。实施时新增一个无 Hook 的查询适配函数，接收 `DataPickerSearchParams<MaterialPickerFilters>`，完成以下工作：

1. 将页面筛选和分页参数映射为现有 `PackagingKitMaterialQueryDto`。
2. 调用 `getPackagingKitMaterialOptions`，不增加或删除当前请求字段。
3. 将 `PackagingKitMaterialOption` 映射为 `MaterialPickerRecord`。
4. 返回 `{ items, totalCount }` 给 `DataPickerDialog`。

套包子件继续使用 `usePackagingKitMaterialOptionsQuery` 和原有查询 key。主件新适配器使用独立 key `['mes', 'packaging-kit', 'material-options', 'main-picker']`，避免与通用物料选择器或子件多选缓存混用。

## 套包表单接入

`PackagingKitFormDialog` 的主件字段继续由 `Controller name="mainMaterialCode"` 包裹，以保留字段错误边界。内部将现有只读输入框和“选择主件”按钮替换为 `MaterialPickerField`。

组件回调按现有规则执行三次 `form.setValue`：

- `mainMaterialCode`：总是使用所选物料编码。
- `mainMaterialName`：总是使用所选物料名称。
- `unit`：仅当所选物料单位非空时覆盖；为空时保留当前值。

三个字段均保持 `shouldDirty: true` 和 `shouldValidate: true`。表单重置仍由现有 `form.reset` 完成，组件因 `value` 变化自动恢复，不新增同步 effect 或冗余 state。

主件选择不再打开 `PackagingKitMaterialDialog`。`materialMode` 状态替换为语义明确的 `childrenMaterialDialogOpen` 布尔状态，只控制子件弹窗。删除表单中只为主件模式服务的分支，但不改动子件选择逻辑。

## 异常与边界行为

- 查询加载时沿用 `DataPickerDialog` loading 状态并禁用筛选提交。
- 查询失败时在物料弹窗内展示错误说明和重试按钮，父表单值保持不变。
- 用户关闭弹窗、点击返回或按 Escape 时不调用 `onChange`。
- 没有明确选择记录时不得产生空回填。
- `disabled` 状态下不能打开弹窗。
- 物料编码为空时展示国际化 placeholder。
- 物料单位为空时保留套包当前单位。
- 父级套包表单弹窗与子级物料弹窗的打开/关闭关系沿用当前嵌套 Dialog 行为；选择后只关闭物料弹窗。
- 组件不吞掉业务查询异常，也不在字段层展示 toast；错误展示由物料弹窗负责。

## 多语言与可访问性

在 `zh-CN/common.ts` 与 `en-US/common.ts` 的 `pages.materialPicker` 下补充字段级文案：

- 打开物料选择器的按钮名称。
- 空值 placeholder。
- Search 图标 tooltip。

按钮的 `aria-label` 与 tooltip 保持同义。只读输入框保留父级 `FieldLabel` 通过 `inputId` 建立的关联；错误态使用 `aria-invalid`。测试优先通过 `getByRole('button', { name })` 和字段 label 定位，不新增依赖 Tailwind 类名的断言。

## 文件影响

### 新增

- `apps/web/src/features/mes/material/material-picker-field.tsx`：受控组合字段、弹窗开关和默认/注入查询装配。
- `apps/web/src/features/mes/material/material-picker-field.test.tsx`：字段交互、回调、禁用态、关闭与错误重试测试。

### 修改

- `apps/web/src/features/mes/material/material-picker-dialog.tsx`：暴露可选 `search` 和 `queryKey`，默认行为不变。
- `apps/web/src/features/mes/material/index.ts`：导出字段组件、记录与查询类型。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-queries.ts`：增加主件单选查询适配器；子件 Hook 保持不变。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-form-dialog.tsx`：接入字段、回填表单并收敛主件专用弹窗状态。
- `apps/web/src/features/mes/packaging/packaging-kit/packaging-kit-page.test.tsx`：更新主件选择定位并验证回填和请求不变量。
- `apps/web/src/i18n/resources/zh-CN/common.ts`：补充中文物料字段文案。
- `apps/web/src/i18n/resources/en-US/common.ts`：补充英文物料字段文案。

`packaging-kit-material-dialog.tsx` 本轮不修改其多选行为；只有在移除已无使用的主件模式能做到不影响子件代码时，才允许删除主件分支。实施计划默认不做该清理，避免扩大范围。

## 测试设计

### `MaterialPickerField` 组件测试

- 传入物料后显示 `materialCode`。
- 点击可访问名称为“选择物料”的 Search 图标按钮后打开弹窗。
- 选择记录后只调用一次 `onChange`，参数为完整 `MaterialPickerRecord`。
- 关闭、返回或按 Escape 不调用 `onChange`，原值保持显示。
- `disabled` 时按钮和输入框均禁用且不能打开弹窗。
- `invalid` 时输入框具有 `aria-invalid="true"`。
- 查询失败后展示错误状态，点击重试会重新查询。
- 自定义 `dataSource.search` 收到筛选条件、页码、页大小和 AbortSignal，并使用自定义 query key。

### 套包集成测试

- 点击主件字段的 Search 图标后展示物料弹窗。
- 选择主件后同时显示/回填物料编码、名称和单位。
- 选择无单位物料时不覆盖表单当前单位。
- 主件必填错误在选择后消失。
- 重置表单后主件字段恢复初始值。
- 新增与编辑提交 payload 中的 `MainMaterialCode`、`MainMaterialName` 和 `Unit` 保持正确。
- 物料查询请求的路径和载荷保持当前套包行为。

### 回归测试

- 子件多选、跨页保留、重复过滤和主子件互斥规则保持通过。
- `MaterialPickerDialog` 默认查询行为及既有使用方保持通过。
- 中英文切换后按钮仍有正确可访问名称。

## 验证计划

实施阶段按由窄到宽的顺序执行：

```bash
pnpm --filter @repo/web test -- material-picker-field
pnpm --filter @repo/web test -- packaging-kit-page
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm verify:web
```

当前仓库没有覆盖 `/packaging/packaging-kit` 新增/编辑流程的 Playwright 用例。本次不新建整页 E2E，以 Testing Library 集成测试和浏览器人工检查覆盖主流程。

浏览器人工检查至少覆盖：新增表单、编辑表单、中英文、查询失败重试、选择后回填、返回不变更、表单重置和子件多选回归。

## 风险与缓解

### 查询语义漂移

风险：直接改用通用物料 service 会引入额外公司/工厂或空筛选字段，改变候选范围。

缓解：套包主件注入现有 service 的查询适配器，并用请求断言锁定路径与载荷。

### 表单字段不同步

风险：只更新编码而遗漏名称或单位，会产生展示与提交不一致。

缓解：回填仍集中在套包表单的单一 handler 中，并由集成测试同时断言三个字段与最终 payload。

### Dialog 状态互相影响

风险：关闭物料弹窗时误关闭父表单弹窗。

缓解：`MaterialPickerField` 只管理自己的 open state，测试确认选中、返回和 Escape 后父表单仍存在。

### 过早扩展多选

风险：为子件跨页选择扩展共享选择器会显著增加公共状态模型和回归范围。

缓解：本次明确保持子件多选实现不变，后续以独立 spec 评估多选抽象。

## 完成标准

- 套包主件字段显示只读编码和右侧 Search 图标按钮。
- 点击按钮可查询并选择物料，选中后正确回填编码、名称和单位。
- 组件通过表单无关的受控接口可在其他页面复用。
- 套包当前物料查询语义和子件多选行为没有变化。
- 新增组件测试、套包集成测试、typecheck、lint 和 `verify:web` 均通过。
- 实际验证命令、通过结果和未执行项在交付说明中完整记录。

## 文档更新

- 本设计记录于 `docs/specs/2026-07-11/material-picker-field-design.md`。
- 实施前在 `docs/plans/2026-07-11/material-picker-field-implementation-plan.md` 编写正式计划。
- 本次不改变长期仓库规范，无需修改 `AGENTS.md`、ADR 或通用 runbook。
