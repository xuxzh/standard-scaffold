# Qiankun 嵌入样式修复总结

> 关联 commit（子应用 worktree `codex-qiankun-migration` 分支）：
> - `24c11a8` fix(web): declare all color tokens in micro-host style
> - `95d6d4a` fix(embed): wrap EmbedLayout with RouteActivityPortalScope
> - `da05027` fix(web): inject compiled stylesheet when embedded in qiankun
> - `2e54a48` chore(vite): default devHost to localhost for local debugging
>
> 关联 commit（父应用 worktree `codex-qiankun-migration` 分支）：
> - `cffdfdd12` chore: 修复 pnpm start:mes 运行时报错问题
>
> 修复日期：2026-07-03
> 修复者：codex agent + 用户协作
> 涉及 worktree：`/Users/xuxz/repos/ruihui/standard-scaffold/.worktrees/codex-qiankun-migration/`

把 `standard-scaffold/apps/web` 从 wujie 迁移到 qiankun 后，**子应用页面在父应用中能渲染，但样式与独立运行时不一致**。本次会话把整条样式链排查到底，最终定位到 **三个独立根因**（彼此叠加，按修复顺序逐一解决）。

本文档面向后续维护者：

1. 解释这三个根因是什么、为什么会出现
2. 给出已经落地的修复方案（commit + 代码位置）
3. 提供未来调试同样问题时的控制台验证脚本
4. 列出"哪些地方不能动 / 哪些地方改了会再炸"

---

## 现象

| 场景 | 期望 | 实际 |
|------|------|------|
| 独立运行 `http://localhost:5173/embed/packaging/packaging-type` | 正常显示 | 正常 |
| 嵌入到父应用 `http://localhost:4200` 后打开同一页面 | 与独立运行一致 | 表格内"编辑 / 删除"按钮退化成灰色无下划线 |
| 嵌入后打开"编辑类型"对话框 | 确认按钮蓝色填充 + 白色文字、重置按钮红色文字 | 退化成深色背景 + 黑色文字 |

控制台没有任何 JS 报错，只有"白屏"或"按钮颜色不对"的视觉问题。

---

## 三个根因（按发现顺序）

### 根因 1：Vite + Tailwind v4 在子模块加载下不生成完整的 `--color-*` 变量映射

**机制**：

- Vite 7 在 dev 模式下，CSS 模块走 `updateStyle(id, content)` 注入到 `<style data-vite-dev-id="...">` 标签
- **独立运行时**（直接打开 `http://localhost:5173/`），`import "./styles.css"` 是 ES module 入口依赖，Vite 把它当作"应用入口 CSS"，Tailwind v4 完整扫描源码，**生成所有 `--color-*` 变量映射 + 完整 utility class**
- **嵌入运行时**（qiankun 通过 `import-html-entry` 加载 main.tsx），`import "./styles.css"` 是动态 import 引入的**子模块**，Tailwind v4 不再把它当作入口 CSS 处理，**只生成被实际引用的 4 个 `--color-*` 变量**（`--color-primary`、`--color-destructive`、`--color-background`、`--color-foreground`）

**结果**：`.text-primary` 等 utility class 出现，**但** `var(--color-muted)`、`var(--color-accent)`、`var(--color-input)` 等被 hover / dark / sidebar 变体引用的变量**未定义**。这些 utility class 静默退化成"未指定颜色" → 继承自父应用 body 的 `color: rgba(0,0,0,0.85)`。

**控制台验证脚本**：

```js
(() => {
  const s = document.querySelector('style[data-vite-dev-id$="styles.css"]');
  if (!s) return {found: false};
  return {
    found: true,
    length: s.textContent.length,
    hasTextPrimary: s.textContent.includes('.text-primary'),
    hasTextDestructive: s.textContent.includes('.text-destructive'),
    hasBgMuted: s.textContent.includes('.bg-muted'),
    hasTextForeground: s.textContent.includes('.text-foreground'),
    colorVars: (s.textContent.match(/--color-[a-z-]+/g) || []).filter((v, i, a) => a.indexOf(v) === i)
  };
})()
```

**预期输出**（修复前）：
```js
{
  found: true,
  length: 106894,             // 完整 stylesheet
  hasTextPrimary: true,        // utility class 有
  hasTextDestructive: true,
  hasBgMuted: true,
  hasTextForeground: true,
  colorVars: [                 // 但变量只有 5 个
    "--color-amber-",
    "--color-sky-",
    "--color-black",
    "--color-white",
    "--color-foreground"
  ]
}
```

**修复**（commit `24c11a8`）：

