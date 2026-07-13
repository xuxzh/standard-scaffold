# DataTable 固定列不透明背景修复计划

> **执行要求：** 使用测试驱动方式逐步完成，先验证回归测试失败，再实施最小修复。

## 目标

修复 `DataTable` 左右固定列背景带透明度的问题，确保横向滚动时不会透出被覆盖列，同时保留现有斑马纹和悬停色的视觉浓度。

## 级别

- `L1`：单一通用组件内的局部样式缺陷，数据流、组件接口和业务行为均不变。

## 锚点

- 实现：`apps/web/src/components/data-table/data-table.tsx`
- 测试：`apps/web/src/components/data-table/data-table.test.tsx`
- 规范：`docs/ui/components/table-patterns.md`

## 假设

固定单元格当前复用 `bg-muted/30` 和 `group-hover/data-row:bg-muted/50`。Tailwind 的颜色透明度修饰符会生成带 alpha 的背景色，所以固定列覆盖普通列时会透出下层内容。

将背景色替换为由不透明 `--muted` 与 `--background` 通过 `color-mix` 合成的颜色，可以保持 30%/50% 的视觉混合比例，同时让最终背景保持不透明。

## 最小改动

### 1. 添加失败的回归测试

- [x] 修改 `apps/web/src/components/data-table/data-table.test.tsx`。
- [x] 断言奇数行固定单元格不再包含 `bg-muted/30`。
- [x] 断言固定单元格普通态和悬停态使用基于 `color-mix` 的不透明背景类。
- [x] 运行：

  ```bash
  pnpm --filter @repo/web exec vitest run src/components/data-table/data-table.test.tsx
  ```

- [x] 结果：新断言因当前仍使用透明背景类而失败。

### 2. 实施最小修复

- [x] 修改 `apps/web/src/components/data-table/data-table.tsx`。
- [x] 为 30% 斑马纹和 50% 悬停态定义复用的 `color-mix` 类名。
- [x] 行背景与固定单元格使用同一不透明斑马纹颜色，固定单元格悬停态使用不透明悬停色。
- [x] 不改动固定列位置、宽度、层级、列定义接口或展开行为。

### 3. 验证

- [x] 定向测试：

  ```bash
  pnpm --filter @repo/web exec vitest run src/components/data-table/data-table.test.tsx
  ```

- [x] Web 类型检查：

  ```bash
  pnpm --filter @repo/web typecheck
  ```

- [x] Web lint：

  ```bash
  pnpm --filter @repo/web lint
  ```

- [x] 检查最终 diff 仅包含计划、表格规范、`DataTable` 实现和对应测试。

## 非目标

- 不调整表格布局、固定列偏移或 z-index。
- 不修改业务页面的列定义。
- 不重构 `DataTable` 或基础 `Table` 组件。
- 不改变斑马纹与悬停态的大致视觉强度。

## 后续升级触发条件

如果 `color-mix` 无法被当前 Tailwind 构建识别，或实际浏览器验证发现主题变量包含透明通道，则升级评估全局语义色变量方案；本次不预先引入新的全局 token。
