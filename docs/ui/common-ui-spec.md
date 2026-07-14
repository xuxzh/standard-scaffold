# 通用页面 UI 规范

## 通用

- 如果不是特殊说明，所有二级界面都使用**弹窗(对话框)**的方式展示；
- 所有敏感操作，如删除/关闭/禁用等，都需要弹出二次确认，让用户确认后再执行
- 所有敏感操作按钮（删除、批量删除、禁用/停用等）统一使用红色警示样式：
  - 表格行内操作按钮（如行级删除/禁用）：使用 `variant="link"` 配合 `className="text-destructive"`，与编辑按钮保持一致的 link 形态；
  - 工具栏/页面级操作按钮（如批量删除）：使用 `variant="destructive"`，以实心红色按钮呈现
  - 侧边栏/标题行内的轻量清除按钮（如清空已选物料、清除已选筛选项）：使用 `variant="ghost"` 配合 `className="text-destructive hover:bg-destructive/10 hover:text-destructive"`，在保持低调视觉的同时用红色文字提示"清空当前选择"语义，避免与新增类操作混淆
- 所有异步操作,如接口调用，都需要添加 loading(体现在按钮/表格/表单)，并根据情况确定是否需要同步显示**toast**信息；
- toast 的状态语义色使用全局 token 统一映射：`success -> --success`、`info -> --info`、`warning -> --warning`、`error -> --destructive`，如需文字与边框适配应优先使用对应 `--*-foreground`；

## 主题 token（对齐 Ant Design v4）

### 颜色

Light mode 主题色已经 byte-perfect 对齐 Ant Design v4 的 Less 变量，存于 `styles.css :root`：

- `--primary` / `--primary-hover` / `--primary-active` → `#1890ff` / `#40a9ff` / `#096dd9`（AntD v4 `@primary-color` / `@primary-5` / `@primary-7`）
- `--destructive` → `#ff4d4f`（AntD v4 `@error-color`，注意 v4 取 `red-5` 而非 `red-6`）
- `--destructive-hover` / `--destructive-active` → `#ff7875` / `#d9363e`
- `--warning` / `--success` / `--info` → `#faad14` / `#52c41a` / `#1890ff`
- `--warning-bg` / `--success-bg` / `--info-bg` → `#fffbe6` / `#f6ffed` / `#e6f7ff`（AntD v4 `colorWarningBg` / `colorSuccessBg` / `colorInfoBg` 的 step-1 tint）

颜色在 `:root` 中以 OKLCH 三元组形式存储，视觉色与 hex 完全等价（单点 OKLCH 转换 deltaE < 1）。`styles.css` 仍然是唯一定义源；其他模块必须通过 `bg-primary` / `text-destructive` / `border-warning-bg` 等 utility class 引用，禁止在组件里直接写 hex / oklch / rgb。

暗色模式保留 v5-seed 暗色主色 `#1668dc`（保留既有 `dark.less` 决策），仅 surface / border / muted 校准到 v4 暗色面板值：`--background ≈ #000`、`--card ≈ #141414`、`--popover ≈ #1f1f1f`、`--border ≈ #434343`。

### 几何与字号

| 维度 | 值 | 对应 AntD v4 token |
|---|---|---|
| 基圆角 | `--radius: 2px` | `@border-radius-base` |
| 圆角级联 | `rounded-sm = 0`、`rounded-md = 0`、`rounded-lg = 2px`、`rounded-xl = 6px`（使用 `max(0px, ...)` 防负值） | — |
| 控件默认高 | `h-8`（32px）：Button default、Input、Select trigger、CommandInput wrapper、AlertDialogAction/Cancel | `@height-base: 32px` |
| 控件小 | `h-6`（24px）：Button xs、Select sm、InputGroupButton xs/icon-xs | `@height-sm: 24px` |
| 控件大 | `h-10`（40px）：Button lg | `@height-lg: 40px` |
| 全局基字号 | `body { @apply text-sm }` → 14px | `@font-size-base: 14px` |
| 遮罩 | `--mask: rgb(0 0 0 / 0.45)`，Dialog/AlertDialog/Sheet overlay 用 `bg-[var(--mask)]` | `@mask-bg` |
| 高度锚点 | `--height-sm/base/lg` 三个命名锚点（24/32/40px）用于文档意图，不直接生成 utility | 同上 |

### 显式不做（不强行对齐 v4）

为避免破坏性变更或跨 scope 重构，以下 AntD v4 形态**故意未对齐**：

- **Button variant API**：`default / destructive / outline / secondary / ghost / link` 保持项目命名。映射约定为 项目 `default` ≈ AntD `primary`、项目 `ghost` ≈ AntD `text`，是已有约定，**不重命名**。
- **Tabs 默认形态**：仍是 shadcn pill，需要 line + ink bar 风格用 `variant="line"`。
- **Sidebar**：宽度（`16rem` / `18rem` / `3rem`）、菜单行高、折叠宽度保持项目默认值。
- **Table**：header `#fafafa` 背景、分割线、选中行颜色保持现状。需要更深的视觉重构，留到后续 spec。
- **Dialog**：不引入 header/body/footer 之间的 hairline 分隔线（项目惯例是连通的 grid 布局）；不改为 v4 的 100px 顶部定位，保持居中。
- **Shadow**：不引入 `--shadow-2` / `--border-split` token。继续复用 Tailwind `shadow-sm/md/lg`。
- **暗色主色**：保留 `#1668dc`，不改为 v4 `dark.less` 的 `#1890ff`。

按钮变体应优先使用上述 token 的 hover/active 状态（`bg-primary-hover` / `bg-primary-active` / `bg-destructive-hover` / `bg-destructive-active` / `bg-warning-bg` / `bg-success-bg` / `bg-info-bg`），避免再次引入透明度模拟。

## 表单

- 查询表单默认不显示可见 label：输入类控件使用 placeholder 表达字段语义；没有 placeholder 的控件（如 select）需提供 `aria-label` 等可访问名称；

## 按钮

- 所有的按钮都需要搭配合适的图标。
- 项目全局针对相同语义的按钮应统一使用同一组 `lucide` 图标，避免同义操作在不同页面出现不一致的视觉表达。
- 常用按钮语义与图标映射见 `button-icon-mapping.md`；如需新增语义，优先复用现有模式，再补充映射文档。

## 表格

- 表格加载数据时默认要显示`loading`