在 `apps/web/src/main.tsx` 的 `buildMicroHostCss` 函数里，**手写完整 30+ 个 `--color-*` 变量映射到 `:root, :host`**，作为 `?inline` 编译产物残缺的补全。源代码位置：`apps/web/src/main.tsx:154-201`。

> 维护注意：将来如果 `@theme inline` 块（`apps/web/src/styles.css:6-78`）新增/删除 token，要**同步更新 `buildMicroHostCss` 里的 `themeTokens` 字面量**。建议加一条 lint 规则或在 styles.css 顶部加注释提醒。

---

### 根因 2：CSS Cascade Layer —— `@layer utilities` 输给父应用非 layered 规则

**机制**：

- Tailwind v4 把所有 utility class 编译进 `@layer utilities { ... }` 块内
- CSS Cascade 规范：**非 layered 规则永远赢过 layered 规则，与 specificity 无关**
- 父应用 ng-zorro 的 `body { color: rgba(0, 0, 0, 0.85) }` 是**非 layered** 规则
- 即使我们通过根因 1 修复了 `--color-*` 变量，`.text-primary` 仍在 `@layer utilities` 内，**输给** `body`

**控制台验证脚本**：

```js
(() => {
  const s = document.querySelector('style[data-vite-dev-id$="styles.css"]');
  const text = s?.textContent;
  return {
    length: text?.length,
    primaryIdx: text?.indexOf('.text-primary'),
    // utility class 确实在 stylesheet 里
    inLayer: text?.slice(Math.max(0, (text?.indexOf('.text-primary') ?? 0) - 30), text?.indexOf('.text-primary'))?.includes('@layer utilities')
  };
})()
```

**预期**：`inLayer: true` —— utility class 在 `@layer utilities` 内，必须拆层才能赢过父应用非 layered 规则。

**修复**（commit `da05027`，并在 `24c11a8` 里完善）：

在 `buildMicroHostCss` 里：

1. 用正则 `/@layer\s+utilities\s*\{([\s\S]*?)\n\}\s*$/` 提取 `@layer utilities` 块的**内容**（不带 `}` 收尾）
2. 用 `[data-qiankun] { ... }` 包装，**让 utility class 变成非 layered 规则**
3. 对 `color` / `background-color` / `background` / `border` / `border-color` / `fill` / `stroke` / `caret-color` / `outline-color` / `accent-color` / `column-rule-color` / `text-decoration-color` 这几个颜色相关属性加 `!important`，避免父应用可能的 `!important` 元素选择器

源代码位置：`apps/web/src/main.tsx:213-237`。

> **关于 `[data-qiankun]` 选择器**：父应用 `qiankun-wrapper.component.ts` 启用了 `experimentalStyleIsolation: true`，qiankun 会**自动**给子应用 mount 容器加上 `data-qiankun="<name>"` 属性。我们的 `[data-qiankun]` 选择器匹配"有这个属性"，不管值是什么。**不能改成精确匹配 `data-qiankun="scaffold-web"`**——qiankun 给每个子应用容器加的 name 来自父应用路由 data，是动态的。

---

### 根因 3：Radix UI Dialog 默认 portal 到 `document.body`，脱离 `[data-qiankun]` 容器

**机制**：

- shadcn/ui 的 Dialog / AlertDialog / Sheet 基于 Radix UI，Radix UI 的 `DialogPortal` 默认 portal 到 `document.body` 末尾
- 子应用有一个 `RouteActivityPortalScope` 组件，会提供 `useRouteActivityPortalContainer` context
- 嵌入页面走的是 `EmbedLayout`（`apps/web/src/components/layout/embed-layout.tsx`），**EmbedLayout 故意不接入 `RouteActivityCache`**（无 keep-alive 需求，注释明确说明）
- **但** EmbedLayout 同时也漏掉了 `RouteActivityPortalScope`——这个 scope 是独立于 RouteActivityCache 的，专门为 Dialog 提供 portal 容器
- 结果：Dialog 走默认行为 → portal 到 `document.body` → 整个对话框**脱离** `[data-qiankun]` 子树
- 我们注入的 `[data-qiankun] { .text-destructive { ... !important } }` 选择器**不会匹配**对话框里的 `.text-destructive`，按钮文字颜色继承自父应用 body

**控制台验证脚本**：

```js
(() => {
  // 1. 验证 Dialog 元素是否在 [data-qiankun] 子树内
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  // 2. 验证 RouteActivityPortalScope 提供的 fixed container 是否在
  const fixedHost = document.querySelector('[data-slot="route-activity-fixed-portal-host"]');
  return {
    dlgFound: !!dlg,
    dlgInQiankun: dlg?.closest('[data-qiankun]') !== null,
    hasFixedHost: !!fixedHost,
    fixedHostInQiankun: fixedHost?.closest('[data-qiankun]') !== null
  };
})()
```

