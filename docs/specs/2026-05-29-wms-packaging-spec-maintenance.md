# WMS 包装规格维护功能 Spec

日期：2026-05-29

## 背景

包装规格维护属于 WMS 基础数据中心，用于维护具体包装规格主数据。包装规格关联包装类型、包装层级和条码规则，并记录尺寸、重量、体积、容量、堆叠上限和启用状态等信息。

现有输入材料包括：

- `docs/business/wms/packaging/packaging-spec/api.md`
- `docs/business/wms/packaging/packaging-spec/ui-prototype.md`
- `docs/business/wms/packaging/packaging-spec/assets/01-主界面.png`
- `docs/business/wms/packaging/packaging-spec/assets/02-新增弹窗.png`

当前应用已交付包装类型维护与包装层级维护页面，并形成了 `contract -> service -> queries -> page/component -> route` 的功能组织方式。包装规格维护应复用这条路径，作为包装管理下的独立功能页面接入路由、导航、接口封装、mock store 和测试闭环。

## 目标

- 在 `apps/web` 中交付包装规格维护页面，覆盖列表查询、新增、编辑、单条删除、批量删除。
- 支持按规格编码、规格名称、包装类型编码、启用状态查询包装规格。
- 支持维护规格基础信息、包装类型、包装层级、条码规则、尺寸重量、容量单位、堆叠上限和启用状态。
- 使用 WMS API client、React Query、i18n、Testing Library、MSW 和现有后台壳约定。
- 页面视觉与交互靠近输入截图，同时与包装类型、包装层级维护的代码结构保持一致。

## 非目标

- 不实现导入、导出、列设置、全屏等原型中的扩展按钮能力。
- 不实现后端未明确提供的排序能力；列表仅按接口返回顺序展示。
- 不新增权限模型、鉴权增强或操作显隐规则。
- 不维护包装类型、包装层级、条码规则本身，只消费其编码和名称。
- 不迁移组件到 `packages/ui`。
- 不实现条码规则弹窗选择器；首版用编码和名称输入完成提交闭环。

## 受影响边界

### 页面与路由

- 新增路由路径 `/packaging/packaging-spec`。
- route 文件仅导出 feature page，不承载请求逻辑。
- 页面继续运行在 `AdminLayout` 内。
- `AppSidebar` 在包装管理分组下新增“包装规格维护”入口。
- `AdminLayout` 增加页面标题与描述映射。

### 功能目录

功能目录定为 `apps/web/src/features/wms/packaging/packaging-spec/`，首版包含：

- `packaging-spec-contract.ts`：API DTO、前端消费模型、筛选模型、表单模型、常量与映射函数。
- `packaging-spec-service.ts`：WMS 接口调用、字段映射、请求构造、删除 payload 清理。
- `packaging-spec-queries.ts`：React Query 查询与 mutation 封装。
- `packaging-spec-page.tsx`：页面装配、筛选状态、分页状态、选中状态、弹窗状态和业务事件协调。
- `packaging-spec-filter-form.tsx`：筛选区。
- `packaging-spec-table.tsx`：宽表、选择交互和单行操作。
- `packaging-spec-form-dialog.tsx`：新增/编辑表单弹窗。
- 对应测试文件：service、page。

### 基础 UI

新增/编辑沿用当前项目已有 `apps/web/src/components/ui/dialog.tsx`。筛选和表单中的候选选择首版沿用原生 `select`，保持与包装层级维护现有实现一致。

列表字段较多，表格容器必须支持横向滚动；操作列固定在右侧可以作为增强项，但首版至少要保证横向滚动后仍可访问编辑、删除操作。

## API 契约整理

### 查询接口

