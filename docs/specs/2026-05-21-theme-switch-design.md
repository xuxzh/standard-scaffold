# Web 主题切换设计

日期：2026-05-21

## 目标

为 `apps/web` 增加一个可复用的主题切换能力，满足当前后台壳页面的深浅色切换需求，并为后续“整套主题色方案”扩展预留清晰的状态层和样式层边界。

首版需要具备以下能力：

- 支持 `light`、`dark`、`system` 三种模式
- 在 `AppHeader` 提供主题切换入口
- 使用下拉菜单呈现主题选项
- 在浏览器端持久化用户选择
- 在 `system` 模式下跟随操作系统颜色偏好
- 不破坏当前基于 CSS token 的样式体系

## 非目标

本次不包含以下内容：

- 新增多套品牌主题或颜色预设
- 改造现有 CSS token 的命名体系
- 对所有页面做额外视觉重设计
- 为独立页面单独提供不同的主题策略
- 引入重量级主题库替代当前样式体系

## 现状

当前 `apps/web` 已具备主题切换所需的大部分样式基础：

- `src/styles.css` 中已经定义了 `:root` 和 `.dark` 两套 token
- 现有组件已经通过 `bg-background`、`text-foreground`、`border-input` 等语义化 token 消费样式
- 顶部栏 `AppHeader` 已有右侧操作区，适合加入主题切换入口

当前缺失的部分主要有：

- 没有全局主题状态管理
- 没有在根元素切换 `dark` class 的机制
- 没有用户主题选择的持久化逻辑
- 没有在 UI 中暴露主题切换入口

## 方案选择

本次采用“自建轻量 `ThemeProvider`”方案，而不是引入通用主题库。

原因如下：

- 当前项目是 Vite + React，直接自建上下文层与现有结构最贴合
- 需求范围很明确，状态和副作用都较小，没有必要为了少量逻辑引入额外依赖
- 自建方案更容易精确控制 `localStorage`、`matchMedia`、根元素 class 和未来扩展点
- 后续如果要增加 `themePreset` 或品牌主题，可以沿用相同 provider 扩展，不需要推翻实现

## 架构设计

新增一个全局 `ThemeProvider` 放在 `App` 顶层，包裹整个路由树。

`ThemeProvider` 负责管理两个概念：

- `themeMode`：用户显式选择的模式，值为 `light | dark | system`
- `resolvedTheme`：当前真正生效的主题，值为 `light | dark`

二者的关系如下：

- 当 `themeMode` 为 `light` 或 `dark` 时，`resolvedTheme` 直接等于该值
- 当 `themeMode` 为 `system` 时，`resolvedTheme` 根据 `matchMedia("(prefers-color-scheme: dark)")` 计算

应用样式仍然完全依赖现有 CSS token，不新增平行样式体系。主题切换的核心动作只是统一对根元素切换 `dark` class，并同步设置浏览器原生 `color-scheme`。

## 组件设计

首版新增或修改以下组件：

- 新增 `src/components/theme/theme-provider.tsx`
- 视需要新增 `src/components/theme/theme-toggle.tsx`
- 新增 `src/components/ui/dropdown-menu.tsx`
- 修改 `src/root-app.tsx`，将路由包裹进 `ThemeProvider`
- 修改 `src/components/layout/app-header.tsx`，接入主题切换入口

各组件职责如下：

- `ThemeProvider`：管理状态、持久化、副作用和对外上下文接口
- `useTheme()`：供业务组件读取 `themeMode`、`resolvedTheme` 和 `setThemeMode`
- `ThemeToggle`：仅负责渲染按钮和菜单，不持有主题业务状态
- `DropdownMenu`：为当前主题切换提供最小可复用下拉菜单封装，风格与现有 Radix 组件保持一致
- `AppHeader`：只负责在右侧操作区挂载 `ThemeToggle`

## 交互设计

主题切换入口位于 `AppHeader` 右侧操作区。

交互形式为小号 `outline` 按钮，点击后弹出下拉菜单，包含三个选项：

- 浅色
- 深色
- 跟随系统

交互要求如下：

- 当前选中的模式在菜单中要有明确的选中态
- 当 `themeMode` 为 `system` 时，按钮图标展示 `resolvedTheme` 对应的明暗状态，让用户知道当前实际显示效果
- 点击选项后立即生效，并关闭菜单
- 键盘导航、聚焦与无障碍行为优先复用 Radix 默认能力

## 数据流设计

初始化流程如下：

1. `ThemeProvider` 启动时先读取 `localStorage`
2. 如果读取到合法值，则作为当前 `themeMode`
3. 如果没有值或值非法，则回退为 `system`
4. 根据 `themeMode` 计算 `resolvedTheme`
5. 将结果同步到 `document.documentElement`

状态更新流程如下：

1. 用户在 `ThemeToggle` 中选择一个模式
2. `ThemeToggle` 调用 `setThemeMode(nextMode)`
3. `ThemeProvider` 更新 `themeMode`
4. provider 重新计算 `resolvedTheme`
5. provider 更新根元素 `dark` class 和 `color-scheme`
6. provider 将 `themeMode` 写入 `localStorage`

当 `themeMode` 为 `system` 时，还需要监听系统主题变化，并在变化时刷新 `resolvedTheme` 与根元素状态。

## 持久化与异常处理

持久化策略如下：

- 使用单独的 `localStorage` key 保存模式，例如 `app-theme-mode`
- 保存的是用户选择值本身，而不是解析后的 `resolvedTheme`
- 当值为 `system` 时，仍然存入 `"system"`

异常与边界处理如下：

- `localStorage` 读写失败时静默降级，不影响页面继续渲染
- 读取到非法值时回退到 `system`
- 在没有 `window` 或没有 `matchMedia` 的环境里，`system` 默认解析为 `light`
- 仅在 `themeMode === system` 时监听系统偏好变化，减少无意义监听

## 可扩展性设计

本次实现虽然只支持模式切换，但 provider 的结构按未来可扩展为“模式 + 主题预设”设计。

后续如果要支持整套主题色或品牌皮肤，可以在不破坏首版接口的前提下扩展为：

- `themeMode`：控制明暗模式
- `themePreset`：控制主题预设，例如 `default`、`blue`、`green`、`brand-x`

扩展时可以通过以下方式演进：

- 在根元素增加类似 `data-theme="blue"` 的属性
- 在 CSS 中为不同 preset 覆盖一组 token
- 在同一主题菜单中增加“主题色方案”子分组

这样可以避免未来把“明暗切换”和“主题色切换”拆成两套互相独立的状态系统。

## 测试与验证

本次只增加聚焦价值较高的验证，避免堆砌低价值测试。

建议覆盖以下内容：

- `ThemeProvider` 初始化时能从 `localStorage` 读取合法模式
- 非法值会回退到 `system`
- 切换模式时会正确更新根元素 `dark` class
- `system` 模式下能根据 `matchMedia` 结果解析 `resolvedTheme`
- `AppHeader` 中能看到主题切换入口，并触发对应模式更新

除了自动化测试，还需要运行以下验证：

- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web lint`
- `pnpm --filter @repo/web typecheck`

如涉及新增依赖，再补充一次安装与构建验证。

## 成功标准

当以下条件都满足时，认为本次主题切换功能完成：

- 后台页面顶部存在主题切换入口
- 用户可在浅色、深色、跟随系统之间切换
- 刷新页面后仍保留用户上次选择
- `system` 模式能响应系统主题变化
- 当前 CSS token 体系无需重写即可正确随主题切换
- 验证命令通过，且无新增明显诊断错误
