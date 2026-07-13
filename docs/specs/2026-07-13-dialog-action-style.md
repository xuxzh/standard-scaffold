# Dialog 操作按钮样式优化

## 目标

- 将 Dialog 的进入全屏和退出全屏图标分别替换为 Lucide `Expand` 和 `Shrink`。
- 按参考截图调整右上角全屏与关闭操作区的静态视觉；去除 hover 视觉变化，仅保留 pointer cursor 和键盘 focus 反馈。

## 级别

- `L1`：单一基础组件内的局部视觉调整，不改变 Dialog 对外接口或状态模型。

## 锚点

- 实现：`apps/web/src/components/ui/dialog.tsx` 的 `DialogContent` 操作区。
- 测试：`apps/web/src/components/ui/dialog.test.tsx`。

## 假设

- 截图红框仅用于标注目标区域，不属于最终 UI。
- 参考截图表达的是透明、无边框的操作按钮；全屏图标使用主题主色，关闭图标使用破坏性语义色。
- 当前全屏切换、关闭、可访问性文案和键盘 focus 行为保持不变。

## 方案

继续复用现有 shadcn `Button`，不新增全局 variant：

- 操作区保持绝对定位，只定向调整顶部、右侧间距和按钮间距。
- 两个按钮均使用 `ghost` variant，去掉关闭按钮的实心红色背景。
- 图标使用项目既有的 `lucide-react`；全屏状态映射为 `Expand` / `Shrink`，关闭仍使用 `X`。
- 使用项目语义色 `text-primary` 和 `text-destructive`，不引入硬编码颜色。
- 使用局部尺寸类复刻截图中的大图标，不修改全局 Button 尺寸定义。

## 最小改动

- 先在现有 Dialog 测试中增加图标与操作区样式断言，并确认测试因旧实现而失败。
- 仅修改 `dialog.tsx` 的图标导入、操作区布局类、按钮 variant 和局部图标样式，使新增断言通过。

## 验证

- `pnpm --filter @repo/web test -- src/components/ui/dialog.test.tsx`
  - 预期：Dialog 定向测试全部通过。
- `pnpm --filter @repo/web typecheck`
  - 预期：Web TypeScript 类型检查通过。
- `pnpm --filter @repo/web lint`
  - 预期：Web lint 通过。

## 非目标

- 不调整 Dialog 尺寸、标题区、遮罩、动画或全屏状态逻辑。
- 不修改共享 Button variants，不影响 Dialog 之外的按钮。
- 不新增依赖，不修改 i18n 文案。

## 后续升级触发条件

- 如果复刻需要新增全局设计令牌、修改 Button 公共 API，或影响多个基础组件，则升级为 `L2` 并补充正式实施计划。
