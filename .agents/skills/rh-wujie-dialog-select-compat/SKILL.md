---
name: rh-wujie-dialog-select-compat
description: '解决 Wujie 子应用环境中 Dialog 内嵌 Select 的 pointer-events 兼容问题。覆盖场景：Dialog 里使用 Select、子应用环境弹层交互异常、切换下拉选项后弹窗失去点击能力、节点被错误加上 pointer-events: none、弹层锁死无法操作。提到「Wujie 子应用 Dialog Select 兼容」「Dialog 里 Select 点不动」「子应用弹窗点不动」「pointer-events: none 修复」「弹层锁死」「下拉切换后弹窗失灵」时立即触发。'
---

# RH Wujie 子应用 Dialog / Select 兼容

本 skill 用于处理 Wujie 子应用里 Dialog 与 Select 组合使用时出现的 pointer-events 锁死问题。本质是通用弹层链路在子应用环境下偶发失真，**不要在单个业务页面零散修补，应回通用弹窗层统一处理 + 全局样式兜底**。

---

## 触发条件

只要任务涉及下面任一情况，先看这份复盘：

- 弹窗里使用 `Select`
- 子应用环境里的弹层交互异常
- 切换下拉选项后弹窗失去点击能力
- 页面样式里出现错误的 `pointer-events: none`

详细复盘、根因分析与最佳修复方案见：

- `references/wujie-dialog-select-pointer-events.md`

---

## 快速决策表

| 症状 / 排查信号                                                              | 结论                                  | 行动                                              |
| ---------------------------------------------------------------------------- | ------------------------------------- | ------------------------------------------------- |
| 浏览器 DevTools 看到 dialog 内容节点被加上 `pointer-events: none`            | Wujie 子应用环境弹层链路偶发失真      | 不要在业务页打补丁，回到通用弹窗层修              |
| 仅在子应用环境出现，主应用正常                                               | 与 Wujie + shadow DOM 容器关系有关    | 走"组件统一修 + 样式兜底"两层方案                 |
| 单纯 z-index 调高仍然点不动                                                 | 挂载点 / 定位错误，非 z-index 问题    | 改排查方向，先查挂载点                            |
| Radix DismissableLayer 在 shadow DOM 内把内部点击误判为外部点击并拦截事件   | `event.target` 被 retarget 为宿主     | 用 `composedPath()` 判断真实点击路径              |
| 切换 Select 选项后页面整体 scroll 跳到顶部                                   | Wujie iframe 内 remove-scroll 副作用  | 见 Select 滚动快照保护小节                        |
| Wujie 容器里 `position: fixed` 弹层位置偏移                                 | 容器 transform 改变 fixed 参照系      | `[data-radix-popper-content-wrapper]` 改 absolute |

---

## 排查顺序

1. **先确认环境**：是不是 Wujie 子应用环境（宿主 + shadow DOM）。
2. **再看组合**：是不是 `Dialog` 里嵌套了 `Select`。
3. **再查样式**：浏览器 DevTools 检查弹窗内容节点是否被加了 `pointer-events: none`。
4. **修复优先级**：先回通用弹窗层统一修，再用全局样式兜底；**不要在业务页单独补 `pointer-events: auto`**。
5. **最后查页面状态**：排除业务自身的事件 / 状态链路问题。

---

## 修复原则（速记）

**两层方案，缺一不可：**

### 1. 样式层兜底（全局 CSS）—— 必须落地

仅在子应用环境下，对以下两个类名强制保证可点击：

- `.rh-dialog-content`
- `.rh-alert-dialog-content`

并把 Radix Popper 的 `position: fixed` 改为 `absolute`，修复 Wujie 容器 transform 导致的定位偏移。

**这部分是 CSS 级别的通用修复，不依赖任何具体组件库，可直接复制使用。**

### 2. 组件内部统一修（弹窗层组件）—— 按需适配

