# 业务功能 AI 分步交付运行手册

## 目的

本文档定义当一个业务功能已经具备接口文档和 UI 原型时，如何让 AI 按仓库约定逐步完成需求分析、设计、计划、实现、验证和评审。

默认目标不是让 AI 一次性生成完整代码，而是让 AI 在明确边界内受控执行，并为每一步留下可回看的文档和验证证据。

## 适用范围

适用于 `apps/web` 中新增或扩展业务页面、远程数据能力、表格、筛选、表单、详情、操作闭环等需求。

典型例子：

- 包装类型 `packaging-type`
- 包装规则、盘点策略等 MES 业务模块
- 未来独立接入的 WMS 业务模块
- 有接口文档和 UI 原型的新业务页面
- 会影响 `contract -> service -> queries -> page/component -> route` 多层边界的改动

如果只是文案、局部样式或单个测试修复，可按 `L0` 或 `L1` 简化处理，不必完整执行本文档。

## 总体原则

- 先明确边界，再写代码。
- 先沉淀 `spec` 或 `plan`，再进入实现。
- 每次只做一个可验证切片。
- 页面不直接写 HTTP 请求。
- route 文件只做路由装配。
- 用户可见行为必须有验证证据。
- AI 汇报时必须说明实际运行了哪些命令、哪些通过、哪些未运行及原因。

## 任务分级

具备接口文档和 UI 原型的业务功能，通常按 `L2` 处理，因为它往往涉及：

- 跨文件行为变化
- 数据流变化
- 路由或页面状态变化
- 表格、筛选、分页、表单等用户可见交互
- service、query、component、i18n、测试等多处改动

如果需求触及鉴权、权限模型、部署、CI、依赖升级、跨 workspace 重构或仓库级默认约定，应提升为 `L3`，由人工主导。

## AI 开始前的必读入口

让 AI 在动手前读取以下文档：

- `AGENTS.md`
- `docs/ai/context-index.md`
- `docs/ai/README.md`
- `docs/ai/ai-development-governance.md`
- `docs/ai/runbooks/ai-development-runbook.md`
- `docs/standards/web-business-module-guidelines.md`
- `docs/standards/web-code-guidelines.md`
- `docs/api/`
- `docs/ui/`

如果是表格需求，重点读取：

- `docs/ui/table-patterns.md`

如果是表单需求，重点读取：

- `docs/ui/form-patterns.md`

## 输入材料清单

在让 AI 写 spec 前，尽量准备以下材料。

接口文档应包含：

- 列表、详情、新增、编辑、删除、启用、停用等接口
- 请求方法、路径、请求参数、响应示例
- 分页、筛选、排序字段
- 字段类型、必填规则、长度限制、枚举值
- 唯一性约束和业务校验规则
- 错误响应示例和状态码语义
- 时间字段格式和时区语义

UI 原型应包含：

- 页面路径、页面标题、导航位置
- 列表列、筛选项、按钮、行操作
- 新增、编辑、详情、删除确认等交互
- loading、empty、error、提交中、成功、失败状态
- 表单字段、校验提示、默认值
- 权限或按钮显隐规则
- 中文和英文文案要求，如果有

如果材料不完整，先让 AI 明确列出缺口和假设，不要直接进入实现。

## 标准流程

### 第 1 步：只做需求整理和 spec

目标是把接口文档和 UI 原型转化为仓库内可执行的功能设计文档。

建议提示词：

```text
请先不要写代码。请基于 AGENTS.md、docs/ai/context-index.md、docs/api/、docs/ui/、docs/standards/，阅读我提供的接口文档和 UI 原型文档，为 <业务功能名> 写一份功能 spec，放到 docs/specs/<日期>-<业务功能名>.md。

要求：
- 判断任务级别，默认按 L2 处理
- 明确背景、目标、非目标、受影响边界
- 梳理接口契约、前端消费模型、字段映射、分页/筛选/排序规则
- 梳理页面状态：loading、empty、error、列表、表单、提交成功、提交失败
- 明确 route、contract、service、queries、page/component、i18n、测试的边界
- 列出验收标准、验证计划、风险和未决问题
- 只写文档，不改业务代码
```

