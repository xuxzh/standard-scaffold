# DataTable 表格与分页器视觉优化实施计划

## 目标

在不改动基础 `ui/table.tsx` 和服务端分页契约的前提下，为通用 `DataTable` 增加 Excel 式网格与斑马纹，并将 `DataTablePagination` 调整为左侧统计、右侧分页控件的布局。

## 实施步骤

1. 先在 `data-table.test.tsx` 中增加网格线、奇偶行、固定列背景和展开行奇偶计算测试，确认新测试失败后修改 `data-table.tsx` 至通过。
2. 先在 `data-table-pagination.test.tsx` 中增加统计文案、数字页码窗口、省略号、导航与页大小测试，确认新测试失败后修改 `data-table-pagination.tsx` 至通过。
3. 为 `DataTablePaginationProps` 增加可选的 `selectedCount?: number`，默认为 `0`；在中英文资源中增加统计、数字页码和页大小文案。
4. 将六个现有包装维护页面的 `selectedRows.length` 传入分页器，并在包装类型页面测试中验证选中数量。
5. 运行定向 Vitest、Web typecheck、lint 与 `pnpm verify:web`；最后在 `/packaging/packaging-type` 验证宽屏、窄屏、横向滚动、固定列和选中状态。

## 接口与规则

- 左侧统计数字使用 primary 背景和 primary-foreground 文字，其余统计文字使用默认前景色。
- 分页右侧顺序固定为：首页、上一页、数字页码、下一页、末页、每页条数；不再显示“第 x/y 页”。
- 总页数不超过 6 时显示全部页码；超过 6 时始终单独显示末页，末页前最多显示 5 个连续页码，被跳过的前后范围使用不可点击省略号表示。
- 主数据偶数行使用 `bg-muted/30`；展开行和状态行不参与奇偶计算；固定列始终与所属主行背景一致。
- 不新增依赖，不修改页码起始值、请求参数或选中状态生命周期。

## 验收命令

```bash
pnpm --filter @repo/web exec vitest run src/components/data-table/data-table.test.tsx src/components/data-table/data-table-pagination.test.tsx
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm verify:web
```
