# WMS 物料包装关系维护功能 Spec

日期：2026-05-29

## 背景

物料包装关系维护属于 WMS 基础数据中心，用于维护物料与包装规则之间的关联关系。每条关系以物料编码和包装规则编码作为唯一业务标识，并携带包装关系明细。明细包含包装层级、包装规格、包装数量、单位、包装类型和标签打印模板等字段，后端不对明细编码和名称做自动填充，前端必须在提交前保证字段准确。

现有输入材料包括：

- `docs/business/wms/packaging/material-packaging-relation/api.md`
- `docs/business/wms/packaging/material-packaging-relation/ui-prototype.md`
- `docs/business/wms/packaging/material-packaging-relation/assets/01-主界面.png`
- `docs/business/wms/packaging/material-packaging-relation/assets/02-新增弹窗.png`

当前应用已交付包装类型维护与包装层级维护页面，并已有包装规格、包装规则、套包信息的 spec 和 plan。物料包装关系维护应复用包装域既有 `contract -> service -> queries -> page/component -> route` 组织方式，作为包装管理下的独立页面接入路由、导航、接口封装、mock store 和测试闭环。

## 目标

- 在 `apps/web` 中交付物料包装关系维护页面，覆盖列表查询、新增、编辑、单条删除、批量删除。
- 支持左侧物料快速筛选，点击物料后按物料编码查询右侧关系列表。
- 支持按物料编码、物料名称、包装规则编码、包装规则名称查询关系列表。
- 支持在新增/编辑弹窗中选择物料、选择包装规则、回填并维护包装关系明细。
- 支持将接口返回的主表 `Details` 展平为表格行展示，同时编辑和删除仍以关系主表记录为单位。
- 使用 WMS API client、React Query、i18n、Testing Library、MSW 和现有后台壳约定。
- 页面视觉与交互靠近输入截图，同时与包装类型、包装层级维护的代码结构保持一致。

## 非目标

- 不实现导入、导出、列设置、全屏等原型中的扩展按钮能力。
- 不实现后端未明确提供的排序能力；列表仅按接口返回顺序展示。
- 不新增物料主数据维护页面，只消费物料候选数据。
- 不新增包装规则维护能力，只消费包装规则候选和规则明细。
- 不新增标签模板维护页面；箱标签打印模板和装箱单打印模板首版使用文本输入，后续如有模板候选接口再替换为选择器。
- 不实现后端未支持的包装层级、包装规格、包装类型远程筛选。首版不展示这些筛选项，避免在远程分页场景下做误导性的当前页本地过滤。
- 不新增权限模型、鉴权增强或操作显隐规则。
- 不迁移组件到 `packages/ui`。

## 受影响边界

### 页面与路由

- 新增路由路径 `/packaging/material-packaging-relation`。
- route 文件仅导出 feature page，不承载请求逻辑。
- 页面继续运行在 `AdminLayout` 内。
- `AppSidebar` 在包装管理分组下新增“物料包装关系”入口。
- `AdminLayout` 增加页面标题与描述映射。

### 功能目录

功能目录定为 `apps/web/src/features/wms/packaging/material-packaging-relation/`，首版包含：

- `material-packaging-relation-contract.ts`：API DTO、前端消费模型、明细模型、筛选模型、表单模型、物料候选模型、包装规则候选模型、常量与映射函数。
- `material-packaging-relation-service.ts`：WMS 接口调用、字段映射、请求构造、删除 payload 清理、物料候选查询、包装规则候选查询。
- `material-packaging-relation-queries.ts`：React Query 查询与 mutation 封装。
- `material-packaging-relation-page.tsx`：页面装配、物料侧栏状态、筛选状态、分页状态、选中状态、弹窗状态和业务事件协调。
- `material-packaging-relation-material-sidebar.tsx`：左侧物料搜索和选择列表。
- `material-packaging-relation-filter-form.tsx`：右侧筛选区。
- `material-packaging-relation-table.tsx`：明细展平表格、选择交互和单行操作。
- `material-packaging-relation-form-dialog.tsx`：新增/编辑关系弹窗。
- `material-packaging-relation-rule-dialog.tsx`：包装规则选择弹窗。
- `material-packaging-relation-material-dialog.tsx`：表单内物料选择弹窗。
- 对应测试文件：service、page。