完成后人工检查：

- 目标是否准确
- 非目标是否足够明确
- 是否存在 AI 自行扩大范围
- 接口字段和 UI 行为是否被正确理解
- 未决问题是否需要先问业务或后端

### 第 2 步：写 implementation plan

目标是把 spec 拆成多个可独立验证的实现切片。

建议提示词：

```text
请基于 docs/specs/<日期>-<业务功能名>.md 写实施计划，放到 docs/plans/<日期>-<业务功能名>.md。

计划要按可验证切片拆分，每个切片包含：
- 要新增或修改的文件
- 先写哪些测试或结构化验证
- 最小实现内容
- 要运行的命令
- 验收标准
- 明确不做什么

请遵循 contract -> service -> queries -> page/component -> route 的边界。
```

推荐切片顺序：

1. contract 和字段模型
2. service 和接口适配
3. queries 和缓存失效策略
4. 页面列表、筛选、分页、排序
5. 表单、提交、反馈和确认交互
6. i18n 文案
7. 单元测试、页面测试或 E2E
8. 最终验证和 AI review

### 第 3 步：执行 contract 和 service 切片

目标是先把接口契约和远程数据适配稳定下来。

建议提示词：

```text
请只执行计划中的 contract 和 service 切片：
- 更新或新增 feature contract
- 新增或更新 service
- 在 service 层完成接口响应适配和错误归一化
- 补 service 测试
- 不改 UI 页面
- 完成后运行计划中指定的最小验证，并汇报结果
```

注意事项：

- 页面层不要消费后端原始响应。
- 后端字段命名不适合前端时，在 service 或 contract 层做稳定映射。
- 空字符串、`undefined`、`null` 的请求语义必须统一。
- 分页、筛选、排序不要散落在页面里临时拼接。

### 第 4 步：执行 queries 切片

目标是封装 React Query 的查询、mutation、query key 和缓存失效策略。

建议提示词：

```text
请只执行计划中的 queries 切片：
- 封装 query keys
- 封装列表查询、详情查询和 mutation hook
- 明确新增、编辑、删除、启停后的缓存失效策略
- 不把请求逻辑写进页面
- 补必要测试或类型验证
```

注意事项：

- 远程数据交给 React Query。
- 组件局部交互状态留在组件内。
- 查询参数如果需要可分享，优先考虑 TanStack Router search params。

### 第 5 步：执行页面列表切片

目标是先完成用户可见的列表、筛选、分页、排序和基础状态。

建议提示词：

```text
请只实现 <业务功能名> 的列表页切片：
- 使用现有 DataTable 和 apps/web/src/components/ui 下的 shadcn 组件
- 实现 loading、empty、error、正常列表状态
- 实现 spec 中定义的筛选、分页和排序
- 用户可见文案走 i18n
- 不实现新增/编辑表单，除非计划中的本切片已经包含
- 完成后运行计划中指定的验证命令
```

注意事项：

- `DataTable` 只承载通用表格渲染，业务筛选和行操作留在 feature 页面或业务组件内。
- 远程分页不要混用客户端排序或客户端筛选。
- E2E 选择器优先使用 `getByRole`、稳定文案、`data-testid`。

### 第 6 步：执行表单和操作切片

目标是实现新增、编辑、删除、启用、停用等业务操作。

建议提示词：

```text
请实现 <业务功能名> 的表单和操作切片：
- 表单使用 react-hook-form + zod
- UI 使用 apps/web/src/components/ui 下的 shadcn 组件
- 字段布局使用 Field、FieldLabel、FieldDescription、FieldError
- 错误态同时设置 Field 的 data-invalid 和控件的 aria-invalid
- 提交反馈使用 sonner
- 成功后按计划刷新列表或失效 query
- 删除、停用等破坏性操作按 UI 原型实现确认流程
- 完成后运行计划中指定的验证命令
```

注意事项：

- 表单 schema 放在当前表单文件或 feature 附近。
- 提交函数只接收已经通过 schema 校验的值。
- 不要把后端错误结构直接传给 UI。

