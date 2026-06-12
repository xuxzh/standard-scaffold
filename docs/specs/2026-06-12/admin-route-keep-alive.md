# 包装管理路由 Keep-Alive Spec

日期：2026-06-12

## 背景

当前六个包装管理路由分别直接渲染 `AdminLayout` 和对应页面。路由切换会卸载页面组件树，导致筛选条件、分页、行选择、展开状态、滚动位置、弹窗及未提交表单草稿丢失。

React Query 只能保留远程数据缓存，无法恢复页面组件和 DOM 状态。本功能需要提供类似 Angular 路由复用和 Vue KeepAlive 的页面实例保留能力。

## 任务级别

- `L2`
- 涉及路由树、应用壳层生命周期和多个包装页面的表单初始化行为。

## 目标

- 在普通后台模式下缓存以下固定路由：
  - `/packaging/packaging-type`
  - `/packaging/packaging-level`
  - `/packaging/packaging-spec`
  - `/packaging/packaging-kit`
  - `/packaging/packaging-rule`
  - `/packaging/material-packaging-relation`
- 页面第一次访问后保留其 React 状态、DOM、滚动位置、弹窗和未提交表单草稿。
- 切换到仪表盘、示例或调试页面后，已访问的包装页面仍在后台会话中保留。
- 退出后台布局、登出或刷新浏览器后清空缓存。
- 未访问的包装页面不提前挂载或请求数据。

## 非目标

- 不缓存 `/embed/packaging/*` 路由。
- 不跨浏览器刷新持久化。
- 不支持动态参数路由、多实例缓存、LRU、关闭缓存页签或手动清理 API。
- 不引入第三方 KeepAlive 依赖。
- 不改变 React Query 当前 `staleTime: 30_000` 配置。

## 设计

### 持久后台布局

新增 pathless authenticated admin 父路由，在父路由的 `beforeLoad` 中统一执行 `requireAuth`，并只挂载一次 `AdminLayout`。仪表盘、普通示例、调试页和六个包装页都作为其子路由。

`AdminLayout` 仍只负责侧边栏、顶栏和内容区域布局。缓存行为放在独立的路由宿主组件中。

### Activity 缓存宿主

使用 React 19.2 官方 `<Activity>` 维护已访问页面：

```ts
type RouteActivityDefinition = {
  cacheKey: string;
  pathname: string;
  component: ComponentType;
};
```

宿主通过当前精确 pathname 查找缓存定义：

- 首次命中时，将定义加入已访问集合并挂载页面。
- 当前页面使用 `mode="visible"`。
- 其他已访问页面使用 `mode="hidden"`。
- 非缓存路由渲染 TanStack Router 的 `<Outlet />`，缓存页面保持 hidden。
- pathname 是唯一缓存键，search 参数变化不创建新实例。

`<Activity>` 隐藏时保留状态和 DOM，并清理 Effects；恢复时重新建立 Effects。缓存宿主不自行实现 DOM 搬运或组件序列化。

### Portal 隔离

Radix Dialog、Sheet、Select、Popover、DropdownMenu、Tooltip 和 AlertDialog 默认将 Portal 挂载到 `body`，不属于 Activity 隐藏的 DOM 子树。为每个缓存页面增加独立 Portal 宿主，并通过内部 Context 让项目 UI 封装优先将 Portal 挂载到当前缓存页面的宿主。

- Activity 隐藏页面时，页面主体和其 Portal 内容一并隐藏。
- 恢复页面时复用原有 Portal DOM 和组件状态。
- 非缓存页面及缓存宿主外的组件继续使用 Radix 默认 `body` 容器。
- 显式传入 Portal `container` 时，调用方配置优先于 Activity 宿主。

### 表单会话初始化

若表单使用普通 `useEffect` 在 `open/record` 变化时执行 `reset()`，Activity 恢复 Effect 时可能覆盖未提交草稿。

新增内部 Hook，根据会话键控制初始化：

- 新增会话键为 `create`。
- 编辑会话键为 `edit:<recordId>`。
- 弹窗从关闭变为打开，或已打开时会话键变化，执行一次初始化。
- Activity 隐藏和恢复不得重复初始化同一打开会话。
- 弹窗真正关闭后，再次打开时重新初始化。
- 异步配置值只初始化当前会话一次，后续后台刷新不得覆盖草稿。

该约束应用于包装类型、包装层级、包装套件、包装规则和物料包装关系表单。包装规格继续使用当前稳定 React key 管理表单会话。

### 数据刷新

恢复页面后继续沿用 React Query 当前行为。超过 `staleTime` 的查询可以后台刷新，但刷新不得重置页面交互状态或未提交表单草稿。

异步提交在页面隐藏后可以继续完成，结果在页面恢复时正常反映。

## 风险与约束

- Radix Portal 封装必须完整接入 Activity 专属容器，并验证隐藏时内容不可见、恢复后状态仍保留。
- 表单 reset Effect 是主要兼容风险，必须通过 Hook 单元测试和页面集成测试覆盖。
- 路由改为共享父布局后，现有登录重定向、独立路由和 embed 鉴权行为必须保持不变。

## 验收标准

- 六个包装页之间及包装页与其他后台页之间切换后，页面状态完整恢复。
- 打开的弹窗及未提交草稿在返回页面后保持。
- 页面隐藏期间不会显示其 Portal overlay 或阻止当前页面交互。
- 未访问的缓存页不挂载。
- 登出后重新登录不恢复上一会话缓存。
- `/embed/packaging/*` 继续不渲染后台壳层，也不进入缓存宿主。
- Web 测试、类型检查、lint、构建和受影响 E2E 通过。
