# WMS 包装层级维护功能 Spec

日期：2026-05-27

## 背景

包装层级维护属于 WMS 基础数据中心，用于维护包装主数据之间的层级嵌套关系。层级序号从 1 开始，序号越大表示越外层；上级层级只能选择序号小于当前层级的层级。

现有输入材料包括：

- `docs/business/mes/packaging/packaging-level/api.md`
- `docs/business/mes/packaging/packaging-level/ui-prototype.md`
- `docs/business/mes/packaging/packaging-level/assets/01-主界面.png`
- `docs/business/mes/packaging/packaging-level/assets/02-新增弹窗.png`
- `docs/business/mes/packaging/packaging-level/assets/03-关系图弹窗.png`

当前应用已交付 `/packaging/packaging-type` 包装类型维护页面，并形成了 `contract -> service -> queries -> page/component -> route` 的功能组织方式。包装层级维护应复用这条路径，新增独立功能目录、路由、导航入口、接口封装和测试闭环。

## 目标

- 在 `apps/web` 中交付包装层级维护页面，覆盖列表查询、新增、编辑、单条删除、批量删除。
- 支持查看包装层级关系图，按后端返回的递归 `Children` 结构展示只读树。
- 支持新增/编辑时选择上级层级，并在前端做基础父子关系校验。
- 使用 WMS API client、React Query、i18n、Testing Library 和现有后台壳约定。
- 页面视觉与交互靠近输入截图，同时与包装类型维护的代码结构保持一致。

## 非目标

- 不实现导入、导出、列设置、全屏等原型中的扩展按钮能力。
- 不实现关系图拖拽、节点新增、节点编辑或树上直接调整父子关系。
- 不实现后端未明确提供的排序能力；列表仅按接口返回顺序展示。
- 不新增权限模型、鉴权增强或操作显隐规则。
- 不迁移组件到 `packages/ui`。
- 不维护包装规格、包装规则、包装数量换算等其他包装域功能。

## 受影响边界

### 页面与路由

- 新增路由路径 `/packaging/packaging-level`。
- route 文件仅导出 feature page，不承载请求逻辑。
- 页面继续运行在 `AdminLayout` 内。
- `AppSidebar` 在包装管理分组下新增“包装层级维护”入口。
- `AdminLayout` 增加页面标题与描述映射。

### 功能目录

功能目录定为 `apps/web/src/features/mes/packaging/packaging-level/`，首版包含：

- `packaging-level-contract.ts`：API DTO、前端消费模型、筛选模型、表单模型、树节点模型、常量与映射函数。
- `packaging-level-service.ts`：WMS 接口调用、字段映射、请求构造、删除 payload 清理。
- `packaging-level-queries.ts`：React Query 查询与 mutation 封装。
- `packaging-level-page.tsx`：页面装配、筛选状态、分页状态、选中状态、弹窗状态和业务事件协调。
- `packaging-level-filter-form.tsx`：筛选区。
- `packaging-level-table.tsx`：列表表格、选择交互和单行操作。
- `packaging-level-form-dialog.tsx`：新增/编辑表单弹窗。
- `packaging-level-tree-dialog.tsx`：关系图只读弹窗。
- 对应测试文件：service、page。

### 基础 UI

截图中的新增/编辑与关系图均是居中弹窗。当前 `apps/web/src/components/ui` 尚无 Dialog 组件，本任务应新增 `apps/web/src/components/ui/dialog.tsx`，使用现有 `radix-ui` 包中的 `Dialog` primitive 与本地 shadcn 风格封装。该组件只作为基础 UI，不绑定包装层级业务。

筛选和表单下拉首版沿用原生 `select`，保持与包装类型维护现有实现一致。

## API 契约整理

### 查询接口

