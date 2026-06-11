# Dialog 全屏控制设计

## 目标

为 `apps/web/src/components/ui/dialog.tsx` 的通用 `DialogContent` 增加默认显示的全屏切换按钮，并调整右上角关闭按钮样式。弹窗默认保持现有非全屏尺寸和行为。

## 任务级别

- `L1`
- 变更集中在通用 Dialog 组件、通用文案资源和对应组件测试。

## 设计

### 交互行为

- `DialogContent` 默认显示全屏切换按钮和关闭按钮。
- 弹窗初始为非全屏状态，继续使用调用方传入的尺寸、最大宽高、圆角和定位样式。
- 点击全屏按钮后，弹窗铺满整个视口，四周不留间距，并取消圆角、最大宽高限制和居中位移。
- 全屏状态下按钮切换为退出全屏图标；再次点击后恢复调用方原有样式。
- 关闭弹窗后，组件卸载时不保留全屏状态。

### 组件 API

- 新增 `showFullscreenButton?: boolean`，默认值为 `true`。
- 保留现有 `showCloseButton?: boolean`，默认值和关闭行为不变。
- 不增加受控全屏状态 API；当前需求没有外部控制或状态持久化场景。
- 不使用浏览器 Fullscreen API，避免进入系统全屏、权限和 `Escape` 行为差异。

### 视觉与可访问性

- 两个操作按钮位于弹窗右上角，使用一致的点击区域、hover 和 focus 样式。
- 关闭按钮改为清晰的常态图标，不再依赖低透明度表达次要操作。
- 使用 `lucide-react` 的全屏、退出全屏和关闭图标。
- “全屏”“退出全屏”“关闭弹窗”通过 `common` i18n namespace 同时提供 `zh-CN` 和 `en-US` 文案。
- 按钮使用翻译文案作为无障碍名称，并通过 `aria-pressed` 表达全屏切换状态。

## 测试

新增 `DialogContent` 组件测试，覆盖：

- 默认渲染全屏按钮和关闭按钮，且弹窗初始不是全屏。
- 点击全屏按钮后应用全屏状态，再次点击后恢复。
- `showFullscreenButton={false}` 时不渲染全屏按钮。
- `showCloseButton={false}` 的现有行为不回归。
- 点击关闭按钮仍会关闭 Dialog。

最小验证命令：

```bash
pnpm --filter @repo/web test -- dialog.test.tsx
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

## 非目标

- 不修改 `AlertDialog`。
- 不为单个业务弹窗定制全屏布局。
- 不增加拖拽、缩放、记忆上次全屏状态或浏览器级全屏。
- 不调整 Dialog 的 overlay、动画和 Radix 打开关闭语义。

## 升级触发条件

如果实现发现调用方的 Tailwind 类无法被通用全屏状态稳定覆盖，或业务弹窗需要受控全屏状态，则升级为 `L2`，补充正式实施计划后再扩大 API。
