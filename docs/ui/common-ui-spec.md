# 通用页面 UI 规范

## 通用

- 如果不是特殊说明，所有二级界面都使用**弹窗(对话框)**的方式展示；
- 所有敏感操作，如删除/关闭/禁用等，都需要弹出二次确认，让用户确认后再执行
- 所有敏感操作按钮（删除、批量删除、禁用/停用等）统一使用红色警示样式：
  - 表格行内操作按钮（如行级删除/禁用）：使用 `variant="link"` 配合 `className="text-destructive"`，与编辑按钮保持一致的 link 形态；
  - 工具栏/页面级操作按钮（如批量删除）：使用 `variant="destructive"`，以实心红色按钮呈现
- 所有异步操作,如接口调用，都需要添加 loading(体现在按钮/表格/表单)，并根据情况确定是否需要同步显示**toast**信息；
- toast 的状态语义色使用全局 token 统一映射：`success -> --success`、`info -> --info`、`warning -> --warning`、`error -> --destructive`，如需文字与边框适配应优先使用对应 `--*-foreground`；

## 主题 token（对齐 Ant Design v4）

主题色与 Ant Design v4 对齐，`styles.css` 是唯一定义源。新增/调整的 token：

- `--primary` / `--primary-hover` / `--primary-active`：分别对应 `#1890ff` / `#40a9ff` / `#096dd9`（暗色模式主色为 `#1668dc`，hover 提亮到 `#3c9ae8`）
- `--destructive-hover` / `--destructive-active`：与 `--destructive` 同族，分别对应 `#ff7875` / `#d9363e`
- `--warning-bg` / `--success-bg` / `--info-bg`：轻量背景色，对应 Ant Design v4 的 `colorWarningBg` / `colorSuccessBg` / `colorInfoBg`
- `--radius` 已从 `0.75rem`（12px）调整为 `0.375rem`（6px），`sm/md/lg/xl` 由 `calc(--radius ± n)` 自动重算

新增 token 已映射为 Tailwind utility：`bg-primary-hover` / `bg-primary-active` / `bg-destructive-hover` / `bg-destructive-active` / `bg-warning-bg` / `bg-success-bg` / `bg-info-bg`。

按钮变体应优先使用上述新 token 的 hover/active 状态，避免再次引入透明度模拟。

## 表单

- 查询表单默认不显示可见 label：输入类控件使用 placeholder 表达字段语义；没有 placeholder 的控件（如 select）需提供 `aria-label` 等可访问名称；

## 按钮

- 所有的按钮都需要搭配合适的图标。
- 项目全局针对相同语义的按钮应统一使用同一组 `lucide` 图标，避免同义操作在不同页面出现不一致的视觉表达。
- 常用按钮语义与图标映射见 `button-icon-mapping.md`；如需新增语义，优先复用现有模式，再补充映射文档。

## 表格

- 表格加载数据时默认要显示`loading`
