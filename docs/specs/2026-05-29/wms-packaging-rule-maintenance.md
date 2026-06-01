# WMS 包装规则维护功能 Spec

日期：2026-05-29

## 背景

包装规则维护属于 WMS 基础数据中心，用于维护产品包装过程中的规则主数据。规则主表记录规则编码、规则名称、默认标识、启停状态和备注；包装关系明细定义包装层级、包装规格、标准数量、最大数量和包装方式；规则配置定义混箱、标签打印、封箱触发和异常处理策略。

现有输入材料包括：

- `docs/business/mes/packaging/packaging-rule/api.md`
- `docs/business/mes/packaging/packaging-rule/ui-prototype.md`
- `docs/business/mes/packaging/packaging-rule/assets/01-主界面.png`
- `docs/business/mes/packaging/packaging-rule/assets/02-新增弹窗.png`
- `docs/business/mes/packaging/packaging-rule/assets/03-添加包装明细.png`
- `docs/business/mes/packaging/packaging-rule/assets/04-配置规则弹窗.png`

当前应用已交付包装类型维护与包装层级维护页面，并形成了 `contract -> service -> queries -> page/component -> route` 的功能组织方式。包装规则维护应复用这条路径，作为包装管理下的独立功能页面接入路由、导航、接口封装、mock store 和测试闭环。

## 目标

- 在 `apps/web` 中交付包装规则维护页面，覆盖列表查询、新增、编辑、单条删除、批量删除。
- 支持按规则编码、规则名称、默认标识、启停状态查询包装规则。
- 支持维护规则主信息和包装关系明细。
- 支持按规则编码读取并保存规则配置，覆盖混箱、标签打印、封箱触发和异常处理四类配置。
- 使用 WMS API client、React Query、i18n、Testing Library、MSW 和现有后台壳约定。
- 页面视觉与交互靠近输入截图，同时与包装类型、包装层级维护的代码结构保持一致。

## 非目标

- 不实现导入、导出、列设置、全屏等原型中的扩展按钮能力。
- 不实现后端未明确提供的排序能力；列表仅按接口返回顺序展示。
- 不新增权限模型、鉴权增强或操作显隐规则。
- 不维护包装层级和包装规格本身，只消费其编码、名称和展示字段。
- 不新增标签模板维护页面；默认标签模板首版用文本输入或已有候选能力可用时替换为选择器。
- 不迁移组件到 `packages/ui`。
- 不实现规则默认唯一性的前端强校验；如后端限制只能有一个默认规则，首版透传后端业务错误。

## 受影响边界

### 页面与路由

- 新增路由路径 `/packaging/packaging-rule`。
- route 文件仅导出 feature page，不承载请求逻辑。
- 页面继续运行在 `AdminLayout` 内。
- `AppSidebar` 在包装管理分组下新增“包装规则维护”入口。
- `AdminLayout` 增加页面标题与描述映射。

### 功能目录

功能目录定为 `apps/web/src/features/mes/packaging/packaging-rule/`，首版包含：

- `packaging-rule-contract.ts`：API DTO、前端消费模型、筛选模型、表单模型、配置模型、候选模型、常量与映射函数。
- `packaging-rule-service.ts`：WMS 接口调用、字段映射、请求构造、删除 payload 清理、包装层级候选查询、包装规格候选查询。
- `packaging-rule-queries.ts`：React Query 查询与 mutation 封装。
- `packaging-rule-page.tsx`：页面装配、筛选状态、分页状态、选中状态、弹窗状态和业务事件协调。
- `packaging-rule-filter-form.tsx`：筛选区。
- `packaging-rule-table.tsx`：列表表格、选择交互和单行操作。
- `packaging-rule-form-dialog.tsx`：新增/编辑规则弹窗，包含规则主信息和包装关系明细。
- `packaging-rule-config-dialog.tsx`：规则配置弹窗，包含四类配置页签或分段面板。
- 对应测试文件：service、page。

### 基础 UI

新增/编辑和配置规则均使用当前项目已有 `apps/web/src/components/ui/dialog.tsx`。项目当前没有通用 `Tabs` 组件，配置弹窗首版可在 `packaging-rule-config-dialog.tsx` 内实现局部 `role="tablist"` 分段按钮，不新增共享 tabs 组件。

明细表和配置表单字段较多，弹窗主体必须限制最大高度并允许滚动，避免小屏下底部按钮不可见。

## API 契约整理

### 查询接口