### 基础 UI

新增/编辑、物料选择和包装规则选择均使用当前项目已有 `apps/web/src/components/ui/dialog.tsx`。页面主体采用“左侧物料筛选侧栏 + 右侧查询区 + 明细列表”的布局；侧栏在窄屏下可以堆叠到列表上方，不能遮挡表格操作。

明细字段较多，表格和弹窗主体必须允许横向或纵向滚动，避免小屏下按钮或输入控件重叠。

## API 契约整理

### 查询接口

- URL：`POST /MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas`
- 入参：`MaterialPackagingRelationQueryDto`
- 前端筛选字段：
  - `MaterialCode?: string`
  - `MaterialName?: string`
  - `PackagingRuleCode?: string`
  - `PackagingRuleName?: string`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`

查询返回的每条主表记录包含 `Details` 数组。列表展示时将 `Details` 展平为明细行；如果某条关系没有明细，仍展示一条主表行，明细列为空，用户可以编辑或删除该关系。

### 物料候选查询

左侧物料侧栏和表单物料选择都需要物料候选。当前输入材料未提供正式物料主数据接口；仓库已有套包信息 spec 按 `/Material/GetMaterialAutoQueryDatas` 封装物料候选查询。首版沿用同一假设：

- URL：`POST /Material/GetMaterialAutoQueryDatas`
- 入参：
  - `MaterialCode?: string`
  - `MaterialName?: string`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`
- 前端消费字段：
  - `MaterialCode`
  - `MaterialName`
  - `Unit?`
  - `MaterialTypeName?`

若后端确认物料接口路径或字段不同，只替换 service 和 MSW handler，不改变页面消费模型。

### 包装规则候选查询

新增/编辑表单需要选择包装规则并带出规则明细。首版复用包装规则查询接口：