- 用 `MutationObserver` 监控弹窗内容节点本身
- 一旦发现子应用环境里弹窗内容被错误加上 `pointer-events: none`，立即恢复为可交互
- 用 `composedPath()` 拦截 `onInteractOutside` / `onPointerDownOutside`，修复 shadow DOM 内点击 retarget 误判
- Wujie 环境下强制 `modal={false}`，跳过 `react-remove-scroll` / `focus-scope` 的副作用

**这部分因项目弹窗组件封装方式而异。** 下面"示例参考"章节给出一种基于 Radix UI 的具体写法，**不要原样照搬到目标项目**——按需调整 hook 挂载点、className 命名、事件拦截位置。

---

## 反模式（严禁）

| 反模式                                                | 正确做法                                  |
| ----------------------------------------------------- | ----------------------------------------- |
| 在某个业务页面里手动删 `pointer-events: none` 样式    | 改通用弹窗层组件或全局 CSS                |
| 每个表单页都各自补一段 `pointer-events: auto`         | 改全局 CSS 只兜底弹窗内容容器             |
| 只改当前页面，不动通用弹窗层                          | 改一次让所有页面受益                      |
| 把问题归因到页面状态管理，忽略弹层组合本身            | 回到 Wujie + Dialog + Select 链路根因     |
| 只调 z-index 不查挂载点                               | 先查挂载点，再查定位算法，最后才查 z-index |
| 用 `event.target` 判断 Radix 弹层内 / 外点击          | 用 `composedPath()` 穿透 shadow boundary  |
| 把示例代码原样复制到组件结构不同的项目                | 按目标项目弹窗封装调整 hook 挂载点        |

---

## 可移植补丁：全局 CSS（直接复制）

> **使用前提**：项目里有 Radix / 类似弹窗组件，并且运行在 Wujie 子应用环境。CSS 类名 `.rh-dialog-content` / `.rh-alert-dialog-content` 需与项目里弹窗组件挂载的实际 className 对应（如果项目类名不同，全局替换即可）。

写入 `src/index.css`（或同等入口样式文件）：

```css
/* ===========================================================
 * Wujie 微前端兼容 · 弹窗 / 下拉补丁
 * 适用：作为 Wujie 子应用运行时
 * 目的：修复 Dialog 内嵌 Select 时偶发的 pointer-events 锁死、
 *       Radix Popper 在 transform 容器内的 fixed 偏移、
 *       remove-scroll 副作用导致 body 滚动锁定异常
 * =========================================================== */

/* —— 1. 滚动锁定兜底 —— */
html body[data-scroll-locked] {
  --removed-body-scroll-bar-size: 0 !important;
  margin-right: 0 !important;
}

html[data-wujie='true'] body[data-scroll-locked] {
  overflow: visible !important;
  overscroll-behavior: auto !important;
}

/* —— 2. 弹窗内容区域强制可交互（Wujie 下兜底） —— */
/* 注：.rh-dialog-content / .rh-alert-dialog-content 为项目弹窗组件挂载的 className，
   若目标项目用其他类名，把这里对应替换即可。 */
html[data-wujie='true'] .rh-dialog-content,
html[data-wujie='true'] .rh-alert-dialog-content {
  pointer-events: auto !important;
}

/* —— 3. Radix Popper 在 Wujie 容器内改用 absolute，避开 transform 参照系 —— */
[data-radix-popper-content-wrapper] {
  position: absolute !important;
}
```

### CSS 落地说明

| 块                     | 作用                                                                          | 是否必须保留 `html[data-wujie='true']` 作用域 |
| ---------------------- | ----------------------------------------------------------------------------- | ------------------------------------------ |
| 第 1 块 `body[data-scroll-locked]` | `react-remove-scroll` 给 body 加的内联滚动条占位、滚动锁定需要兜底 | 视项目而定；Wujie 下建议保留              |
| 第 2 块 `.rh-*-content`            | 弹窗内容节点被错误加 `pointer-events: none` 时强制可交互                  | 建议保留；非 Wujie 项目可去掉前缀全局生效  |
| 第 3 块 `[data-radix-popper-content-wrapper]` | Radix Popper 容器改 absolute，避开 transform 参照系                 | 仅 Radix 项目需要；非 Radix 项目删除       |