**预期输出**（修复前）：
```js
{
  dlgFound: true,
  dlgInQiankun: false,         // 关键：Dialog 不在 [data-qiankun] 内
  hasFixedHost: false,         // EmbedLayout 没装 RouteActivityPortalScope
  fixedHostInQiankun: false    // 即使有，Dialog 也没用
}
```

**修复**（commit `95d6d4a`）：

在 `EmbedLayout` 里加 `RouteActivityPortalScope` 包装：

```tsx
// apps/web/src/components/layout/embed-layout.tsx
import { RouteActivityPortalScope } from "@/components/routing/route-activity-portal";

export function EmbedLayout() {
  return (
    <RouteActivityPortalScope>
      <main data-testid="embed-shell" className="...">
        <Outlet />
      </main>
    </RouteActivityPortalScope>
  );
}
```

`RouteActivityPortalScope` 提供两个 portal 容器（`route-activity-portal-host` + `route-activity-fixed-portal-host`），都在 `[data-qiankun]` 子树内。`DialogPortal` 优先用 `route-activity-fixed-portal-host`（用于 `position: fixed` 覆盖层），fallback 用 `route-activity-portal-host`（一般浮层）。

源代码位置：`apps/web/src/components/layout/embed-layout.tsx:19-39`。

> **设计权衡**：`EmbedLayout` 故意不接入 `RouteActivityCache` 是合理的设计（embed 页面无 keep-alive 需求）。但 `RouteActivityPortalScope` 是**独立**于 `RouteActivityCache` 的——它只提供 portal context。两者解耦，单独引入不会带来 keep-alive 行为。

---

## 关键代码改动汇总

### 子应用：3 个文件

| 文件 | 改动 | 关联根因 |
|------|------|----------|
| `apps/web/src/main.tsx` | 新增 `injectMicroHostStyles` 函数，在 qiankun `mount` 时把 `?inline` 编译产物提取 + 拆 layer + 加 `!important` + 注入完整 token 列表后写入 `<style id="scaffold-web-micro-host-styles">` | 根因 1、2 |
| `apps/web/src/components/layout/embed-layout.tsx` | `<main>` 外层包 `<RouteActivityPortalScope>` | 根因 3 |
| `apps/web/vite.config.ts` | `devHost` 默认值从 `192.168.0.135` 改为 `localhost`（让 `devOrigin` 与父应用 `scaffoldWebUrl: 'http://localhost:5173'` 匹配） | dev server 配套 |

### 父应用：0 个文件

本次样式修复**完全在子应用侧完成**。父应用无需任何改动。

---

## 完整控制台验证脚本（未来可复用）

### 1. 验证 utility class 是否在 stylesheet 里

```js
(() => {
  const s = document.querySelector('style[data-vite-dev-id$="styles.css"]');
  if (!s) return {found: false};
  return {
    found: true,
    length: s.textContent.length,
    hasTextPrimary: s.textContent.includes('.text-primary'),
    hasTextDestructive: s.textContent.includes('.text-destructive'),
    hasBgMuted: s.textContent.includes('.bg-muted'),
    hasTextForeground: s.textContent.includes('.text-foreground')
  };
})()
```

### 2. 验证 `:root` 上 CSS 变量是否被解析

```js
(() => {
  const el = document.querySelector('[data-testid^="packaging-type-edit-"]');
  return {
    btnComputedColor: getComputedStyle(el).color,
    rootPrimary: getComputedStyle(document.documentElement).getPropertyValue('--primary'),
    rootColorPrimary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary'),
    btnColor: getComputedStyle(el).getPropertyValue('color'),
    btnVarPrimary: getComputedStyle(el).getPropertyValue('--primary')
  };
})()
```

### 3. 验证 Dialog 挂载点

```js
(() => {
  const dlg = document.querySelector('[data-slot="dialog-content"]');
  const fixedHost = document.querySelector('[data-slot="route-activity-fixed-portal-host"]');
  return {
    dlgFound: !!dlg,
    dlgInQiankun: dlg?.closest('[data-qiankun]') !== null,
    hasFixedHost: !!fixedHost,
    fixedHostInQiankun: fixedHost?.closest('[data-qiankun]') !== null
  };
})()
```

### 4. 验证 button computed color

```js
(() => {
  const el = document.querySelector('button.text-destructive');
  if (!el) return {found: false};
  return {
    found: true,
    color: getComputedStyle(el).color,
    rootColorDestructive: getComputedStyle(document.documentElement).getPropertyValue('--color-destructive')
  };
})()
```