- URL：`POST /PackagingRuleApi/GetPackagingRuleAutoQueryDatas`
- 入参：
  - `RuleCode?: string`
  - `RuleName?: string`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`
- 前端消费字段：
  - `RuleCode`
  - `RuleName`
  - `Details`

选择包装规则后，前端将规则明细转换为物料包装关系明细初始值。转换规则：

- `PackagingLevelCode`、`PackagingLevelName`、`LevelSequence` 直接沿用规则明细。
- `SpecCode`、`SpecName`、`Unit`、`PackagingTypeName` 直接沿用规则明细。
- `Quantity` 优先取规则明细中的 `StandardQuantity`；如果包装规则接口字段不同，则在 service 边界集中适配。
- `BoxLabelPrintTemplate` 和 `PackingListPrintTemplate` 默认为空，允许用户补充或编辑。

### 新增接口

- URL：`POST /MaterialPackagingRelationApi/StoreMaterialPackagingRelationData`
- 入参：`MaterialPackagingRelationDto`
- 首版提交字段：
  - `MaterialCode`
  - `MaterialName`
  - `PackagingRuleCode`
  - `PackagingRuleName`
  - `Details`
  - `Remark`

新增时不传 `CompanyCode` 和 `FactoryCode`，公司与工厂上下文由后端从 token 解析。物料编码 + 包装规则编码组合唯一；重复时透传后端错误消息并保留弹窗输入。

### 编辑接口

- URL：`POST /MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData`
- 入参采用 `NeedUpdateFields` 包装。
- 首版允许编辑字段：
  - `Id`
  - `MaterialName`
  - `PackagingRuleName`
  - `Details`
  - `Remark`

编辑态 `MaterialCode` 和 `PackagingRuleCode` 只读展示，不允许修改。原因是它们共同构成唯一标识，接口文档未明确修改唯一键后的下游引用语义。若用户需要更换物料或包装规则，应删除后重新新增关系。

`Details` 传入时按接口约定全量覆盖明细列表。首版编辑提交始终传当前表单中的完整 `Details` 数组；当用户删除全部明细时提交空数组。

### 删除接口

- 单删 URL：`POST /MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData`
- 批删 URL：`POST /MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas`
- 删除请求必须传查询结果中的业务 DTO 对象，前端不得仅传 `Id`。
- 如果 DTO 中存在 `CompanyCode` 或 `FactoryCode`，提交前移除，由后端根据 token 上下文解析。
- 删除主表数据时，关联的包装关系明细由后端一并删除。

## 前端消费模型

### 关系列表模型

前端统一消费 `MaterialPackagingRelationRecord`：

- `id: number`
- `materialCode: string`
- `materialName: string`
- `packagingRuleCode: string`
- `packagingRuleName: string`
- `details: MaterialPackagingRelationDetail[]`
- `remark: string`
- `creatorUserName?: string | null`
- `creationTime?: string | null`
- `lastModificationTime?: string | null`
- `rawDto: MaterialPackagingRelationApiDto`

`rawDto` 仅用于删除 payload，页面渲染不直接依赖后端原始字段。

### 明细模型

前端统一消费 `MaterialPackagingRelationDetail`：

- `levelSequence: number | null`
- `packagingLevelCode: string`
- `packagingLevelName: string`
- `specCode: string`
- `specName: string`
- `quantity: number`
- `unit: string`
- `packagingTypeName: string`
- `boxLabelPrintTemplate: string`
- `packingListPrintTemplate: string`

映射函数需保证 `Details` 缺失时按空数组处理，避免渲染层额外判断。

### 表格展平行模型

前端表格使用 `MaterialPackagingRelationTableRow`：

- `rowId: string`
- `relationId: number`
- `detailIndex: number | null`
- `record: MaterialPackagingRelationRecord`
- `detail: MaterialPackagingRelationDetail | null`

`rowId` 使用 `${relationId}:${detailIndex ?? "empty"}`。同一关系有多条明细时，表格展示多行；行操作中的编辑、删除始终作用于 `record`。批量选择按 `relationId` 去重，避免同一关系的多条明细被重复删除。

### 查询模型

前端筛选使用 `MaterialPackagingRelationFilters`：

- `materialCode: string`
- `materialName: string`
- `packagingRuleCode: string`
- `packagingRuleName: string`

提交查询时，空字符串映射为 `undefined`。左侧物料选中后写入 `materialCode` 和 `materialName` 并重新拉取第一页；重置时清空筛选并取消物料选中。

### 表单模型

表单使用 `MaterialPackagingRelationFormValues`：

- `materialCode: string`
- `materialName: string`
- `packagingRuleCode: string`
- `packagingRuleName: string`
- `remark: string`
- `details: MaterialPackagingRelationDetailFormValues[]`

明细表单模型使用字符串承载数量输入：

- `levelSequence: string`
- `packagingLevelCode: string`
- `packagingLevelName: string`
- `specCode: string`
- `specName: string`
- `quantity: string`
- `unit: string`
- `packagingTypeName: string`
- `boxLabelPrintTemplate: string`
- `packingListPrintTemplate: string`

提交前统一将 `quantity` 和 `levelSequence` 转换为整数。

## 字段规则与假设

API 文档未提供长度、数量上限和标签模板候选接口。首版采用以下保守前端约束，并保留后端业务错误兜底：

- `MaterialCode`：必填，必须来自物料候选或通过物料选择弹窗回填。
- `MaterialName`：必填，只读展示，由物料选择带出。
- `PackagingRuleCode`：必填，必须来自包装规则候选或通过包装规则选择弹窗回填。
- `PackagingRuleName`：必填，只读展示，由包装规则选择带出。
- `Remark`：可选，长度 `0-200`。
- `Details`：至少 `1` 条。选择包装规则后默认生成明细，用户可以调整数量和模板字段。
- `Details[].LevelSequence`：必填，必须是大于等于 `1` 的整数。
- `Details[].PackagingLevelCode`：必填，只读展示，来自包装规则明细。
- `Details[].PackagingLevelName`：必填，只读展示，来自包装规则明细。
- `Details[].SpecCode`：必填，只读展示，来自包装规则明细。
- `Details[].SpecName`：必填，只读展示，来自包装规则明细。
- `Details[].Quantity`：必填，必须是大于等于 `1` 的整数。
- `Details[].Unit`：必填，去首尾空格，长度 `1-16`。
- `Details[].PackagingTypeName`：必填，只读展示，来自包装规则明细。
- `Details[].BoxLabelPrintTemplate`：可选，长度 `0-64`。
- `Details[].PackingListPrintTemplate`：可选，长度 `0-64`。

若后端返回 `Success: false`，页面展示 `DataResult.Message` 或 `OpResult.Message`，并保留用户当前输入。

## 页面结构

### 左侧物料筛选侧栏

- 顶部提供物料搜索输入框，支持输入物料编码或物料名称。
- 物料列表展示物料编码和物料名称。
- 点击物料后，右侧筛选条件自动带入物料编码和物料名称，并拉取第一页。
- 提供清除选择入口；清除后右侧按当前筛选区条件查询全部关系。
- 物料候选加载中、为空、失败时分别展示对应状态；失败状态提供重试。

### 右侧筛选区

- 物料编码输入框。
- 物料名称输入框。
- 包装规则编码输入框。
- 包装规则名称输入框。
- 查询按钮。
- 重置按钮。

查询行为：

- 点击“查询”后以当前筛选条件重新拉取第一页。
- 点击“重置”后恢复默认筛选、取消左侧物料选中并拉取第一页。
- 首版不展示包装层级、包装规格、包装类型筛选项，因为查询接口不支持这些字段。

### 操作区

- “新增关系”主按钮。
- “批量删除”危险按钮，未选中关系时禁用。
- “刷新”图标按钮，保留当前筛选条件、物料选中状态和页码重新拉取列表。

首版不展示导入、导出和列设置按钮，避免提供不可用入口。

### 列表区

列表列：

- 勾选列。
- 序号。
- 物料编码。
- 物料名称。
- 包装规则编码。
- 包装规则名称。
- 层级序号。
- 包装层级编码。
- 包装层级。
- 包装规格编码。
- 包装规格。
- 包装数量。
- 单位。
- 箱标签打印模板。
- 装箱单打印模板。
- 备注。
- 包装类型。
- 操作。

操作列包括：

- 编辑。
- 删除。

分页沿用包装层级维护的简单上一页/下一页模式；如后续统一分页组件，再单独收敛。

## 表单交互

### 新增关系

- 点击“新增关系”打开 `Dialog` 表单。
- 物料编码使用选择输入，选择后自动回填物料名称。
- 包装规则编码使用选择输入，选择后自动回填包装规则名称和包装关系明细。
- 明细表展示层级、规格、单位、包装类型等只读字段，并允许用户调整包装数量、单位、箱标签打印模板和装箱单打印模板。
- 提交成功后关闭弹窗，刷新当前列表。
- 提交失败时保留输入并展示后端错误消息。

### 编辑关系

- 点击“编辑”打开同一套表单组件。
- 编辑态回填当前行所属主表记录和完整明细列表。
- `MaterialCode` 和 `PackagingRuleCode` 只读展示。
- 用户可修改物料名称、包装规则名称、备注和包装关系明细；首版物料名称和规则名称默认仍由已选编码带出，不提供单独编辑入口，除非后端返回的数据本身存在名称变化。
- 提交成功后关闭弹窗，清理编辑记录并刷新当前列表。
- 提交失败时保留输入并展示后端错误消息。

### 删除关系

- 单删和批删统一使用浏览器确认流程作为首版确认交互。
- 删除确认文案提示会一并删除关联包装关系明细。
- 删除成功后提示 toast，并刷新列表。
- 当删除导致当前页无数据且页码大于 `1` 时，回退到上一页重新拉取。

## 页面状态

页面必须覆盖以下用户可见状态：

- 初始加载：表格 loading 文案。
- 查询成功且有数据：正常列表。
- 查询成功但无数据：空态文案。
- 查询失败：错误提示区 + 重试按钮。
- 物料候选加载中：侧栏或物料选择弹窗显示 loading 文案。
- 物料候选为空：侧栏或物料选择弹窗显示空态文案。
- 物料候选加载失败：侧栏或物料选择弹窗显示错误提示和重试按钮。
- 包装规则候选加载中：规则选择弹窗显示 loading 文案。
- 包装规则候选为空：规则选择弹窗显示空态文案。
- 包装规则候选加载失败：规则选择弹窗显示错误提示和重试按钮。
- 提交中：提交按钮禁用并显示处理中状态。
- 提交成功：toast 成功提示。
- 提交失败：表单内或全局 toast 展示错误。

## 数据访问与缓存策略

- 使用 `getWmsClient()` 作为唯一接口入口。
- 查询与 mutation 全部封装到 `material-packaging-relation-queries.ts`。
- 列表 query key 由筛选、页码、选中物料和刷新版本组成。
- 物料候选 query key 由搜索关键字、页码和使用场景组成；侧栏与表单选择可以复用同一查询 hook。
- 包装规则候选 query key 由搜索条件和页码组成。
- 新增、编辑、删除、批量删除成功后，统一失效物料包装关系列表 query。
- 新增或编辑成功后不强制失效物料候选和包装规则候选，除非后续实现发现候选来源会随关系维护变化。
- 页面局部 UI 状态包括：物料搜索关键字、选中物料、筛选表单值、当前页码、选中关系、关系弹窗开关、物料选择弹窗开关、包装规则选择弹窗开关、当前编辑记录、刷新版本。

## i18n 要求

- 用户可见文案补充到 `common` 资源中。
- 至少补齐 `zh-CN` 与 `en-US`：导航、页面标题、页面描述、物料侧栏、筛选项、列标题、按钮、状态文案、表单、物料选择、包装规则选择、明细表、反馈和校验。
- 不在 route、service 或 contract 中硬编码用户可见文案。

## 测试与验证计划

最小验证覆盖：

- service 测试：验证查询、物料候选查询、包装规则候选查询、新增、编辑、删除、批删请求路径和 payload。
- mock store 测试：验证筛选、分页、CRUD、批删、明细展平、物料候选过滤、包装规则候选过滤和规则明细到关系明细的转换。
- page 测试：验证 loading、empty、error、左侧物料筛选、右侧筛选提交、列表展平渲染、新增、编辑、物料选择、包装规则选择、明细数量校验、删除和批删。
- 路由壳层回归：验证侧边栏入口、受保护路由和页面标题。

建议执行命令：

- `pnpm --filter @repo/web test -- material-packaging-relation-service.test.ts material-packaging-relation-store.test.ts material-packaging-relation-page.test.tsx app.test.tsx`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 风险与未决问题

- 提供资料未包含正式物料主数据查询接口。首版按 `/Material/GetMaterialAutoQueryDatas` 封装候选查询；若后端路径或字段不同，需要在 service 和 mock handler 中替换。
- 提供资料未包含专用包装规则候选接口。首版复用 `/PackagingRuleApi/GetPackagingRuleAutoQueryDatas`；若后端提供轻量候选接口，可只替换 service。
- 包装规则明细字段与物料包装关系明细字段不完全一致，尤其是 `Quantity` 的来源。首版在 service 边界将规则明细数量适配为关系明细数量，并用测试固定。
- API 文档未提供标签模板候选接口，首版使用文本输入维护模板名称。
- API 文档未支持包装层级、包装规格、包装类型远程筛选，首版不展示这些筛选项；如果业务坚持保留原型筛选，需要后端补充查询字段或明确当前页本地筛选的限制。
- 同一关系多条明细在表格中会展开为多行，批量选择必须按关系主表去重，否则可能重复调用删除接口。
