# 物料包装关系主子表展示设计

## 背景

物料包装关系列表接口 `GetMaterialPackagingRelationAutoQueryDatas` 的每条主记录已经包含一组 `Details` 包装层级明细。当前页面将主记录与明细拍平成多行，导致同一物料包装关系的物料、包装规则、选择框和操作按钮重复出现，也使分页记录数与页面视觉行数的含义不一致。

本次调整参考套包信息维护页面的可展开主子表模式，让一条物料包装关系在主表中只占一行，其包装层级在展开区域内集中展示。

## 目标

将物料包装关系表格改为默认收起的可展开主子表，使主记录选择与操作保持唯一，同时完整展示接口返回的包装层级明细。

## 非目标

- 不修改接口地址、请求参数、响应契约或 React Query 缓存策略。
- 不修改新增、编辑、删除、批量删除、筛选、分页和左侧物料选择的业务规则。
- 不修改导入模板、导入流程、导出字段或导出文件结构。
- 不调整套包信息维护页面或通用 `DataTable` 的公共接口。
- 不处理本次工作开始前已经存在的错误通知测试失败。
- 不引入新的 UI 依赖或通用抽象。

## 范围级别

- 任务级别：`L2`。
- 原因：该变更调整物料包装关系的用户可见表格结构、表格组件输入模型、页面事件参数、i18n 和测试，属于跨文件行为与数据展示调整。
- 实现位置：`.worktrees/codex-material-packaging-master-detail` 隔离 worktree，分支 `codex-material-packaging-master-detail`。

## 现状与接口消费模型

列表接口返回的分页数据具有以下层级：

- `Attach[]`：物料包装关系主记录，包含 `Id`、物料、包装规则、备注及审计字段。
- `Attach[].Details[]`：对应关系的包装层级明细，包含层级、规格、数量、单位、包装类型和打印模板字段。
- `TotalCount`：主记录总数，分页单位是物料包装关系，而不是拍平后的明细行。

现有 contract 已将每条接口 DTO 映射为 `MaterialPackagingRelationRecord`，并将 `Details` 映射为 `record.details`。页面随后调用 `flattenMaterialPackagingRelationRows` 生成 `MaterialPackagingRelationTableRow[]`。本次保留 DTO 到 record 的映射，移除仅为拍平展示服务的行模型和转换函数。

## 建议方案

### 主表

`MaterialPackagingRelationTable` 直接接收 `MaterialPackagingRelationRecord[]`，复用通用 `DataTable` 的 `getRowCanExpand` 和 `renderExpandedRow` 能力。

主表列依次为：

1. 展开按钮（由 `DataTable` 在存在展开内容时提供）
2. 选择框
3. 序号
4. 物料编码
5. 物料名称
6. 包装规则编码
7. 包装规则名称
8. 明细数量
9. 备注
10. 操作

明细数量由 `record.details.length` 计算。`details` 为空时显示 `0`，该行不可展开。表格默认全部收起。

选择、编辑、删除均以主记录 `record.id` 为单位：

- 单选框每条主记录只显示一次。
- 全选只选择当前分页可见的主记录。
- 编辑和删除回调直接接收 `MaterialPackagingRelationRecord`。
- 展开或收起不改变选中状态。

### 子表

展开区域参考套包信息维护页面，在带边框容器内渲染可横向滚动的只读明细表。子表按接口顺序展示 `record.details`，不增加客户端排序。

子表列依次为：

1. 层级顺序
2. 包装层级编码
3. 包装层级名称
4. 规格编码
5. 规格名称
6. 数量
7. 单位
8. 包装类型
9. 箱标打印模板
10. 装箱单打印模板

字符串空值显示 `-`；`levelSequence` 缺失时显示 `-`；数量始终按数字展示，因此 `0` 必须显示为 `0`。

### 页面数据流

页面继续通过 `useMaterialPackagingRelationListQuery` 获取 `records`，并将其直接传入表格，不再构造 `tableRows`。

`selectedRelationIds`、当前页可见选中 ID 的过滤、批量删除目标计算和导出数据仍以 `records` 为来源。筛选、翻页或刷新后，只保留当前页仍存在的选中 ID，延续现有行为。

列表 loading、empty 和 error 处理、分页 `TotalCount`、表单 mutation 及成功反馈均保持不变。

## 组件与文件边界

- `material-packaging-relation-contract.ts`
  - 保留 API DTO、前端 record、detail 及映射函数。
  - 删除 `MaterialPackagingRelationTableRow` 和 `flattenMaterialPackagingRelationRows`。
