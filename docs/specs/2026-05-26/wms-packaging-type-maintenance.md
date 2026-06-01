# WMS 包装类型维护功能 Spec

日期：2026-05-26

## 背景

包装类型维护属于 WMS 基础数据中心，负责维护包装类型编码、名称、是否循环包装、描述等基础主数据。当前应用已存在 `/packaging/packaging-type` 路由与导航入口，但页面仍是占位卡片，尚未接入业务查询、表格、表单和操作闭环。

现有输入材料包括：

- `docs/business/wms/packaging/packaging-type/api.md`
- `docs/business/wms/packaging/packaging-type/ui-prototype.md`

本任务按 L2 处理，需要先明确功能边界、接口消费模型和页面状态，再进入实现。

## 目标

- 在 `apps/web` 中交付包装类型维护页面，覆盖列表查询、新增、编辑、单条删除、批量删除。
- 使用仓库既有边界组织功能：`contract -> service -> queries -> page/component -> route`。
- 让页面具备列表、筛选、分页、提交反馈、空态、错误态和确认交互。
- 保持与当前后台壳、i18n、WMS API client、React Query、Testing Library 约定一致。

## 非目标

- 不实现导入、导出、列表列配置等原型中的扩展按钮能力。
- 不实现后端未明确提供的排序能力；表格列仅展示，不追加前端本地排序。
- 不实现权限模型、鉴权增强或操作显隐。
- 不在本次改动中抽取新的共享包组件到 `packages/ui`。
- 不实现详情页或额外字段（如备注）编辑入口；备注仅在数据结构中兼容，不放入首版表单。

## 受影响边界

### 页面与路由

- 保留既有路由路径 `/packaging/packaging-type`。
- route 文件继续只负责导出 feature page，不承载请求逻辑。
- 页面继续运行在 `AdminLayout` 内。

### 功能目录

功能目录定为 `apps/web/src/features/wms/packaging/packaging-type/`，首版包含：

- `packaging-type-contract.ts`：前端消费模型、筛选模型、表单模型、枚举与 mock fixture。
- `packaging-type-service.ts`：WMS 接口调用、字段映射、请求构造。
- `packaging-type-queries.ts`：React Query 查询与 mutation 封装。
- `packaging-type-page.tsx`：页面装配、状态表达与业务事件协调。
- `packaging-type-table.tsx`：列表表格与选择交互。
- `packaging-type-filter-form.tsx`：筛选区。
- `packaging-type-form-sheet.tsx`：新增/编辑表单。
- 对应测试文件：service、queries、page。

## API 契约整理

### 查询接口

- URL：`POST /PackagingTypeApi/GetPackagingTypeAutoQueryDatas`
- 入参：`PackagingTypeQueryDto`
- 前端消费筛选字段：
  - `TypeCode?: string`
  - `TypeName?: string`
  - `IsRecyclable?: boolean`
  - `Description?: string`
  - `IsPaged: true`
  - `PageIndex: number`
  - `PageSize: number`

### 新增接口

- URL：`POST /PackagingTypeApi/StorePackagingTypeData`
- 入参：`PackagingTypeDto`
- 首版前端提交字段：
  - `TypeCode`
  - `TypeName`
  - `IsRecyclable`
  - `Description`
  - `Remark` 固定传空字符串，避免前后端语义漂移

### 编辑接口

- URL：`POST /PackagingTypeApi/UpdatePackagingTypeData`
- 入参采用 `NeedUpdateFields` 包装，仅传变更字段与 `Id`
- 首版允许编辑字段：
  - `TypeName`
  - `IsRecyclable`
  - `Description`
- `TypeCode` 在编辑态展示为只读，不允许修改。原因：API 文档未明确唯一编码改写规则，优先收敛风险。

### 删除接口

- 单删 URL：`POST /PackagingTypeApi/RemovePackagingTypeData`
- 批删 URL：`POST /PackagingTypeApi/RemoveBatchPackagingTypeDatas`
- 删除请求直接传查询结果中的完整 DTO；前端不得仅传 `Id`

## 前端消费模型

### 列表模型

前端统一消费 `PackagingTypeRecord`：

- `id: number`
- `typeCode: string`
- `typeName: string`
- `isRecyclable: boolean`
- `description: string`
- `remark: string`
- `companyCode?: string`
- `factoryCode?: string`
- `creationTime?: string | null`
- `lastModificationTime?: string | null`

