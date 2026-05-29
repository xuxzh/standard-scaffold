# WMS 套包信息维护功能 Spec

日期：2026-05-29

## 背景

套包信息维护属于 WMS 基础数据中心，用于维护由一个主件物料和多个子件物料组成的包装套包。套包主表记录套包编码、名称、主件物料、单位、是否虚拟主件等信息，子件列表以 JSON 数组随套包整体保存，后端根据 `Children` 自动计算 `ChildCount`。

现有输入材料包括：

- `docs/business/wms/packaging/packaging-kit/api.md`
- `docs/business/wms/packaging/packaging-kit/ui-prototype.md`
- `docs/business/wms/packaging/packaging-kit/assets/01-主界面.png`
- `docs/business/wms/packaging/packaging-kit/assets/02-新增弹窗.png`
- `docs/business/wms/packaging/packaging-kit/assets/03-添加子件弹窗.png`

当前应用已交付包装类型维护与包装层级维护页面，并形成了 `contract -> service -> queries -> page/component -> route` 的功能组织方式。套包信息维护应复用这条路径，作为包装管理下的独立功能页面接入路由、导航、接口封装、mock store 和测试闭环。

## 目标

- 在 `apps/web` 中交付套包信息维护页面，覆盖列表查询、新增、编辑、单条删除、批量删除。
- 支持按套包编码和套包名称查询套包列表。
- 支持维护主件物料、主件物料名称、单位、虚拟主件、备注和子件列表。
- 支持在新增/编辑弹窗中选择主件物料、添加多个子件物料、调整子件数量、删除子件。
- 使用 WMS API client、React Query、i18n、Testing Library、MSW 和现有后台壳约定。
- 页面视觉与交互靠近输入截图，同时与包装类型、包装层级维护的代码结构保持一致。

## 非目标

- 不实现导入、导出、列设置、全屏等原型中的扩展按钮能力。
- 不实现后端未明确提供的排序能力；列表仅按接口返回顺序展示。
- 不实现批量新增和批量修改入口；接口可在 service 中兼容，但首版页面不暴露操作。
- 不新增物料主数据维护页面，只消费物料候选数据。
- 不新增权限模型、鉴权增强或操作显隐规则。
- 不迁移组件到 `packages/ui`。
- 不实现复杂 BOM 校验、库存校验或套包可用性计算。

## 受影响边界

### 页面与路由

- 新增路由路径 `/packaging/packaging-kit`。
- route 文件仅导出 feature page，不承载请求逻辑。
- 页面继续运行在 `AdminLayout` 内。
- `AppSidebar` 在包装管理分组下新增“套包信息维护”入口。
- `AdminLayout` 增加页面标题与描述映射。

### 功能目录

功能目录定为 `apps/web/src/features/wms/packaging/packaging-kit/`，首版包含：

- `packaging-kit-contract.ts`：API DTO、前端消费模型、筛选模型、表单模型、物料候选模型、常量与映射函数。
- `packaging-kit-service.ts`：WMS 接口调用、字段映射、请求构造、删除 payload 清理、物料候选查询。
- `packaging-kit-queries.ts`：React Query 查询与 mutation 封装。
- `packaging-kit-page.tsx`：页面装配、筛选状态、分页状态、选中状态、弹窗状态和业务事件协调。
- `packaging-kit-filter-form.tsx`：筛选区。
- `packaging-kit-table.tsx`：列表表格、选择交互、子件展开入口和单行操作。
- `packaging-kit-form-dialog.tsx`：新增/编辑套包弹窗。
- `packaging-kit-material-dialog.tsx`：主件/子件物料选择弹窗。
- 对应测试文件：service、page。

### 基础 UI

新增/编辑与子件选择均使用当前项目已有 `apps/web/src/components/ui/dialog.tsx`。列表行的子件明细可优先实现为行内展开区；如果现有表格结构不适合展开，则实现为只读明细弹窗，但用户必须能从列表查看当前套包子件。

筛选区和表单控件优先复用 `apps/web/src/components/ui` 中已有 shadcn 组件。数量字段使用文本输入承载，提交前转换为正整数。

## API 契约整理

### 查询接口