- URL：`POST /PackagingSpecApi/GetPackagingSpecAutoQueryDatas`
- 入参：`PackagingSpecQueryDto`
- 前端筛选字段：
  - `SpecCode?: string`
  - `SpecName?: string`
  - `PackagingTypeCode?: string`
  - `IsEnabled?: boolean`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`

API 文档还支持包装类型名称、包装层级、条码规则、尺寸重量等字段查询，但 UI 原型默认查询区只展示规格编码、规格名称、包装类型编码、启用状态。首版不实现展开查询。

### 选项查询

新增/编辑表单需要包装类型和包装层级候选项：

- 包装类型候选通过 `POST /PackagingTypeApi/GetPackagingTypeAutoQueryDatas` 获取，固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。
- 包装层级候选通过 `POST /PackagingLevelApi/GetPackagingLevelAutoQueryDatas` 获取，固定传 `IsPaged: false`、`PageIndex: 1`、`PageSize: 1000`。

条码规则目前只有字段和示例，未提供候选接口。首版在表单中提供 `BarcodeRuleCode` 和 `BarcodeRuleName` 文本输入；若后续补齐条码规则查询接口，再替换为选择器。

### 新增接口

- URL：`POST /PackagingSpecApi/StorePackagingSpecData`
- 入参：`PackagingSpecDto`
- 首版提交字段：
  - `SpecCode`
  - `SpecName`
  - `PackagingTypeCode`
  - `PackagingTypeName`
  - `PackagingLevelCode`
  - `PackagingLevelName`
  - `BarcodeRuleCode`
  - `BarcodeRuleName`
  - `Length`
  - `Width`
  - `Height`
  - `MaxWeight`
  - `GrossWeight`
  - `TareWeight`
  - `Volume`
  - `StandardCapacity`
  - `StackLimit`
  - `IsEnabled`
  - `Unit`
  - `Remark` 固定传空字符串

### 编辑接口

- URL：`POST /PackagingSpecApi/UpdatePackagingSpecData`
- 入参采用 `NeedUpdateFields` 包装，仅传 `Id` 和允许编辑字段。
- 首版允许编辑除 `SpecCode` 外的全部表单字段。

`SpecCode` 在编辑态展示为只读，不允许修改。原因是接口文档未明确唯一编码改写和下游引用迁移规则，首版收敛风险。

### 删除接口

- 单删 URL：`POST /PackagingSpecApi/RemovePackagingSpecData`
- 批删 URL：`POST /PackagingSpecApi/RemoveBatchPackagingSpecDatas`
- 删除请求直接传查询结果中的业务 DTO；前端不得仅传 `Id`。
- 如果 DTO 中存在 `CompanyCode` 或 `FactoryCode`，提交前移除，由后端根据 token 上下文解析。

## 前端消费模型

### 列表模型

前端统一消费 `PackagingSpecRecord`：

- `id: number`
- `specCode: string`
- `specName: string`
- `packagingTypeCode: string`
- `packagingTypeName: string`
- `packagingLevelCode: string`
- `packagingLevelName: string`
- `barcodeRuleCode: string`
- `barcodeRuleName: string`
- `length: number`
- `width: number`
- `height: number`
- `maxWeight: number`
- `grossWeight: number`
- `tareWeight: number`
- `volume: number`
- `standardCapacity: number`
- `stackLimit: number`
- `isEnabled: boolean`
- `unit: string`
- `remark: string`
- `creationTime?: string | null`
- `lastModificationTime?: string | null`

条码规则为空时，列表显示 `-`。

### 查询模型

前端筛选使用 `PackagingSpecFilters`：

- `specCode: string`
- `specName: string`
- `packagingTypeCode: string`
- `isEnabled: "all" | "true" | "false"`

提交查询时，空字符串映射为 `undefined`，启用状态映射为 `undefined | true | false`。

### 表单模型

表单使用 `PackagingSpecFormValues`，数字字段先用字符串承载输入，提交前转换为 number：

- `specCode: string`
- `specName: string`
- `packagingTypeCode: string`
- `packagingLevelCode: string`
- `barcodeRuleCode: string`
- `barcodeRuleName: string`
- `length: string`
- `width: string`
- `height: string`
- `maxWeight: string`
- `grossWeight: string`
- `tareWeight: string`
- `volume: string`
- `standardCapacity: string`
- `stackLimit: string`
- `unit: string`
- `isEnabled: boolean`

`packagingTypeName` 和 `packagingLevelName` 不作为用户输入字段，根据候选项自动带出。若候选项加载失败，页面保留编码输入不可提交，并提示候选加载失败。

## 字段规则与假设

API 文档未提供长度、精度和唯一性规则。首版采用以下保守前端约束，并保留后端业务错误兜底：

- `SpecCode`：必填，去首尾空格，长度 `1-32`。
- `SpecName`：必填，去首尾空格，长度 `1-64`。
- `PackagingTypeCode`：必填，必须来自包装类型候选项。
- `PackagingLevelCode`：必填，必须来自包装层级候选项。
- `BarcodeRuleCode`：必填，去首尾空格，长度 `1-32`。
- `BarcodeRuleName`：必填，去首尾空格，长度 `1-64`。
- `Length`、`Width`、`Height`、`MaxWeight`：必填，必须大于 `0`。
- `GrossWeight`、`TareWeight`、`Volume`：必填，必须大于等于 `0`。
- `StandardCapacity`：必填，必须是大于等于 `1` 的整数。
- `StackLimit`：必填，必须是大于等于 `0` 的整数。截图中存在堆叠上限为 `0` 的数据，因此不按正整数处理。
- `Unit`：必填，去首尾空格，长度 `1-16`。
- `IsEnabled`：必填布尔值，默认 `true`。

当长、宽、高均为有效正数时，前端可按 `长 * 宽 * 高 / 1_000_000` 自动计算体积并写入体积字段；用户仍可人工调整体积。

若后端返回 `Success: false`，页面展示 `DataResult.Message` 或 `OpResult.Message`，并保留用户当前输入。

## 页面结构

### 顶部筛选区

- 规格编码输入框。
- 规格名称输入框。
- 包装类型编码输入框。
- 启用状态三态下拉：全部、启用、禁用。
- 查询按钮。
- 重置按钮。

查询行为：

- 点击“查询”后以当前筛选条件重新拉取第一页。
- 点击“重置”后恢复默认筛选并拉取第一页。

### 操作区

- “新增规格”主按钮。
- “批量删除”危险按钮，未选中行时禁用。
- “刷新”图标按钮，保留当前筛选条件和页码重新拉取列表。

首版不展示导入、导出和列设置按钮，避免提供不可用入口。

### 列表区

列表列：

- 勾选列。
- 序号。
- 规格编码。
- 规格名称。
- 包装类型编码。
- 包装类型。
- 包装层级编码。
- 包装层级。
- 条码规则编码。
- 条码规则。
- 长(cm)。
- 宽(cm)。
- 高(cm)。
- 最大承重(kg)。
- 毛重(kg)。
- 皮重(kg)。
- 体积(m3)。
- 标准容量。
- 单位。
- 堆叠上限。
- 启用。
- 操作。

操作列包括：

- 编辑。
- 删除。

分页沿用包装层级维护的简单上一页/下一页模式；如后续统一分页组件，再单独收敛。

## 表单交互

### 新增

- 点击“新增规格”打开 `Dialog` 表单。
- 默认启用状态为 `true`。
- 选择包装类型后自动展示包装类型名称。
- 选择包装层级后自动展示包装层级名称。
- 输入长、宽、高后自动计算体积，允许用户覆盖。
- 提交成功后关闭弹窗，刷新当前列表。

### 编辑

- 点击“编辑”打开同一套表单组件。
- 编辑态回填当前行数据。
- `SpecCode` 只读展示。
- 提交成功后关闭弹窗，清理编辑记录并刷新当前列表。

### 删除

- 单删和批删统一使用浏览器确认流程作为首版确认交互。
- 删除成功后提示 toast，并刷新列表。
- 当删除导致当前页无数据且页码大于 `1` 时，回退到上一页重新拉取。

## 页面状态

页面必须覆盖以下用户可见状态：

- 初始加载：表格 loading 文案。
- 查询成功且有数据：正常列表。
- 查询成功但无数据：空态文案。
- 查询失败：错误提示区 + 重试按钮。
- 候选项加载失败：表单内提示并禁用提交。
- 提交中：提交按钮禁用并显示处理中状态。
- 提交成功：toast 成功提示。
- 提交失败：表单内或全局 toast 展示错误。

## 数据访问与缓存策略

- 使用 `getWmsClient()` 作为唯一接口入口。
- 查询与 mutation 全部封装到 `packaging-spec-queries.ts`。
- 列表 query key 由筛选、页码和刷新版本组成。
- 包装类型候选、包装层级候选分别使用独立 query key。
- 新增、编辑、删除、批量删除成功后，统一失效包装规格列表 query。
- 页面局部 UI 状态包括：筛选表单值、当前页码、选中行、弹窗开关、当前编辑记录、刷新版本。

## i18n 要求

- 用户可见文案补充到 `common` 资源中。
- 至少补齐 `zh-CN` 与 `en-US`：导航、页面标题、页面描述、筛选项、列标题、按钮、状态文案、表单、反馈和校验。
- 不在 route、service 或 contract 中硬编码用户可见文案。

## 测试与验证计划

最小验证覆盖：

- service 测试：验证查询、候选查询、新增、编辑、删除、批删请求路径和 payload。
- mock store 测试：验证筛选、分页、CRUD、批删和字段映射。
- page 测试：验证 loading、empty、error、列表渲染、筛选提交、表单提交、删除、批删和体积自动计算。
- 路由壳层回归：验证侧边栏入口、受保护路由和页面标题。

建议执行命令：

- `pnpm --filter @repo/web test -- packaging-spec-service.test.ts packaging-spec-store.test.ts packaging-spec-page.test.tsx app.test.tsx`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 风险与未决问题

- 条码规则没有候选查询接口，首版只能通过文本字段维护编码和名称；如果必须选择现有条码规则，需要先补充接口资料。
- API 文档未明确数字精度与范围，首版采用前端保守校验，后端仍是最终业务校验来源。
- API 文档未明确唯一性冲突错误码，首版仅透传后端消息。
- 原型包含导入、导出、列设置等入口，但接口文档未提供配套能力，首版不实现。
- 原型表格字段很多，首版以横向滚动保障可用性；固定列如果与当前 Table 封装冲突，可作为后续体验优化。