### 5. 验证我们注入的 style 标签

```js
(() => {
  const s = document.getElementById('scaffold-web-micro-host-styles');
  if (!s) return {found: false};
  return {
    found: true,
    length: s.textContent.length,
    hasColorPrimary: s.textContent.includes('--color-primary'),
    hasRootBlock: s.textContent.includes(':root, :host'),
    hasTextDestructive: s.textContent.includes('.text-destructive')
  };
})()
```

---

## 教训与未来注意点

### 哪些地方不能动

- **`apps/web/src/main.tsx` 的 `buildMicroHostCss`**：不要尝试"简化"或"重构"——它必须严格保留：拆 `@layer utilities`、加 `!important`、包 `[data-qiankun]`、注入完整 `themeTokens`。任何一项去掉都会让样式回归问题。
- **`apps/web/src/components/layout/embed-layout.tsx` 的 `RouteActivityPortalScope` 包装**：不要移除。如果未来为了精简 layout 而去掉，会重新触发根因 3。
- **父应用 `qiankun-wrapper.component.ts` 的 `experimentalStyleIsolation: true`**：这个标志确保子应用容器有 `data-qiankun` 属性，整个修复体系依赖它。**不要改成 `false`**。
- **父应用 `qiankun-wrapper.component.ts` 的 `container: this.qiankunContainer.nativeElement`**：必须是子应用路由树内的真实 DOM 元素，不能改成 `document.body`。

### 子应用新增 utility class 时

如果新 class 引用 `--color-*` 变量（通过 Tailwind v4 编译），需要确认：

1. 该 `--color-*` 变量在 `apps/web/src/styles.css` 的 `@theme inline` 块里有映射
2. 该映射在 `apps/web/src/main.tsx` 的 `themeTokens` 字面量里也有一份

如果只在 `@theme inline` 加而忘了同步 `themeTokens`，嵌入运行时新 class 会解析失败（继承色）。

### 子应用新增 portal 组件时

任何用 `Dialog / AlertDialog / Sheet / Popover / DropdownMenu / Tooltip / Select` 等 Radix UI 组件的代码，都会通过 portal 渲染。**确认**：

1. 页面所在的 layout（`EmbedLayout` 或 `AdminLayout`）**包了** `RouteActivityPortalScope`
2. 如果新加了一个独立 layout（比如 `MobileLayout`），记得也包这个 scope

### 父应用调整 ng-zorro 主题时

ng-zorro 的 `body { color: ... }` / `body { font-family: ... }` 会通过 CSS 继承链渗透到子应用。我们用 `[data-qiankun] { color: var(--color-foreground) !important }` 重置了 `color`，但 `font-family`、字号等**没有**重置。如果未来 ng-zorro 改了 body 的 `font-family`，子应用字体会跟着变。**改 ng-zorro 主题前先评估是否会通过继承影响子应用**。

### 升级 Vite 或 Tailwind 时

- Vite 升级可能改变 `?inline` 模式的输出格式（带不带 `export default "..."` 包装）。如果 `microHostStylesCss` 解析逻辑不再适用，需要适配。
- Tailwind v4 升级可能改变 `@theme inline` 的处理（是否自动生成 utility class、cascade layer 行为）。**主战场是 CSS Cascade Layer 规范**——这是浏览器标准，不会变。

---

## 验证清单（修复完成时核对）

每次修改 `main.tsx` 或 `embed-layout.tsx` 后，按这个清单核对：

- [ ] 强刷父应用（Cmd+Shift+R）→ 表格"编辑 / 删除"按钮是蓝色 / 红色带下划线
- [ ] 打开"编辑类型"对话框 → "重置"按钮红色文字、"确认"按钮蓝色填充 + 白色文字
- [ ] 跑控制台验证脚本 1 → `hasTextPrimary/Destructive/BgMuted` 全为 `true`
- [ ] 跑控制台验证脚本 2 → `btnComputedColor` 是蓝色（`oklch(0.6512 0.191 252.8)`）而不是黑色
- [ ] 跑控制台验证脚本 3 → `dlgInQiankun: true` 且 `fixedHostInQiankun: true`
- [ ] 跑控制台验证脚本 5 → `hasColorPrimary`、`hasRootBlock`、`hasTextDestructive` 全为 `true`

---

## 变更记录

| 日期 | 变更 | 作者 |
|------|------|------|
| 2026-07-03 | 创建本文档，记录 `codex-qiankun-migration` 分支上的样式问题排查与修复过程 | codex agent + 用户协作 |