> **类名替换约定**：目标项目的弹窗 Content className 如果不是 `rh-dialog-content` / `rh-alert-dialog-content`，把第 2 块的类名替换为目标项目实际挂载的类名即可，逻辑不变。

---

## 示例参考：弹窗层组件适配代码（按需调整）

> **⚠️ 本节是参考实现，不是可直接复制的补丁。**
> 目标项目的弹窗组件封装（是否基于 Radix、用什么 hook、挂什么 className）可能完全不同。下面三段代码给出的是"基于 Radix UI 的 React 封装"这一种实现路径，用于说明"组件层统一修"具体长什么样。**迁移时请按目标项目的弹窗组件结构改写 hook 挂载点、事件拦截位置和 className 名称，不要原样复制。**

### 环境探测 + 两个修复 hook（参考）

```tsx
import * as React from 'react';

/** 检测是否运行在 Wujie 微前端子应用环境中 */
function isInWujie(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!(window as unknown as Record<string, unknown>).__POWERED_BY_WUJIE__
  );
}

/**
 * 思路：react-remove-scroll 在模态框打开时会给 document.body 添加
 * pointer-events: none。Wujie 中 body 被代理为 shadow host，
 * 整个 shadow DOM 会一起失活。用 MutationObserver 守 body style。
 */
function useWujieBodyPointerEventsFix() {
  React.useEffect(() => {
    if (!isInWujie()) return;
    const body = document.body;
    const restore = () => {
      if (body.style.pointerEvents === 'none') {
        body.style.removeProperty('pointer-events');
      }
    };
    const observer = new MutationObserver(restore);
    observer.observe(body, { attributes: true, attributeFilter: ['style'] });
    restore();
    return () => observer.disconnect();
  }, []);
}

/**
 * 思路：Radix 叠层链路偶发把 pointer-events: none 打到弹窗 content 上。
 * 直接守 content 节点本身。
 */
function useWujieContentPointerEventsFix(
  contentRef: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (!isInWujie()) return;
    const restore = () => {
      const node = contentRef.current;
      if (node?.style.pointerEvents === 'none') {
        node.style.setProperty('pointer-events', 'auto');
      }
    };
    const observer = new MutationObserver(restore);
    const node = contentRef.current;
    if (node) {
      observer.observe(node, { attributes: true, attributeFilter: ['style'] });
    }
    restore();
    return () => observer.disconnect();
  }, [contentRef]);
}
```

### Dialog 适配思路（参考 Radix UI 实现）

**关键改造点**（迁移到非 Radix 项目时按对应概念改写）：

1. `DialogRoot` 在 Wujie 下用 `modal={false}`，跳过 remove-scroll 和 focus-scope 的副作用
2. `DialogContent` 渲染时挂上对应 className（这里用 `rh-dialog-content`），并在 mount 时调用 `useWujieBodyPointerEventsFix` + `useWujieContentPointerEventsFix`
3. `onInteractOutside` / `onPointerDownOutside` 用 `composedPath()` 判断真实点击路径，修复 shadow DOM 的 retarget 误判