### 第 7 步：补 i18n、测试和 E2E

目标是覆盖用户可见文案和关键行为。

建议提示词：

```text
请补齐 <业务功能名> 的 i18n、页面测试和必要的 E2E：
- 用户可见文案同步补充 zh-CN 和 en-US
- 页面测试断言 loading、empty、error、列表和关键操作
- 如涉及主业务链路，补 apps/web-e2e 覆盖
- E2E 优先断言用户可见行为，不依赖 Tailwind 类名或脆弱 DOM 结构
- 完成后运行计划中指定的验证命令
```

最低验证建议：

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web typecheck`
- `pnpm --filter @repo/web lint`

涉及主链路或路由闭环时补充：

- `pnpm --filter @repo/web-e2e test:e2e`
- `pnpm verify:web`

需要完整交付前可运行：

- `pnpm verify`

### 第 8 步：最终评审

实现完成后，让 AI 进入 code review 视角，而不是继续扩写功能。

建议提示词：

```text
请对本次 <业务功能名> 改动做一次代码评审。请优先检查：
- 行为回归
- 边界破坏
- 数据流是否符合 contract -> service -> queries -> page/component -> route
- 测试和验证缺口
- 用户可见状态是否完整
- i18n 是否遗漏
- 是否存在无关改动或范围扩张

请先列问题和风险，再给简短总结。
```

## 推荐文件结构

业务模块默认放在：

```txt
apps/web/src/features/mes/<module>/<resource>/
  <resource>-contract.ts
  <resource>-service.ts
  <resource>-queries.ts
  <resource>-page.tsx
  <resource>-table.tsx
  <resource>-form.tsx
  <resource>-service.test.ts
  <resource>-page.test.tsx
```

实际结构应优先沿用当前目录。不要为了套模板移动既有文件。

route 文件放在：

```txt
apps/web/src/routes/<path-expanded-name>.tsx
```

route 文件应保持轻量，只导入 feature page 并接入壳层，不写请求、表格状态或业务表单逻辑。

## 完成定义

业务功能只有同时满足以下条件，才能称为完成：

- spec 和 plan 已经与实际实现保持一致
- 目标范围没有无控制扩张
- 接口契约、页面状态和业务操作符合 UI 原型
- 数据流没有越过约定边界
- 用户可见文案已补齐
- 必要测试和检查已经执行
- AI 汇报中包含验证证据
- 未执行的验证有明确原因和残余风险说明

## 常见禁区

- 不要一上来让 AI 直接写完整页面。
- 不要把请求逻辑直接写进 route 或页面组件。
- 不要把后端原始响应结构扩散到 UI。
- 不要在 E2E 中依赖 Tailwind 类名或脆弱 DOM 结构。
- 不要把业务组件默认迁移到 `packages/ui`。
- 不要在没有明确批准时调整 provider 顺序、构建脚本、CI、依赖或仓库级规范。
- 不要在没有验证结果时宣称完成。

## 包装类型任务提示词示例

如果要实现包装类型 `packaging-type`，可以从这条提示词开始：

```text
我现在要实现包装类型 packaging-type 业务。我已经提供接口文档和 UI 原型文档。

请先不要写代码。请读取 AGENTS.md、docs/ai/context-index.md、docs/ai/runbooks/business-feature-ai-delivery-runbook.md，以及相关 docs/api、docs/ui、docs/standards 文档。

请先为 packaging-type 写功能 spec，放到 docs/specs/<YYYY-MM-DD>/packaging-type-maintenance.md。

要求：
- 按 L2 处理
- 包装业务归属 MES，数据接入遵循 docs/standards/mes-page-data-integration-template.md
- 基于现有 apps/web/src/routes/packaging.packaging-type.tsx 和 apps/web/src/features/mes/packaging/packaging-type 目录设计
- 明确 contract、service、queries、page/component、i18n、测试边界
- 梳理接口字段映射、分页、筛选、排序、错误、时间字段
- 梳理列表、表单、确认操作、loading、empty、error、提交反馈状态
- 列出验收标准、验证计划、风险和未决问题
- 只写文档，不改业务代码
```