- URL：`POST /PackagingKitApi/GetPackagingKitAutoQueryDatas`
- 入参：`PackagingKitQueryDto`
- 前端筛选字段：
  - `KitCode?: string`
  - `KitName?: string`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`

API 文档还支持 `MainMaterialCode`、`MainMaterialName`、`Unit`、`IsVirtualMain` 查询字段，但 UI 原型默认查询区只展示套包编码和套包名称。首版不实现展开查询。

### 物料候选查询

新增/编辑表单中的主件选择与子件选择都需要物料候选。当前套包输入材料未提供正式物料主数据接口；仓库已有 API client 测试使用 `/Material/GetMaterialAutoQueryDatas` 作为物料查询示例。

首版按以下假设封装物料候选查询：

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
  - `Unit`
  - `MaterialTypeName?`

若后端确认物料接口路径或字段不同，只替换 `packaging-kit-service.ts` 的物料候选查询和 MSW handler，不改变表单模型与页面交互。

### 新增接口

- URL：`POST /PackagingKitApi/StorePackagingKitData`
- 入参：`PackagingKitDto`
- 首版提交字段：
  - `KitCode`
  - `KitName`
  - `MainMaterialCode`
  - `MainMaterialName`
  - `Unit`
  - `IsVirtualMain`
  - `Children`
  - `Remark` 固定传空字符串或表单备注

`ChildCount` 由后端根据 `Children` 自动计算，前端不提交。

### 编辑接口

- URL：`POST /PackagingKitApi/UpdatePackagingKitData`
- 入参采用 `NeedUpdateFields` 包装，仅传 `Id` 和允许编辑字段。
- 首版允许编辑字段：
  - `KitName`
  - `MainMaterialCode`
  - `MainMaterialName`
  - `Unit`
  - `IsVirtualMain`
  - `Children`
  - `Remark`

`KitCode` 在编辑态展示为只读，不允许修改。原因是接口文档未明确唯一编码改写和下游引用迁移规则，首版收敛风险。

### 删除接口

- 单删 URL：`POST /PackagingKitApi/RemovePackagingKitData`
- 批删 URL：`POST /PackagingKitApi/RemoveBatchPackagingKitDatas`
- 删除请求直接传查询结果中的业务 DTO；前端不得仅传 `Id`。
- 如果 DTO 中存在 `CompanyCode` 或 `FactoryCode`，提交前移除，由后端根据 token 上下文解析。

### 暂不暴露的接口

- 批量新增 URL：`POST /PackagingKitApi/StoreBatchPackagingKitDatas`
- 批量修改 URL：`POST /PackagingKitApi/UpdateBatchPackagingKitDatas`

这两个接口不进入首版页面操作。service 可不封装，避免引入没有用户入口的能力。

## 前端消费模型

### 列表模型

前端统一消费 `PackagingKitRecord`：

- `id: number`
- `kitCode: string`
- `kitName: string`
- `mainMaterialCode: string`
- `mainMaterialName: string`
- `unit: string`
- `isVirtualMain: boolean`
- `childCount: number`
- `children: PackagingKitChild[]`
- `remark: string`
- `creationTime?: string | null`
- `lastModificationTime?: string | null`

### 子件模型

前端统一消费 `PackagingKitChild`：

- `code: string`
- `name: string`
- `quantity: number`
- `unit: string`

映射函数需保证 `Children` 缺失时按空数组处理，`ChildCount` 缺失时按 `children.length` 补齐，避免渲染层额外判断。

### 查询模型

前端筛选使用 `PackagingKitFilters`：

- `kitCode: string`
- `kitName: string`

提交查询时，空字符串映射为 `undefined`。

### 表单模型

表单使用 `PackagingKitFormValues`：

- `kitCode: string`
- `kitName: string`
- `mainMaterialCode: string`
- `mainMaterialName: string`
- `unit: string`
- `isVirtualMain: boolean`
- `children: PackagingKitChildFormValues[]`
- `remark: string`

子件表单模型使用字符串承载数量输入：

- `code: string`
- `name: string`
- `quantity: string`
- `unit: string`

提交前统一将 `quantity` 转换为正整数。

### 物料候选模型

前端统一消费 `PackagingKitMaterialOption`：

- `code: string`
- `name: string`
- `unit: string`
- `typeName: string`

主件选择和子件选择共用同一个候选模型。选择主件后自动回填 `mainMaterialCode`、`mainMaterialName` 和 `unit`；选择子件后默认 `quantity` 为 `1`，`unit` 使用物料单位，物料单位为空时使用当前套包单位。

## 字段规则与假设

API 文档未提供长度、数量上限和唯一性规则。首版采用以下保守前端约束，并保留后端业务错误兜底：

- `KitCode`：必填，去首尾空格，长度 `1-32`。
- `KitName`：必填，去首尾空格，长度 `1-64`。
- `MainMaterialCode`：必填，必须来自物料候选或通过物料选择弹窗回填。
- `MainMaterialName`：必填，只读展示，由物料选择带出。
- `Unit`：必填，去首尾空格，长度 `1-16`，默认 `套`。
- `IsVirtualMain`：必填布尔值，默认 `false`。
- `Children`：至少 `1` 条子件。
- `Children[].Code`：必填，同一套包内不能重复，且不能等于 `MainMaterialCode`。
- `Children[].Quantity`：必填，必须是大于等于 `1` 的整数。
- `Children[].Unit`：必填，去首尾空格，长度 `1-16`。
- `Remark`：可选，长度 `0-200`。

若后端返回 `Success: false`，页面展示 `DataResult.Message` 或 `OpResult.Message`，并保留用户当前输入。

## 页面结构

### 顶部筛选区

- 套包编码输入框。
- 套包名称输入框。
- 查询按钮。
- 重置按钮。

查询行为：

- 点击“查询”后以当前筛选条件重新拉取第一页。
- 点击“重置”后恢复默认筛选并拉取第一页。

### 操作区

- “新增套包”主按钮。
- “批量删除”危险按钮，未选中行时禁用。
- “刷新”图标按钮，保留当前筛选条件和页码重新拉取列表。

首版不展示导入、导出和列设置按钮，避免提供不可用入口。

### 列表区

列表列：

- 勾选列。
- 子件展开列或查看子件入口。
- 序号。
- 套包编码。
- 套包名称。
- 主件物料编码。
- 主件物料名称。
- 单位。
- 虚拟主件。
- 子件数。
- 操作。

操作列包括：

- 编辑。
- 删除。

分页沿用包装层级维护的简单上一页/下一页模式；如后续统一分页组件，再单独收敛。

### 子件明细查看

用户从列表点击子件展开入口或“查看子件”后，可以看到当前套包的只读子件列表：

- 子件编码。
- 子件名称。
- 数量。
- 单位。

无子件时展示空态文案。该展示只读，不提供保存入口。

## 表单交互

### 新增

- 点击“新增套包”打开 `Dialog` 表单。
- 默认单位为 `套`。
- 默认虚拟主件为 `false`。
- 点击主件物料编码输入或选择按钮，打开物料选择弹窗，单选物料后回填主件编码、名称和单位。
- 点击“添加子件”打开物料选择弹窗，支持多选物料。
- 确认添加子件后追加到子件列表，默认数量为 `1`。
- 如果所选物料已在子件列表中存在，则不重复追加，并展示重复提示。
- 提交成功后关闭弹窗，刷新当前列表。

### 编辑

- 点击“编辑”打开同一套表单组件。
- 编辑态回填当前行数据和子件列表。
- `KitCode` 只读展示。
- 用户可重新选择主件物料、调整单位、切换虚拟主件、添加或删除子件、调整子件数量。
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
- 物料候选加载中：物料选择弹窗显示 loading 文案。
- 物料候选为空：物料选择弹窗显示空态文案。
- 物料候选加载失败：物料选择弹窗显示错误提示和重试按钮。
- 提交中：提交按钮禁用并显示处理中状态。
- 提交成功：toast 成功提示。
- 提交失败：表单内或全局 toast 展示错误。

## 数据访问与缓存策略

- 使用 `getWmsClient()` 作为唯一接口入口。
- 查询与 mutation 全部封装到 `packaging-kit-queries.ts`。
- 列表 query key 由筛选、页码和刷新版本组成。
- 物料候选 query key 由搜索条件、页码和选择模式组成；主件与子件选择可以复用同一查询 hook。
- 新增、编辑、删除、批量删除成功后，统一失效套包列表 query。
- 页面局部 UI 状态包括：筛选表单值、当前页码、选中行、子件展开记录、套包弹窗开关、物料选择弹窗开关、当前编辑记录、刷新版本。

## i18n 要求

- 用户可见文案补充到 `common` 资源中。
- 至少补齐 `zh-CN` 与 `en-US`：导航、页面标题、页面描述、筛选项、列标题、按钮、状态文案、表单、物料选择、子件列表、反馈和校验。
- 不在 route、service 或 contract 中硬编码用户可见文案。

## 测试与验证计划

最小验证覆盖：

- service 测试：验证查询、物料候选查询、新增、编辑、删除、批删请求路径和 payload。
- mock store 测试：验证筛选、分页、CRUD、批删、子件数量计算和物料候选过滤。
- page 测试：验证 loading、empty、error、列表渲染、筛选提交、子件查看、新增、编辑、物料选择、子件去重、删除和批删。
- 路由壳层回归：验证侧边栏入口、受保护路由和页面标题。

建议执行命令：

- `pnpm --filter @repo/web test -- packaging-kit-service.test.ts packaging-kit-store.test.ts packaging-kit-page.test.tsx app.test.tsx`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 风险与未决问题

- 提供资料未包含正式物料主数据查询接口。首版按 `/Material/GetMaterialAutoQueryDatas` 封装候选查询；若后端路径或字段不同，需要在 service 和 mock handler 中替换。
- API 文档未明确套包编码唯一性冲突错误码，首版仅透传后端消息。
- API 文档未明确子件数量上限，首版只做正整数校验，不限制子件行数。
- 原型包含导入、导出、列设置等入口，但接口文档未提供配套能力，首版不实现。
- 子件明细可用行内展开或只读弹窗实现；实现时优先选择与现有表格结构冲突最小的方案。