- URL：`POST /PackagingRuleApi/GetPackagingRuleAutoQueryDatas`
- 入参：`PackagingRuleQueryDto`
- 前端筛选字段：
  - `RuleCode?: string`
  - `RuleName?: string`
  - `IsDefault?: boolean`
  - `IsEnabled?: boolean`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`

查询返回的 `Details` 用于编辑回填和列表明细摘要。首版列表主列只展示规则主信息，明细数量可作为辅助列；完整明细在编辑弹窗中查看和维护。

### 包装层级候选查询

新增/编辑规则明细需要选择包装层级：

- URL：`POST /PackagingLevelApi/GetPackagingLevelAutoQueryDatas`
- 入参固定包含 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- 前端消费字段：
  - `LevelCode`
  - `LevelName`
  - `LevelSequence`

选择层级编码后，表单自动展示层级名称和层级序号。

### 包装规格候选查询

新增/编辑规则明细需要选择包装规格：

- URL：`POST /PackagingSpecApi/GetPackagingSpecAutoQueryDatas`
- 入参固定包含 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- 前端消费字段：
  - `SpecCode`
  - `SpecName`
  - `Unit`
  - `PackagingTypeName`

选择规格编码后，表单自动展示规格名称、单位和包装类型名称。后端仍会根据编码重新校验并自动填充名称类字段。

### 新增接口

- URL：`POST /PackagingRuleApi/StorePackagingRuleData`
- 入参：`PackagingRuleDto`
- 首版提交字段：
  - `RuleCode`
  - `RuleName`
  - `IsEnabled`
  - `IsDefault`
  - `Details`
  - `Remark`

`Details` 中提交 `PackagingLevelCode`、`SpecCode`、`StandardQuantity`、`MaxQuantity`、`PackagingMethod`。名称类字段可不提交或提交当前候选带出的展示值，后端以编码校验结果为准。

### 编辑接口

- URL：`POST /PackagingRuleApi/UpdatePackagingRuleData`
- 入参：`PackagingRuleDto`
- 首版直接提交完整规则对象，包含 `Id`、主信息和当前明细数组。
- `RuleCode` 在编辑态展示为只读，不允许修改。原因是接口文档未明确唯一编码改写和下游引用迁移规则，首版收敛风险。

接口文档说明：编辑时若 `Details` 不传或传空数组，则仅更新规则主表字段。为了让用户能够明确清空包装关系明细，首版编辑提交始终传当前表单中的 `Details` 数组；当用户删除全部明细时提交空数组。

### 删除接口

- 单删 URL：`POST /PackagingRuleApi/RemovePackagingRuleData`
- 批删 URL：`POST /PackagingRuleApi/RemoveBatchPackagingRuleDatas`
- 删除请求至少包含 `Id` 和 `RuleCode`，可直接传查询结果中的业务 DTO。
- 如果 DTO 中存在 `CompanyCode` 或 `FactoryCode`，提交前移除，由后端根据 token 上下文解析。
- 删除规则主表时，关联包装关系明细由后端一并删除。

### 配置查询接口

- URL：`POST /PackagingRuleApi/GetPackagingRuleConfigByRuleCode`
- 入参：
  - `RuleCode: string`
  - `IsPaged: false`
  - `PageIndex: 1`
  - `PageSize: 10`

接口返回 `DataResult<List<PackagingRuleConfigDto>>`。首版取 `Attach[0]` 作为当前规则配置；当返回空数组时，前端使用默认空配置初始化弹窗。

### 配置保存接口

- URL：`POST /PackagingRuleApi/StorePackagingRuleConfig`
- 入参：`PackagingRuleConfigDto`
- 保存行为：按 `RuleCode` 全量覆盖配置。
- 首版保存时始终提交四个规则子对象：
  - `MixingRule`
  - `LabelPrintRule`
  - `SealingRule`
  - `ExceptionRule`

这样可以避免用户在 UI 中看见的默认值与后端保存值不一致。若未来需要支持某类配置显式为空，再单独增加“启用该配置”开关。

## 前端消费模型

### 列表模型

前端统一消费 `PackagingRuleRecord`：

- `id: number`
- `ruleCode: string`
- `ruleName: string`
- `isEnabled: boolean`
- `isDefault: boolean`
- `details: PackagingRuleDetailRecord[]`
- `remark: string`
- `creatorUserName?: string | null`
- `creationTime?: string | null`
- `lastModificationTime?: string | null`

### 明细模型

前端统一消费 `PackagingRuleDetailRecord`：

- `id?: number`
- `packagingLevelCode: string`
- `packagingLevelName: string`
- `levelSequence: number | null`
- `specCode: string`
- `specName: string`
- `standardQuantity: number`
- `maxQuantity: number`
- `packagingMethod: "auto" | "manual"`
- `unit: string`
- `packagingTypeName: string`

映射函数需保证 `Details` 缺失时按空数组处理，并将接口返回的包装方式协议值归一为前端稳定枚举。

### 查询模型

前端筛选使用 `PackagingRuleFilters`：

- `ruleCode: string`
- `ruleName: string`
- `isDefault: "all" | "true" | "false"`
- `isEnabled: "all" | "true" | "false"`

提交查询时，空字符串映射为 `undefined`，默认和启用状态映射为 `undefined | true | false`。

### 表单模型

表单使用 `PackagingRuleFormValues`：

- `ruleCode: string`
- `ruleName: string`
- `isDefault: boolean`
- `isEnabled: boolean`
- `remark: string`
- `details: PackagingRuleDetailFormValues[]`

明细表单模型使用字符串承载数量输入：

- `id?: number`
- `packagingLevelCode: string`
- `specCode: string`
- `standardQuantity: string`
- `maxQuantity: string`
- `packagingMethod: "auto" | "manual"`

提交前统一将 `standardQuantity` 和 `maxQuantity` 转换为正整数。

### 配置模型

前端统一消费 `PackagingRuleConfigFormValues`：

- `ruleCode: string`
- `mixingRule.forbidDifferentProduct: boolean`
- `mixingRule.forbidDifferentBatch: boolean`
- `mixingRule.forbidDifferentWorkOrder: boolean`
- `mixingRule.forbidDifferentProductionTask: boolean`
- `mixingRule.forbidCrossQualityStatus: boolean`
- `labelPrintRule.reprintLimit: string`
- `labelPrintRule.defaultTemplate: string`
- `sealingRule.timeoutAlert: string`
- `sealingRule.autoSealOnWorkOrderComplete: boolean`
- `sealingRule.autoSealOnTaskComplete: boolean`
- `sealingRule.autoSealOnFullBox: boolean`
- `exceptionRule.forceClearOnCycleTool: boolean`

查询不到配置时使用默认值：

- 混箱规则全部为 `false`。
- 重复打印次数上限为 `0`。
- 默认标签模板名称为空字符串。
- 超时未封箱预警为 `0`。
- 封箱触发开关全部为 `false`。
- 周转工具强制清空为 `false`。

## 字段规则与假设

API 文档未提供长度、枚举、数量上限和唯一性规则。首版采用以下保守前端约束，并保留后端业务错误兜底：

- `RuleCode`：必填，去首尾空格，长度 `1-32`。
- `RuleName`：必填，去首尾空格，长度 `1-64`。
- `IsDefault`：必填布尔值，默认 `false`。
- `IsEnabled`：必填布尔值，默认 `true`。
- `Remark`：可选，长度 `0-200`。
- `Details`：允许为空；为空时在提交前给出弱提示，但不阻止保存。
- `Details[].PackagingLevelCode`：必填，必须来自包装层级候选项。
- `Details[].SpecCode`：必填，必须来自包装规格候选项。
- `Details[].StandardQuantity`：必填，必须是大于等于 `1` 的整数。
- `Details[].MaxQuantity`：必填，必须是大于等于 `StandardQuantity` 的整数。
- `Details[].PackagingMethod`：必填，前端表单值使用稳定英文枚举 `auto` 和 `manual`，用户可见标签走 i18n。
- API 文档示例中的包装方式值为中文展示值。首版不在业务代码中散落中文字符串；如果后端确认请求必须使用中文枚举，只允许在 service 请求边界集中映射，并用测试固定该协议适配。
- `LabelPrintRule.ReprintLimit`：必填，必须是大于等于 `0` 的整数。
- `LabelPrintRule.DefaultTemplate`：可为空，长度 `0-64`。
- `SealingRule.TimeoutAlert`：必填，必须是大于等于 `0` 的整数，单位为分钟。

若后端返回 `Success: false`，页面展示 `DataResult.Message` 或 `OpResult.Message`，并保留用户当前输入。

## 页面结构

### 顶部筛选区

- 规则编码输入框。
- 规则名称输入框。
- 默认三态下拉：全部、是、否。
- 状态三态下拉：全部、启用、禁用。
- 查询按钮。
- 重置按钮。

查询行为：

- 点击“查询”后以当前筛选条件重新拉取第一页。
- 点击“重置”后恢复默认筛选并拉取第一页。

### 操作区

- “新增规则”主按钮。
- “批量删除”危险按钮，未选中行时禁用。
- “刷新”图标按钮，保留当前筛选条件和页码重新拉取列表。

首版不展示导入、导出和列设置按钮，避免提供不可用入口。

### 列表区

列表列：

- 勾选列。
- 序号。
- 规则编码。
- 规则名称。
- 默认。
- 状态。
- 明细数量。
- 操作。

操作列包括：

- 配置规则。
- 编辑。
- 删除。

分页沿用包装层级维护的简单上一页/下一页模式；如后续统一分页组件，再单独收敛。

## 表单交互

### 新增规则

- 点击“新增规则”打开 `Dialog` 表单。
- 默认 `IsDefault` 为 `false`。
- 默认 `IsEnabled` 为 `true`。
- 点击“添加包装”在明细表末尾追加一行。
- 选择层级编码后自动展示层级名称和层级序号。
- 选择规格编码后自动展示规格名称、单位和包装类型名称。
- 提交成功后关闭弹窗，刷新当前列表。

### 编辑规则

- 点击“编辑”打开同一套表单组件。
- 编辑态回填当前行数据和明细列表。
- `RuleCode` 只读展示。
- 用户可修改规则名称、默认标识、启停状态、备注和包装关系明细。
- 提交成功后关闭弹窗，清理编辑记录并刷新当前列表。

### 删除规则

- 单删和批删统一使用浏览器确认流程作为首版确认交互。
- 删除确认文案提示会一并删除关联包装明细。
- 删除成功后提示 toast，并刷新列表。
- 当删除导致当前页无数据且页码大于 `1` 时，回退到上一页重新拉取。

### 配置规则

- 点击“配置规则”打开 `PackagingRuleConfigDialog`。
- 弹窗顶部展示当前规则编码和规则名称，只读。
- 打开弹窗后按 `RuleCode` 查询配置；查询成功后回填表单。
- 混箱规则提供五个开关，并提供“一键全选”和“一键清空”。
- 标签打印规则维护重复打印次数上限和默认标签模板名称。
- 封箱触发规则维护超时未封箱预警和三个自动封箱开关。
- 异常处理规则维护周转工具强制清空开关。
- 点击“重置”恢复为本次打开弹窗时从后端读到的配置或默认空配置。
- 点击“确认”调用保存配置接口；保存成功后关闭配置弹窗，不强制刷新列表。

## 页面状态

页面必须覆盖以下用户可见状态：

- 初始加载：表格 loading 文案。
- 查询成功且有数据：正常列表。
- 查询成功但无数据：空态文案。
- 查询失败：错误提示区 + 重试按钮。
- 候选项加载失败：表单内提示并禁用提交。
- 明细为空：提交前展示弱提示，用户确认后可继续保存。
- 配置查询中：配置弹窗显示 loading 文案。
- 配置查询失败：配置弹窗显示错误提示和重试按钮。
- 提交中：提交按钮禁用并显示处理中状态。
- 提交成功：toast 成功提示。
- 提交失败：表单内或全局 toast 展示错误。

## 数据访问与缓存策略

- 使用 `getWmsClient()` 作为唯一接口入口。
- 查询与 mutation 全部封装到 `packaging-rule-queries.ts`。
- 列表 query key 由筛选、页码和刷新版本组成。
- 包装层级候选、包装规格候选分别使用独立 query key。
- 配置 query key 由 `RuleCode` 组成，仅在配置弹窗打开且存在规则编码时启用。
- 新增、编辑、删除、批量删除成功后，统一失效包装规则列表 query。
- 配置保存成功后，失效对应规则配置 query，不刷新列表。
- 页面局部 UI 状态包括：筛选表单值、当前页码、选中行、规则弹窗开关、配置弹窗开关、当前编辑记录、当前配置记录、刷新版本。

## i18n 要求

- 用户可见文案补充到 `common` 资源中。
- 至少补齐 `zh-CN` 与 `en-US`：导航、页面标题、页面描述、筛选项、列标题、按钮、状态文案、规则表单、明细表、配置弹窗、反馈和校验。
- 不在 route、service 或 contract 中硬编码用户可见文案。

## 测试与验证计划

最小验证覆盖：

- service 测试：验证查询、包装层级候选、包装规格候选、新增、编辑、删除、批删、配置查询、配置保存请求路径和 payload。
- mock store 测试：验证筛选、分页、CRUD、批删、明细维护、配置读取和配置全量覆盖。
- page 测试：验证 loading、empty、error、列表渲染、筛选提交、新增、编辑、明细添加删除、删除、批删、配置查询和配置保存。
- 路由壳层回归：验证侧边栏入口、受保护路由和页面标题。

建议执行命令：

- `pnpm --filter @repo/web test -- packaging-rule-service.test.ts packaging-rule-store.test.ts packaging-rule-page.test.tsx app.test.tsx`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 风险与未决问题

- API 文档未提供标签模板候选接口，首版只能通过文本字段维护默认标签模板名称；如果必须从模板库选择，需要先补充接口资料。
- API 文档未明确默认规则是否全局唯一，首版不做前端互斥处理，后端仍是最终业务校验来源。
- API 文档未明确包装方式枚举，且示例值是中文展示值。首版前端使用 `auto`、`manual` 作为内部稳定值，后端协议值如需中文枚举需在 service 边界集中适配。
- API 文档未明确清空明细时编辑接口的后端语义，首版提交当前表单中的完整 `Details` 数组，并在测试中固定该 payload。
- 原型包含列设置等入口，但接口文档未提供配套能力，首版不实现。
