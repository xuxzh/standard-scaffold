# 包装规则明细弹窗表格化 Spec

## 背景

- 当前 [`packaging-rule-form-dialog.tsx`](file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx) 在主弹窗中直接展开 `details` 多行表单，新增一条明细时会立即在主区域插入一整块编辑表单。
- 现有实现虽然可用，但在明细字段较多时会显著拉长主弹窗，用户难以快速浏览已添加明细，也不符合业务原型中“表格汇总 + 子弹窗编辑”的操作习惯。
- 当前需求要求把“包装关系明细”改成点击“添加层级明细”后打开明细编辑弹窗，确认后将结果展示为表格行，并在表格内提供“编辑 / 删除”操作。
- 该变更属于已有包装规则维护功能内的交互重构，不涉及新增后端接口，但会改变主弹窗内部的数据编辑流转，因此需要以正式 spec 约束实现边界。

## 目标

- 将包装规则主弹窗中的“包装关系明细”从“内联多段表单”调整为“子弹窗编辑 + 主区域表格展示”的交互模式，同时保持最终提交 payload 和接口契约不变。

## 非目标

- 不修改包装规则列表页、规则配置弹窗和规则配置接口行为。
- 不调整 `CreatePackagingRuleInput`、`UpdatePackagingRuleInput`、`PackagingRuleDetailInput` 等 contract 结构。
- 不新增单条明细独立保存接口；明细仍作为规则表单的一部分，由主弹窗最终统一提交。
- 不引入新的全局状态管理或跨文件共享 UI 基础组件。
- 不顺带重构包装规则 feature 的 service、queries、mock store 或路由。
- 不实现明细拖拽排序、批量编辑、复制行等扩展交互。

## 范围级别

- 建议任务级别：`L2`
- 适用原因：
  - 变更涉及已有业务表单的交互流程调整；
  - 会修改主弹窗内部状态边界、明细编辑时机和用户可见布局；
  - 会影响新增、编辑、重置、空明细提交等多条用户路径；
  - 虽然接口不变，但属于跨行为层的中等风险改动。

## 受影响边界

### 路由

- 无新增路由。
- 包装规则页面入口、列表页操作入口保持不变。

### 数据流

- 主表单 `details` 继续作为包装规则提交时的唯一正式数据源。
- 新增一份仅用于子弹窗编辑的临时草稿态，用于承载“新增一条明细”或“编辑现有明细”时的未确认输入。
- 子弹窗点击“确认”后，草稿态写回主表单 `details`；点击“取消”则丢弃草稿态。
- 主弹窗点击最终“确认”时，仍直接提交 `form` 当前值，不增加中间转换层。

### 状态边界

- `PackagingRuleFormDialog` 继续持有规则主表单、明细列表、空明细确认等页面级状态。
- 明细子弹窗状态限定在 `PackagingRuleFormDialog` 内部管理，首版不拆到全局 store。
- 需要新增的局部 UI 状态包括：
  - `detailDialogOpen`
  - `detailEditingIndex`
  - `detailDraft`
  - 如采用独立明细表单实例，还包括其校验与 reset 生命周期

### 共享组件

- 继续复用现有 `Dialog`、`Button`、`Input`、`Select`、`Field`、`Textarea` 等 UI 组件。
- 首版不新增共享 `DetailDialog` 组件到 `apps/web/src/components/ui` 或 `packages/ui`。
- 若当前文件复杂度可接受，允许先在 [`packaging-rule-form-dialog.tsx`](file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx) 内局部抽取明细弹窗子组件；若文件负担明显过重，可在同 feature 目录下拆分局部组件文件。

### 工具链或脚本

- 无新增脚本。
- 需要更新与包装规则表单交互相关的测试用例和 i18n 文案资源。

## 建议方案

### 主方案

- 采用“保留现有 `details` 数据结构 + 引入明细子弹窗草稿态 + 主区域改为 table 汇总”的实现路径。

### 方案说明

- 主弹窗中的规则主信息区域保持不变。
- “包装关系明细”区域保留标题、说明文案和“添加层级明细”按钮。
- 点击“添加层级明细”时，不再直接 `append(getEmptyDetail())` 到主表单，而是打开明细子弹窗，并以空草稿初始化。
- 点击表格行内“编辑”时，打开同一个明细子弹窗，并将所选行数据复制到草稿态。
- 子弹窗中的字段继续复用当前明细表单字段：
  - 包装层级编码
  - 包装层级名称（只读）
  - 层级序号（只读）
  - 包装规格编码
  - 包装规格名称（只读）
  - 单位（只读）
  - 标准数量
  - 最大数量
  - 包装方式
  - 包装类型名称（只读）
- 子弹窗点击“确认”时：
  - 先执行明细级校验；
  - 若为新增场景，则向主表单 `details` 追加一条记录；
  - 若为编辑场景，则按 `detailEditingIndex` 覆盖对应记录；
  - 然后关闭子弹窗并清空草稿态。
- 子弹窗点击“取消”时：
  - 直接关闭；
  - 不修改主表单 `details`。
- 主区域改为 table 展示当前 `details`，列包含：
  - 序号
  - 层级序号
  - 包装层级编码
  - 包装层级名称
  - 包装规格编码
  - 包装规格名称
  - 标准数量
  - 最大数量
  - 包装方式
  - 操作
- 表格中的只读展示值继续通过已加载的 `levelOptions`、`specOptions` 或现有明细值进行回显，不改动后端提交字段。
- 表格操作列提供：
  - `编辑`：打开子弹窗并回填该行；
  - `删除`：从主表单 `details` 中移除该行。

