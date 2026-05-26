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
- loading、empty 等基础状态行
- 主子表格展开入口和展开内容插槽
- TanStack Table 的基础 row model

以下能力暂不放进首版通用表格：

- 业务操作菜单
- 业务筛选表单
- 排序、筛选、分页的具体 UI
- 服务端请求、错误归一化或数据清洗

这些能力应由 route、feature service 或页面级组件装配。等多个页面出现稳定重复模式后，再沉淀为更小的可复用子组件。

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