- `material-packaging-relation-page.tsx`
  - 删除拍平数据的派生状态。
  - 将主记录传给表格，并使编辑、删除处理函数接收主记录。
  - 保持查询、选择、分页、CRUD、导入和导出状态边界不变。
- `material-packaging-relation-table.tsx`
  - 主表改为渲染 `MaterialPackagingRelationRecord`。
  - 通过 `DataTable` 展开插槽渲染只读子表。
- `zh-CN/common.ts`、`en-US/common.ts`
  - 增加“明细数量”/`Detail Count` 主表表头。
  - 复用现有明细字段文案，不新增重复 key。
- 测试
  - 新增表格组件级测试，页面测试只覆盖页面编排行为。

## 备选方案

### 主表默认全部展开

优点是无需点击即可看到明细。缺点是一页最多 20 条主记录时页面高度增长明显，主记录浏览效率下降，也与套包信息维护的默认收起行为不一致，因此不采用。

### 使用“查看明细”弹窗

优点是主表紧凑。缺点是增加一层操作和弹窗状态，无法在列表上下文中快速对比多条关系，并偏离现有主子表模式，因此不采用。

## 异常与边界行为

- `Details` 缺失或为 `null`：contract 映射为空数组，主表明细数量为 `0`，不显示展开按钮。
- `Details` 为空数组：行为同上。
- 明细字段为空字符串、`null` 或 `undefined`：沿用 contract 归一化，子表显示 `-`。
- 明细数量或其他字段变化：以最新列表查询结果为准，不在组件中缓存副本。
- 接口请求失败：继续由现有 Query 全局错误处理负责，不增加新的行内错误展示。

## 测试与验收标准

### 组件测试

- 两条主记录各自在主表中只渲染一行，不因多条 `details` 重复主记录。
- 主表明细数量分别等于各自的 `details.length`。
- 有明细的主记录显示展开入口，点击后展示全部明细字段，再次点击后收起。
- 无明细的主记录不显示展开入口，明细数量显示 `0`。
- 子表正确显示数量 `0`，空字符串字段显示 `-`。
- 展开与收起不改变主记录的选择状态。
- 单选、全选、编辑和删除回调均按主记录触发一次，并传递正确 ID 或 record。

### 页面测试

- 页面将查询返回的主记录直接交给表格。
- 编辑和删除仍打开对应主记录的现有流程。
- 批量选择和删除仍按关系 ID 去重。

### 验证命令

实现完成后执行：

```bash
pnpm exec vitest run src/features/mes/packaging/material-packaging-relation/material-packaging-relation-table.test.tsx
pnpm exec vitest run src/features/mes/packaging/material-packaging-relation/material-packaging-relation-page.test.tsx
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm --filter @repo/web test
```

定向表格测试、类型检查和 lint 必须通过。页面测试和全量 Web 测试需要与基线比较，不得新增失败。

## 已知基线缺口

在任何业务代码改动前，隔离 worktree 的基线验证结果如下：

- 定向运行物料包装关系页面、service 与通用 `DataTable` 测试：36 个测试中 34 个通过、2 个失败，并出现 1 个未处理 Promise rejection。
- 2 个失败均位于 `material-packaging-relation-page.test.tsx`，分别是列表错误 toast 和删除错误 toast 断言未收到调用。
- 全量 Web 测试：565 个测试中 542 个通过、23 个失败，并出现 8 个未处理错误。
- 用户已明确允许记录这些既有失败并继续。本次验收要求不增加失败数量或引入新的失败类型，不将修复既有错误通知问题纳入范围。

## 风险与控制

- 风险：删除拍平模型时遗漏页面或测试引用。
  - 控制：使用 `rg` 检查类型和函数引用，并运行 TypeScript 类型检查。
- 风险：子表字段多导致页面横向溢出。
  - 控制：展开内容使用独立横向滚动容器，保持主表布局稳定。
- 风险：选择与操作仍残留明细行语义。
  - 控制：表格 props 和回调统一使用 `MaterialPackagingRelationRecord`，通过组件测试验证回调次数和参数。
- 风险：既有测试失败掩盖新增回归。
  - 控制：新增独立表格测试；最终对定向和全量输出进行基线差异比较。

## 文档更新

- 本设计文档：`docs/specs/2026-07-10/material-packaging-relation-master-detail-table.md`。
- 实施前补充：`docs/plans/2026-07-10/material-packaging-relation-master-detail-table.md`。
- 本次不改变长期表格规范，因此无需修改 `AGENTS.md`、ADR 或表格通用规范。