保留后端删除所需字段，但页面渲染只使用业务字段。

### 查询模型

前端筛选使用 `PackagingTypeFilters`：

- `typeCode: string`
- `typeName: string`
- `isRecyclable: "all" | "true" | "false"`

原型中的“循环包装”下拉按三态处理：全部、是、否。提交查询时映射为 `undefined | true | false`。

### 表单模型

表单使用 `PackagingTypeFormValues`：

- `typeCode: string`
- `typeName: string`
- `isRecyclable: boolean`
- `description: string`

## 字段规则与假设

由于 API 文档未给出完整长度与唯一性规则，首版采用以下前端约束并保留后端兜底提示：

- `TypeCode`：必填，去首尾空格，长度 `1-32`
- `TypeName`：必填，去首尾空格，长度 `1-32`
- `Description`：可选，长度 `0-200`
- `IsRecyclable`：必填布尔值，默认 `false`

如果后端返回业务错误，则直接显示 `DataResult.Message`。

## 页面结构

### 顶部筛选区

- 类型编码输入框
- 类型名称输入框
- 循环包装三态下拉
- 查询按钮
- 重置按钮

查询行为：

- 点击“查询”后以当前筛选条件重新拉取第一页。
- 点击“重置”后恢复默认筛选并拉取第一页。

### 操作区

- “新增类型”主按钮
- “批量删除”危险按钮

批量删除按钮在未选中行时禁用。

### 列表区

列表列：

- 勾选列
- 序号
- 类型编码
- 类型名称
- 循环包装
- 描述
- 操作

操作列包括：

- 编辑
- 删除

## 表单交互

### 新增

- 点击“新增类型”打开右侧 `Sheet` 表单，替代原型弹窗。
- 原因：仓库已有 `Sheet` 基础组件，无现成 `Dialog` 封装；首版优先复用现有基础设施。
- 表单底部按钮包括：返回、重置、确认。

### 编辑

- 点击“编辑”打开同一套表单组件。
- 编辑态回填当前行数据。
- `TypeCode` 只读展示。
- 提交成功后关闭表单并刷新列表。

### 删除

- 单删和批删统一使用浏览器确认流程作为首版确认交互。
- 删除成功后提示 toast，并刷新列表。
- 当删除导致当前页无数据且页码大于 1 时，回退到上一页重新拉取。

## 页面状态

页面必须覆盖以下用户可见状态：

- 初始加载：表格 loading 文案
- 查询成功且有数据：正常列表
- 查询成功但无数据：空态文案
- 查询失败：错误提示区 + 重试按钮
- 提交中：提交按钮禁用并显示处理中状态
- 提交成功：toast 成功提示
- 提交失败：表单内或全局 toast 展示错误

## 数据访问与缓存策略

- 使用 `getWmsClient()` 作为唯一接口入口。
- 查询与 mutation 全部封装到 `packaging-type-queries.ts`。
- 列表 query key 由分页与筛选组成。
- 新增、编辑、删除、批量删除成功后，统一失效包装类型列表 query。
- 页面局部 UI 状态包括：筛选表单值、选中行、sheet 开关、当前编辑记录。

## i18n 要求

- 用户可见文案补充到 `common` 资源中。
- 至少补齐 `zh-CN` 与 `en-US`：页面描述、筛选项、列标题、按钮、状态文案、表单校验。
- 不在 route 或 service 中硬编码用户可见文案。

## 测试与验证计划

最小验证覆盖：

- service 测试：验证查询/新增/编辑/删除/批删请求路径和 payload
- query 或 page 测试：验证 loading、empty、error、列表渲染、筛选提交、表单提交
- 路由壳层回归：保留 `App` 中包装模块挂载测试

建议执行命令：

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`

## 风险与未决问题

- API 文档未明确唯一性冲突错误码，首版仅透传后端消息。
- API 文档未明确批删入参结构是否为 DTO 数组；实现按“完整 DTO 数组”处理，如实际契约不同需同步调整。
- 原型包含导入、导出、刷新、设置等入口，但接口文档未提供配套能力，首版不实现。
- 原型使用居中弹窗，首版改为 `Sheet`，视觉与原型略有差异，但交互闭环一致。