```tsx
function DialogRoot({ modal, ...props }) {
  return (
    <DialogPrimitive.Root
      modal={isInWujie() ? false : (modal ?? true)}
      {...props}
    />
  );
}

const DialogContent = React.forwardRef((props, ref) => {
  const { className, onInteractOutside, onPointerDownOutside, ...rest } = props;
  const contentRef = React.useRef(null);

  useWujieBodyPointerEventsFix();
  useWujieContentPointerEventsFix(contentRef);

  const handleOutside = (e) => {
    if (isInWujie() && contentRef.current) {
      const path = e.detail?.originalEvent?.composedPath?.() ?? [];
      if (path.includes(contentRef.current)) {
        e.preventDefault();
        return;
      }
    }
    /* 调用原 onInteractOutside / onPointerDownOutside */
  };

  return (
    <DialogPrimitive.Content
      ref={contentRef}
      className={['rh-dialog-content', className].filter(Boolean).join(' ')}
      onInteractOutside={onInteractOutside && handleOutside}
      onPointerDownOutside={onPointerDownOutside && handleOutside}
      {...rest}
    />
  );
});
```

### AlertDialog 适配思路（参考 Radix UI 实现）

要点同 Dialog：

1. `AlertDialogContent` 挂上对应 className（`rh-alert-dialog-content`）
2. 调用两个修复 hook
3. `onPointerDownOutside` 用 `composedPath()` 拦截
4. 如果 AlertDialog 在 Wujie 下也出现 modal 副作用，可参考 Dialog 给 Root 加 `modal={isInWujie() ? false : ...}`

> 注：实际项目的 AlertDialog Root 是否需要同样处理，取决于具体封装——上面的 DialogRoot 改造仅适用于 Radix Dialog，**AlertDialogPrimitive 类型上故意 Omit 了 `onInteractOutside` prop**，迁移时按目标项目的 props 调整。

### Select 滚动快照注意点

`Dialog` 里嵌 `Select` 时，除了 Dialog 侧的三件套之外，Select 侧需要单独处理滚动快照。原因：

- Wujie iframe 内，Radix Select 打开时会触发 `react-remove-scroll` 给 body 加 `overflow: hidden`，导致整页 scroll 跳到顶部。
- 上面 CSS 第 1 块的 `overflow: visible !important` 兜底能解决大部分场景。
- 如果仍出现滚动跳变，需要在 Select 的 Root 上捕获打开瞬间的滚动位置，在关闭后还原（snapshot/restore 模式）。

snapshot/restore 的完整实现涉及 Select 组件的完整封装（~300 行），不在本 skill 的主补丁范围内，按需单独迁移。

---

## 落地自检清单

迁移到另一个项目后，逐项确认：

**CSS 部分（必做）**

- [ ] CSS 第 1 块（滚动锁定兜底）已写入项目入口样式文件
- [ ] CSS 第 2 块（`.rh-*-content` 强制可交互）的类名已替换为目标项目弹窗组件的实际 className
- [ ] CSS 第 3 块（Popper 改 absolute）已写入；非 Radix 项目按需删除

**组件层（按需）**

- [ ] 环境探测 `isInWujie()` 已实现
- [ ] 弹窗 Content 渲染时挂上了"等价于 rh-dialog-content / rh-alert-dialog-content"的 className
- [ ] 弹窗 Content mount 时调用了 `useWujieBodyPointerEventsFix` + `useWujieContentPointerEventsFix`（或同等作用的 MutationObserver 守 body / content）
- [ ] 弹窗 onInteractOutside / onPointerDownOutside 用 `composedPath()` 拦截（Radix 类项目）
- [ ] 弹窗 Root 在 Wujie 下用 `modal={false}`（如项目用的弹窗库有 modal 概念）

**功能验证**

- [ ] 在子应用里打开 Dialog → 打开 Select → 切换选项 → 确认 Dialog 仍可点击
- [ ] 在子应用里点击 Dialog 内部空白处，确认不会因为 shadow DOM retarget 被误关闭
- [ ] 在子应用里打开 Select，确认页面 scroll 不会跳到顶部

---

## 关联资源

- 完整问题复盘：`references/wujie-dialog-select-pointer-events.md`
- 弹窗内浮层挂载与定位规范：`rh-ui-spec` skill（弹窗内浮层挂载与定位规范章节）
- Wujie 全局样式兜底参考：`rh-ui-spec` skill（第 13 节 微前端兼容 / Wujie）