### 为什么符合现有模式

- 该方案保留现有表单提交模型和 service payload 映射，避免穿透到 [`packaging-rule-contract.ts`](file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-contract.ts) 与 [`packaging-rule-service.ts`](file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-service.ts)。
- 明细仍由主表单统一提交，符合当前包装规则页面“规则主信息 + 明细列表一次性保存”的数据边界。
- UI 仍基于项目现有 dialog / form / select 组件，不会偏离现有 shadcn 风格与代码组织。
- 主要改动可集中在 [`packaging-rule-form-dialog.tsx`](file:///Users/xuxz/repos/ruihui/standard-scaffold/apps/web/src/features/mes/packaging/packaging-rule/packaging-rule-form-dialog.tsx) 和相关页面测试，范围清晰。

## 备选方案

### 方案 A：继续使用内联表单，仅增加折叠能力

- 做法：保留当前 `details.map(...)` 渲染方式，仅把每条明细包装成可折叠面板。
- 不采用原因：
  - 仍然无法满足“点击按钮弹出当前 form”的明确需求；
  - 主弹窗内容依旧偏长，已添加明细的浏览效率仍低；
  - 操作心智仍然是“在主表单里编辑明细”，不是“表格汇总 + 明细弹窗”。

### 方案 B：子弹窗确认时立即单条调用接口保存

- 做法：新增或编辑一条明细时立即持久化，然后再回写主表单。
- 不采用原因：
  - 当前接口仅支持按规则整体提交 `Details`，没有单条明细保存能力；
  - 会迫使前端在规则未最终确认前引入临时持久化策略，增加脏数据风险；
  - 与现有包装规则主表单的一次性保存模式不一致。

### 方案 C：新增独立 feature 级 `DetailDialog` 组件并同步抽离 hook

- 做法：在本次任务中同时完成交互改造和结构性重构，拆出独立子组件、hook 和表格视图层。
- 不采用原因：
  - 这会扩大任务范围，把一次行为改造升级为中等重构；
  - 当前优先目标是稳定交付交互变化，结构拆分应以复杂度证据驱动，而不是顺手扩大范围。

## 交互与校验细则

### 子弹窗交互

- 明细子弹窗标题根据场景区分为“添加层级明细”或“编辑层级明细”。
- 新增态默认使用 `getEmptyDetail()` 生成草稿。
- 编辑态需要保留原有 `id`，确保最终更新规则时能把后端已有明细标识一并提交。
- 子弹窗关闭时需要清理草稿态与编辑索引，避免下一次打开残留上次输入。

### 明细校验

- 以下字段继续为必填：
  - `packagingLevelCode`
  - `specCode`
  - `standardQuantity`
  - `maxQuantity`
  - `packagingMethod`
- `standardQuantity` 必须为大于等于 `1` 的整数。
- `maxQuantity` 必须为大于等于 `standardQuantity` 的整数。
- 子弹窗校验失败时，不关闭子弹窗，也不写回主表单 `details`。

### 主表单兼容行为

- 主弹窗最终提交前的“空明细弱提示 + 用户确认后继续提交”逻辑保留不变。
- 主弹窗点击“重置”时，`details` 应恢复为 `getDefaultValues(record)` 的结果。
- 若主弹窗重置或关闭时子弹窗仍处于打开状态，子弹窗应同步关闭并清理草稿态，避免展示失效数据。
- 编辑已有包装规则时，后端返回的现有 `details` 应直接展示在 table 中，无需用户重新打开子弹窗才能看见。

## 验证计划

### 最小验证

- 交互测试覆盖以下核心路径：
  - 点击“添加层级明细”后打开子弹窗；
  - 子弹窗填写并确认后，table 新增一行；
  - 点击表格“编辑”后回填当前行，修改确认后表格更新；
  - 点击表格“删除”后对应行消失；
  - 最终点击主弹窗“确认”时，提交 payload 中 `details` 与 table 展示数据一致。

### 建议扩大验证

- 编辑已有规则时，初始明细在 table 正常展示。
- 子弹窗取消后，不污染现有 `details`。
- 明细全部删除时，主弹窗仍按既有逻辑展示空明细确认提示。
- 主弹窗 `重置` 后，table 与明细子弹窗状态同步恢复。

### 建议执行命令

- `pnpm --filter @repo/web test -- packaging-rule-page.test.tsx`
- `pnpm --filter @repo/web typecheck`

### 完成时应展示的验证证据

- 相关测试命令的实际输出结果；
- 最近编辑文件的诊断结果；
- 如未执行更宽验证，应明确说明未执行项及原因。

## 风险

- 行为回归风险：明细从内联表单切换为草稿态后，若索引更新不当，可能导致编辑覆盖错误行或丢失已有 `id`。
- 表单同步风险：主弹窗 `reset`、关闭、切换编辑记录时，若未同步清理子弹窗状态，容易出现脏数据回填。
- 可见性风险：table 仅展示汇总值，若只读回显依赖选项数据而选项加载失败，可能出现名称列为空，需要沿用现有候选加载失败提示。
- 验证风险：若只验证“新增一条明细”，可能遗漏“编辑已有规则”和“删除全部明细后提交”两条回归路径。

## 需要更新的文档

- 新增本文件：`docs/specs/2026-06-02/packaging-rule-detail-dialog-table.md`
- 后续实现前补充对应计划文档：`docs/plans/2026-06-02/packaging-rule-detail-dialog-table.md`
- 当前无需更新 `AGENTS.md`、runbook 或长期规范文档，因为本次仅改变包装规则页面局部交互，不改变仓库级默认做法。
