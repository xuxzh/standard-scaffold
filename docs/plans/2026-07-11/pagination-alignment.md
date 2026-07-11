# 全局对话框分页样式统一实施计划

## 背景与目标

列表主页面已统一使用共享 `DataTablePagination`（左侧「共计 X 条，选中 Y 条」汇总，右侧首页/数字页码/末页/每页条数下拉）。但 4 处对话框内表格各自手写了简化分页（仅上一页/下一页/页码文本），与通用样式不一致（用户在 `material-picker-field` 中发现该现象）。

目标：将这 4 处全部改为复用 `DataTablePagination`，做到全局分页样式一致；启用「每页条数」下拉；单选场景左侧显示「选中 N 条」（picker 恒为 0）。变更级别 `L2`（跨文件、改动共享组件 `DataPickerDialog`、调整查询 hook 数据流）。

## 涉及范围

| 组件 | 现状 | 改造 |
|------|------|------|
| `components/data-picker/data-picker-dialog.tsx` | `DialogFooter` 手写上一页/下一页/返回 + total/page 文本 | `DataTablePagination` + 返回按钮；`pageSize` 状态化 |
| `.../material-packaging-relation/material-packaging-relation-material-dialog.tsx` | 内联分页条（单选 radio，`DataTable`） | `DataTablePagination` |
| `.../material-packaging-relation/material-packaging-relation-rule-dialog.tsx` | 内联分页条（单选，原生 `<table>`） | `DataTablePagination` |
| `.../packaging-kit/packaging-kit-material-dialog.tsx` | 内联分页条（单/多选，`DataTable`） | `DataTablePagination` |

## 实施步骤

1. 数据层：给 `useMaterialOptionsQuery`、`usePackagingRuleOptionsQuery`、`usePackagingKitMaterialOptionsQuery` 增加**尾部可选 `pageSize` 参数**（默认取原 `*PageSize` 常量），并纳入对应 query key。尾部可选是为了让 sidebar 等既有调用零改动。
2. `DataPickerDialog`：`pageSize` 由固定 prop 改为 `useState`（初值取 prop）；footer 替换为 `DataTablePagination`（`selectedCount={0}`）+ 返回按钮；从 `DataPickerDialogMessages` 移除 `previousPage/nextPage/page/total` 字段；同步删除 `material-picker-dialog.tsx` 中对应 messages 传参。
3. 三个 packaging 对话框：新增 `pageSize` 状态；把内联分页 `<div>` 换成 `DataTablePagination`；`selectedCount` 单选取 `selectedCode ? 1 : 0`、多选取 `currentSelectedCodes.length`；删除各自 `canGoNext`；`onPageSizeChange` 中重置 `pageIndex=1`；rule 对话框原生表格的行号与分页把硬编码 `20` 替换为 `pageSize`。
4. i18n：删除改用通用 `common.pagination.*` 后作废的 key（zh-CN/en-US 同步）——`materialPicker`、`packagingKit` 的 `previousPage/nextPage/states.page/(total)`、以及 material/rule 对话框的 `selected/noneSelected`、packaging-kit 的 `materialDialog.selectedCount`。**保留**仍被 `material-packaging-relation-material-sidebar.tsx` 使用的 `materialPackagingRelation.states.page` 与 `actions.previousPage/nextPage`。
5. 测试：`data-picker-dialog.test.tsx` 初始化 i18n（`import "@/i18n/config"`）并补一条分页渲染断言。

## 接口与规则

- `DataTablePagination` 契约不变：`pageIndex`（1 基）、`pageSize`、`totalCount`、`selectedCount?`、`onPageIndexChange`、`onPageSizeChange?`、`loading?`。总页数由组件内部按 `totalCount/pageSize` 计算，故对话框不再自算 `canGoNext`。
- 查询 hook 的 `pageSize` 参数放在参数列表末尾且带默认值，不改变既有正向调用；query key 追加 `pageSize` 维度以保证按页大小正确缓存。
- 单选对话框左侧文案由「已选：{code}」调整为通用「选中 N 条」；具体选中项仍由 radio 勾选态与「确认」按钮禁用逻辑体现，无功能损失。
- 不新增依赖，不改动服务端分页契约、页码起始值与选中状态生命周期。

## 验收命令

```bash
pnpm --filter @repo/web exec vitest run src/components/data-picker/data-picker-dialog.test.tsx src/components/data-table/data-table-pagination.test.tsx
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

手动核对：打开 material picker、material-packaging-relation 的物料/规则选择、packaging-kit 主/子物料选择，确认左侧「共计/选中」、右侧数字页码与每页条数下拉，切换每页条数会重新查询并回到第 1 页，选择/确认行为与改造前一致。

## 备注

本分支基线（`main` HEAD）已存在 7 个与本次无关的失败测试（notify/toast 与 packaging-kit 渲染）及 `lib/notify.ts` 的 2 个 lint error；将本次改动 stash 后运行同样为 `7 failed | 50 passed`，确认本次改造未引入回归。