- URL：`POST /PackagingLevelApi/GetPackagingLevelAutoQueryDatas`
- 入参：`PackagingLevelQueryDto`
- 前端筛选字段：
  - `LevelCode?: string`
  - `LevelName?: string`
  - `ParentLevelCode?: string`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`

API 文档还支持 `LevelSequence` 查询字段，但 UI 原型未提供对应筛选项，首版不展示。

### 选项查询

新增/编辑表单和筛选区的“上级层级编码”需要候选项。首版通过同一个查询接口获取候选项：

- URL：`POST /PackagingLevelApi/GetPackagingLevelAutoQueryDatas`
- 入参：
  - `IsPaged: false`
  - `PageIndex: 1`
  - `PageSize: 1000`

该查询只用于生成本页交互需要的层级编码、层级名称和层级序号选项。若后端对 `IsPaged: false` 仍返回分页数据，页面仍可使用当前返回集合，父子关系的最终正确性由提交接口兜底校验。

### 关系图接口

- URL：`POST /PackagingLevelApi/GetPackagingLevelTree`
- 入参：无业务参数，仅认证 token。
- 出参：`PackagingLevelTreeDto[]`
- 前端按 `Children` 递归渲染，无子节点时显示空数组对应的叶子节点。

### 新增接口

- URL：`POST /PackagingLevelApi/StorePackagingLevelData`
- 入参：`PackagingLevelDto`
- 首版提交字段：
  - `LevelCode`
  - `LevelSequence`
  - `LevelName`
  - `ParentLevelCode`
  - `ParentLevelName`
  - `Description`
  - `Remark` 固定传空字符串

### 编辑接口

- URL：`POST /PackagingLevelApi/UpdatePackagingLevelData`
- 入参采用 `NeedUpdateFields` 包装，仅传 `Id` 和允许编辑字段。
- 首版允许编辑字段：
  - `LevelSequence`
  - `LevelName`
  - `ParentLevelCode`
  - `ParentLevelName`
  - `Description`

`LevelCode` 在编辑态展示为只读，不允许修改。原因是接口文档未明确唯一编码改写和关系引用迁移规则，首版收敛风险。

### 删除接口

- 单删 URL：`POST /PackagingLevelApi/RemovePackagingLevelData`
- 批删 URL：`POST /PackagingLevelApi/RemoveBatchPackagingLevelDatas`
- 删除请求直接传查询结果中的业务 DTO；前端不得仅传 `Id`。
- 如果 DTO 中存在 `CompanyCode` 或 `FactoryCode`，提交前移除，由后端根据 token 上下文解析。

## 前端消费模型

### 列表模型

前端统一消费 `PackagingLevelRecord`：

- `id: number`
- `levelCode: string`
- `levelSequence: number`
- `levelName: string`
- `parentLevelCode: string`
- `parentLevelName: string`
- `description: string`
- `remark: string`
- `creationTime?: string | null`
- `lastModificationTime?: string | null`

`ParentLevelCode` 与 `ParentLevelName` 为空时，页面显示 `-`。

### 查询模型

前端筛选使用 `PackagingLevelFilters`：

- `levelCode: string`
- `levelName: string`
- `parentLevelCode: string`

提交查询时，空字符串映射为 `undefined`。

### 表单模型

表单使用 `PackagingLevelFormValues`：

- `levelCode: string`
- `levelSequence: string`
- `levelName: string`
- `parentLevelCode: string`
- `description: string`

`levelSequence` 在表单中用字符串承载输入，提交前转换为整数。`parentLevelName` 不作为用户输入字段，根据候选项自动带出。

### 树模型

前端统一消费 `PackagingLevelTreeNode`：

- `id: number`
- `levelCode: string`
- `levelSequence: number`
- `levelName: string`
- `parentLevelCode: string`
- `parentLevelName: string`
- `description: string`
- `children: PackagingLevelTreeNode[]`

映射函数需保证 `Children` 缺失时按空数组处理，避免渲染层额外判断。

## 字段规则与假设

API 文档只明确父子关系校验，没有提供长度规则。首版沿用包装类型维护的保守前端约束，并保留后端业务错误兜底：

- `LevelCode`：必填，去首尾空格，长度 `1-32`。
- `LevelName`：必填，去首尾空格，长度 `1-32`。
- `LevelSequence`：必填，必须是大于等于 `1` 的整数。
- `Description`：可选，长度 `0-200`。
- `ParentLevelCode`：当 `LevelSequence` 为 `1` 时必须为空；当有值时，候选项对应的序号必须小于当前层级序号。

若后端返回 `Success: false`，页面展示 `DataResult.Message` 或 `OpResult.Message`，并保留用户当前输入。

## 页面结构

### 顶部筛选区

- 层级编码输入框。
- 层级名称输入框。
- 父级层级下拉，候选项来自层级选项查询。
- 查询按钮。
- 重置按钮。

查询行为：

- 点击“查询”后以当前筛选条件重新拉取第一页。
- 点击“重置”后恢复默认筛选并拉取第一页。

### 操作区

- “新增层级”主按钮。
- “批量删除”危险按钮，未选中行时禁用。
- “刷新”图标按钮，保留当前筛选条件和页码重新拉取列表。
- “查看关系图”按钮，打开关系图弹窗并拉取树数据。

首版不展示导入、导出和列设置按钮，避免提供不可用入口。

### 列表区

列表列：

- 勾选列。
- 序号。
- 层级编码。
- 层级序号。
- 层级名称。
- 上级层级编码。
- 上级层级名称。
- 描述。
- 操作。

操作列包括：

- 编辑。
- 删除。

分页沿用包装类型维护的简单上一页/下一页模式；如后续统一分页组件，再单独收敛。

## 表单交互

### 新增

- 点击“新增层级”打开 `Dialog` 表单。
- 默认 `LevelSequence` 为空，`ParentLevelCode` 为空。
- 当输入的层级序号为 `1` 时，父级下拉禁用并清空。
- 当输入的层级序号大于 `1` 时，父级下拉只展示序号小于当前层级序号的候选项。
- 选择父级后，父级层级名称只读展示。
- 提交成功后关闭弹窗，刷新当前列表和层级选项。

### 编辑

- 点击“编辑”打开同一套表单组件。
- 编辑态回填当前行数据。
- `LevelCode` 只读展示。
- 允许调整层级序号和父级；前端做基础校验，后端做最终关系校验。
- 提交成功后关闭弹窗，刷新当前列表、层级选项和关系图缓存。

### 删除

- 单删和批删均先展示确认提示。
- 删除成功后提示 toast，并刷新当前列表、层级选项和关系图缓存。
- 当删除导致当前页无数据且页码大于 1 时，回退到上一页重新拉取。

## 关系图弹窗

- 点击“查看关系图”打开 `Dialog`。
- 弹窗打开后调用 `GetPackagingLevelTree`。
- 节点展示层级名称、层级编码，可附带层级序号作为辅助信息。
- 子节点来自 `children`，递归缩进展示。
- 根节点为无上级层级的数据。
- loading 时展示加载文案。
- 无数据时显示空状态。
- 查询失败时展示错误提示和重试按钮。
- 关系图只读，不提供拖拽、编辑或删除入口。

## 页面状态

页面必须覆盖以下用户可见状态：

- 初始加载：表格 loading 文案。
- 查询成功且有数据：正常列表。
- 查询成功但无数据：空态文案。
- 查询失败：toast 错误提示和页面内重试入口。
- 选项查询失败：父级下拉可为空，提交时依赖后端校验，并展示错误提示。
- 树查询 loading、empty、error、success。
- 提交中：提交按钮禁用并显示处理中状态。
- 提交成功：toast 成功提示。
- 提交失败：表单内或 toast 展示错误，并保留输入。

## 数据访问与缓存策略

- 使用 `getWmsClient()` 作为唯一接口入口。
- 查询与 mutation 全部封装到 `packaging-level-queries.ts`。
- 列表 query key 由分页、筛选和手动刷新版本组成。
- 选项 query key 使用 `["wms", "packaging-level", "options"]`。
- 关系图 query key 使用 `["wms", "packaging-level", "tree"]`，弹窗打开时启用。
- 新增、编辑、删除、批量删除成功后，统一失效包装层级列表、选项和关系图 query。
- 页面局部 UI 状态包括：筛选表单值、选中行、当前页、弹窗开关、当前编辑记录、手动刷新版本。

## i18n 要求

- 用户可见文案补充到 `common` 资源中。
- 至少补齐 `zh-CN` 与 `en-US`：导航、页面标题、页面描述、筛选项、列标题、按钮、状态文案、表单校验、关系图文案。
- 不在 route、service 或测试 mock 数据外硬编码用户可见文案。
- 代码中的用户可见文案不得直接写中文。

## 测试与验证计划

最小验证覆盖：

- service 测试：验证查询、选项查询、关系图、新增、编辑、单删、批删请求路径和 payload。
- mock store 测试：验证筛选、分页、新增、编辑、删除、批删和树构建。
- page 测试：验证 loading、empty、error、列表渲染、筛选提交、父级候选过滤、表单提交、删除、批量删除、关系图弹窗。
- 壳层回归：验证新路由、导航入口和页面标题描述。

建议执行命令：

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

