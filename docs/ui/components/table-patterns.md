# Web 表格实现规范

本文档记录 `apps/web` 中表格和数据列表的默认实现方式。除非具体任务有明确理由，否则新表格优先沿用这里的组合。

## 默认技术选型

- 表格外观使用 `apps/web/src/components/ui/table.tsx` 中的 shadcn Table 原子组件。
- 表格渲染和行模型使用 `@tanstack/react-table`。
- 通用基础展示优先使用 `apps/web/src/components/data-table` 中的 `DataTable`。
- 业务列定义放在页面或 feature 附近，不写入通用 `DataTable`。

## 组件边界

`DataTable` 只负责这些通用能力：

- 表头和单元格渲染
- 默认显示的序号列；确有需要时可通过 `rowNumber={false}` 关闭
- 左右固定列；普通业务列通过 `ColumnDef.meta.pinned` 声明固定方向
- loading、empty 等基础状态行
- 主子表格展开入口和展开内容插槽
- TanStack Table 的基础 row model

以下能力暂不放进首版通用表格：

- 业务操作菜单
- 业务筛选表单
- 排序、筛选、分页的具体 UI
- 服务端请求、错误归一化或数据清洗

这些能力应由 route、feature service 或页面级组件装配。等多个页面出现稳定重复模式后，再沉淀为更小的可复用子组件。

## 固定列

固定列基于 TanStack Table 的 Column Pinning 能力实现，`DataTable` 只负责把固定状态转换为 sticky 样式。

- 普通业务列需要固定时，在列定义的 `meta.pinned` 中设置 `"left"` 或 `"right"`。
- 选择列统一使用 `id: "select"`，默认左固定。
- 操作列统一使用 `id: "actions"`，默认右固定。
- 序号列由 `DataTable` 内部维护，固定列 id 为 `__rowNumber`，默认左固定。
- 选择列、序号列和操作列的固定方向由 `DataTable` 强制维护，不通过业务列配置改动。

## 主子表格

主子表格优先使用 `DataTable` 的 `getRowCanExpand` 和 `renderExpandedRow`。

- 子内容是详情摘要时，直接在 `renderExpandedRow` 中渲染详情块。
- 子内容也是表格时，可以在展开区域内组合另一个 `DataTable`。
- 展开按钮只出现在可展开行上，不要给无子数据的行渲染空操作。

## 后续排序、筛选和分页

后续增加排序、筛选、分页时，应先判断数据规模和接口形态：

- 小数据、纯前端展示：可使用 TanStack Table 的客户端 row model。
- 远程列表：优先使用服务端排序、筛选、分页，并通过 TanStack Router search params 保存可分享状态。

不要混用服务端分页和客户端排序/筛选，否则用户看到的可能只是当前页局部排序或局部筛选。

## 测试要求

通用表格测试应优先断言用户可见行为：

- 表头和单元格是否按列定义渲染
- loading 和 empty 状态是否互斥
- 可展开行是否能展开并显示子内容
- 不可展开行是否不暴露展开按钮

## 表格布尔列显示规范

表格中的布尔列是只读展示场景，默认只表达“该字段是否为真”，不承载筛选项、表单字段或状态标签里的业务动作语义。

适用范围：

- 页面表格列的 boolean 单元格渲染。
- 与页面表格列对应的数据导出列值。

显示约定：

- 中文环境统一显示“是” / “否”。
- 英文环境统一显示 `Yes` / `No`。
- 列头继续表达字段业务含义，例如“循环包装”“启用状态”“虚拟主件”；单元格只显示布尔结果。

多语言 key 约定：

- 表格布尔值使用页面级 table key：`pages.<feature>.table.<field>True` / `pages.<feature>.table.<field>False`。
- 不要复用 `filters.options.*`、`filters.status*`、`form.*` 或其它带筛选、表单、业务状态语义的 key。
- 导出列与页面表格列必须使用同一套 `table.*True/*False` key，避免表格和导出文案不一致。

示例：

```typescript
// i18n resource
pages: {
  packagingType: {
    table: {
      isRecyclable: "循环包装",
      isRecyclableTrue: "是",
      isRecyclableFalse: "否",
    },
  },
}

// table cell
cell: ({ row }) =>
  row.original.isRecyclable
    ? t("pages.packagingType.table.isRecyclableTrue")
    : t("pages.packagingType.table.isRecyclableFalse"),

// export column
value: (row) =>
  row.isRecyclable
    ? t("pages.packagingType.table.isRecyclableTrue")
    : t("pages.packagingType.table.isRecyclableFalse"),
```

与筛选表单的职责分离：

- 筛选表单继续按 `docs/standards/web-filter-form-guidelines.md` 管理，boolean 下拉项可以使用 `filters.options.true` / `filters.options.false` 承载业务语义，例如“启用/禁用”“循环包装/非循环包装”。
- 即使筛选项当前也显示“是/否”，表格列也不要直接复用筛选项 key；两类 UI 场景的 key 路径必须独立，避免后续调整筛选文案时影响表格展示。

反模式：

```typescript
// 不要复用筛选项 key
row.original.isEnabled
  ? t("pages.packagingSpec.filters.options.true")
  : t("pages.packagingSpec.filters.options.false")

// 不要复用表单 key
row.original.isVirtualMain
  ? t("pages.packagingKit.form.virtualMainTrue")
  : t("pages.packagingKit.form.virtualMainFalse")

// 不要在代码里硬编码中英文展示文案
row.original.isRecyclable ? "是" : "否"
```
