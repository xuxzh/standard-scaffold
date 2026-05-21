# shadcn-admin Web 框架初始化设计

日期：2026-05-21

## 目标

在保留当前 `pnpm + turbo` monorepo 结构的前提下，为 `apps/web` 初始化一个基于 `shadcn/ui` 和 `shadcn-admin` 风格的后台应用框架。

首版需要具备以下能力：

- 使用 `shadcn/ui` 作为基础组件体系
- 使用 `TanStack Router` 建立可扩展的页面路由
- 提供后台布局壳，包括侧边栏、顶部栏和内容区
- 提供至少一个壳内页面和一个可脱离后台壳单独访问的示例页面
- 保持与现有 monorepo 目录和脚本兼容

## 约束

- 不新增独立的 `apps/admin`
- 不替换整个仓库为外部模板
- 不接入真实后端接口
- 不实现鉴权
- 不完整复刻 `shadcn-admin` 的所有页面
- 不在本次初始化阶段强行把所有 `shadcn` 组件抽到 `packages/ui`

## 现状

当前仓库已经具备以下基础：

- 根目录 workspace 和 Turbo 脚本已存在
- `apps/web` 是一个最小 Vite React 应用
- `packages/ui` 是一个轻量共享组件包

因此，本次工作不是从零创建新项目，而是在现有 `apps/web` 上完成后台框架初始化和结构升级。

## 技术方向

- 包管理器：pnpm
- 任务编排：Turborepo
- Web 应用：Vite、React 19、TypeScript
- 路由：TanStack Router
- UI：shadcn/ui
- 样式：Tailwind CSS
- 图标：Lucide React

## 方案选择

本次采用以下方案：

- 保留 monorepo，不新增 `apps/admin`
- 在 `apps/web` 内接入 `shadcn/ui`、Tailwind 和 TanStack Router
- 借鉴 `shadcn-admin` 的布局组织方式，但只实现初始化所需的最小后台壳
- 把 `shadcn` 生成和改造后的组件先保留在 `apps/web/src/components/ui`

## 目录设计

`apps/web/src` 计划调整为以下职责分层：

- `components/ui`：shadcn 基础组件
- `components/layout`：侧边栏、顶部栏等布局相关组件
- `routes`：TanStack Router 路由定义和页面入口
- `lib`：工具函数，例如 `cn`
- `styles` 或全局样式入口：Tailwind 和应用级样式

这个结构的目标是先把应用层搭起来，后续再评估哪些组件应沉淀到 `packages/ui`。

## 布局设计

首版提供两类访问形态：

- 后台壳页面：页面内容包裹在 `AdminLayout` 中，带侧边栏和顶部栏
- 独立页面：页面不经过后台壳，直接以单独路由访问

这样可以同时满足后台系统主流程和你提出的“示例页面可单独访问，不包含菜单栏/标题栏”的要求。

## 路由设计

首版至少包含以下路由：

- `/`：重定向到 `/dashboard`
- `/dashboard`：后台首页，使用后台壳
- `/examples/embedded`：后台壳内示例页
- `/examples/standalone`：独立示例页，不带后台壳

路由将使用布局路由组织，而不是把全部逻辑塞进单个 `App.tsx`。

## UI 范围

本次初始化包含：

- 全局主题样式和 Tailwind 基础配置
- `Button`、`Card`、`Input` 等首屏需要的基础 `shadcn` 组件
- 后台导航与页面容器
- 1 到 2 个演示页面

本次不包含：

- 图表、数据表格、表单校验等复杂业务组件
- 权限、角色、菜单动态配置
- 多主题高级定制

## 共享包策略

当前 `packages/ui` 先保留，不做大规模重构。

原因如下：

- `shadcn-admin` 风格组件在初始化阶段会更贴近具体应用
- 先把后台框架跑通，能减少过早抽象带来的返工
- 后续如果某些组件在多个应用中复用，再迁移到共享包更合理

## 验证方式

初始化完成后，需要至少验证：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

如依赖尚未安装，则先执行 `pnpm install`。

## 成功标准

当以下条件都满足时，认为本次初始化完成：

- `apps/web` 成功接入 `shadcn/ui` 和 Tailwind
- 应用从单页入口升级为路由驱动结构
- 后台主布局可正常访问
- 独立示例页可不经过后台壳直接访问
- lint、typecheck、build 全部通过
