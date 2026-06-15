# 接入 wujie：以 `apps/web` 作为 MES `/scaffold-web` 子应用

> 变更等级：**L2**（跨子应用边界 + 修改启动入口 + 新增共享上下文 + 修改构建配置）
> 关联主应用变更：`rh-standard-product-platform/apps/rh-mes-frontend`
> 关联用户计划：`~/.claude/plans/rh-standard-product-platform-apps-rh-me-melodic-feigenbaum.md`

## 1. Context

MES 主应用（`rh-mes-frontend`）已经搭好了 wujie 微前端基建：

- `WujieWrapperComponent` 在 `setupApp` / `startApp` 时把 host 上下文塞进 `props.hostContext`；
- `afterMount` / `activated` 主动通过 `__WUJIE.bus.$emit('host:context-sync', ctx)` 推送一次；
- 主应用登录或语言切换时调用 `WujieHostContextService.notifyHostContextChanged()` 触发再次推送。

但 `apps/web` 目前是独立 React 19 + Vite SPA，不识别 wujie 沙箱，也不知道如何消费这些数据。本次接入要让 `apps/web` 在 MES `/scaffold-web` 路由下作为 wujie 子应用运行，并通过一个内部 `HostContextProvider` 把 host 数据吐给 React 组件树。

## 2. 决策摘要

| 项 | 值 |
|---|---|
| Wujie 子应用 name | `scaffold-web` |
| 子应用 URL | `http://192.168.0.135:6024`（由 MES 端 `environment.scaffoldWebUrl` 配置） |
| MES 路由路径 | `ScaffoldWeb/scaffold-web` |
| 子应用内部路由 | wujie 模式下走 `createMemoryHistory({ initialEntries })`，复用 `App({ initialEntries })` 已有缝隙 |
| 是否动 packaging 旧路由 | 不动（避免影响线上） |
| 是否做 i18n 桥接 | 不做（标记后续 TODO） |

## 3. 子应用侧改动

### 3.1 新增 `src/lib/host-context/`

| 文件 | 职责 |
|---|---|
| `host-context-types.ts` | 镜像 host 的 `WujieHostContext` 接口；导出 `HOST_CONTEXT_EVENT = 'host:context-sync'` |
| `host-context-source.ts` | 纯函数：`readInitialHostContext()` 读 `window.__WUJIE?.props?.hostContext`；`subscribeHostContext(fn)` 绑定 `__WUJIE.bus.$on/$off`；`isRunningInWujie()` |
| `host-context-provider.tsx` | `HostContextProvider`，用 `useSyncExternalStore` + 模块级 `cachedSnapshot` 缓存，保证 `getSnapshot` 引用稳定 |
| `use-host-context.ts` | `useHostContext()` hook，包装 `useContext(HostContext)` |
| `index.ts` | barrel：显式 named export |

设计要点：
- standalone 模式下 `subscribeHostContext` 返回 no-op，hook 返回 `defaultValue` 不报错；
- `cachedSnapshot` 引用只在 bus push 时变化，避免 React `getSnapshot should be cached` 警告；
- 不在子应用 bundle 里引入 `wujie` 包，仅用最小结构类型描述全局；
- 不与 `useSyncExternalStoreWithSelector` 耦合，需要选择器优化时再引入。

### 3.2 改写 `src/main.tsx`

通过 `window.__POWERED_BY_WUJIE__` 检测沙箱：

- standalone：保留原 `enableApiMocking().then(render)` 流程；
- wujie：暴露 `__WUJIE_MOUNT__` / `__WUJIE_UNMOUNT__`，首次脚本执行时也渲染一次（应对 wujie 不同 `exec` 配置下的执行顺序差异），渲染时把 `[location.pathname + location.search]` 作为 `initialEntries` 传入 `<App>`。

`currentRoot` 在模块级保留，让 `__WUJIE_UNMOUNT__` 能调 `root.unmount()` 释放 React 状态。每次 mount 重新调 `createRoot(rootEl)`，应对 wujie remount 时 DOM 重建。

MSW 在 wujie 路径下不启动 —— 主应用代理的是真实后端，MSW 会遮蔽真实流量。

### 3.3 修改 `src/root-app.tsx`

只在最外层包一层 `<HostContextProvider>`，原 4 层 provider 顺序（`I18nProvider → ThemeProvider → QueryClientProvider → RouterProvider + Toaster`）不动，遵循 CLAUDE.md 约束。

放在最外层的好处：query function、theme、route guard 都能 `useHostContext()`，且未来加 i18n bridge 时不需要再调顺序。

### 3.4 修改 `vite.config.ts`

- `server.host: true` —— 绑定 0.0.0.0，让 MES 浏览器从另一台机器能拉到资源；
- `server.cors: true` + `headers.Access-Control-Allow-Origin: '*'`、`Methods`、`Headers` —— wujie 跨域加载 HTML/JS/CSS 必须；
- `server.origin: VITE_DEV_ORIGIN ?? 'http://192.168.0.135:5173'` —— 强制 Vite 产出绝对资源 URL；
- `server.hmr.host` / `hmr.clientPort` —— HMR WebSocket 从 iframe 内连回 dev server；
- `port: VITE_DEV_PORT ?? 5173` + `strictPort: true` —— 端口可经 env 覆盖，避免与本机其他进程冲突；
- proxy 配置不变，仍按 `DEV_API_PROXY_ENABLED` 开关。

注意：`server` 块从原来的"按 `devProxyEnabled` 条件创建整块对象"重构为"始终创建 server，proxy 内嵌条件" —— 否则关闭 proxy 时 host/cors/headers 等 wujie 必需配置会一起丢。

## 4. 主应用侧改动（参考用，详见对应 commit）

- 新增 `apps/rh-mes-frontend/src/app/routes/main/scaffold-web/scaffold-web.routes.ts`：镜像 `andon-new.routes.ts`，wujie name = `scaffold-web`，URL 来自 `environment.scaffoldWebUrl`；
- `environments/environment.ts` 与 `environment.prod.ts` 各加 `scaffoldWebUrl: 'http://192.168.0.135:6024'`；
- `main.routes.ts` 在 `AndonNew` 之后注册 `path: 'ScaffoldWeb'` 的 `loadChildren`；
- `app.component.ts` 在现有 `preloadTask` 内追加一个 `preloadApp({ name: 'scaffold-web', ... })`，让 host 上下文在首屏前种入 wujie。

## 5. 验证

### 本地端到端

1. `pnpm --filter @repo/web dev`，确认 `http://0.0.0.0:5173`（或 `VITE_DEV_PORT` 指定的端口）可达；
2. 临时把 MES `environment.ts` 的 `scaffoldWebUrl` 改成你本机能访问的 dev URL（例如 `http://192.168.0.135:5173`）；
3. `pnpm start:mes` 启动 MES，登录后访问 `/main/ScaffoldWeb/scaffold-web`；
4. 浏览器 DevTools → iframe context 执行：
   ```js
   window.__POWERED_BY_WUJIE__               // true
   window.__WUJIE.props.hostContext          // 完整 context
   window.__WUJIE.bus.$on('host:context-sync', console.log)
   ```
5. React DevTools 检查 `HostContextProvider` value 与组件 `useHostContext()` 返回一致；
6. 在主应用切语言或重登录后，观察子应用 UI 同步刷新无需手动刷新。

### 自动化检查

- `pnpm --filter @repo/web typecheck`：确保新增类型自洽；
- `pnpm --filter @repo/web test` 现有套件不破坏；
- 可后续加一个针对 `host-context-source.ts` 的单测：mock `window.__WUJIE`，验证 read / subscribe / 取消订阅。

## 6. 不在本次范围

- 把现有 `packaging.routes.ts` 复用 `andon-config` name 指向 6024 的"脏"配置改干净；
- 用 `languageInfo.currentLang` 驱动子应用 i18next 切换（需要 `zh_CN` ↔ `zh-CN` 标准化的 `LocaleBridge`）；
- 把 `WujieHostContext` 类型抽成共享包；
- 6024 静态服务器的部署脚本调整（已有 andon-config 路径在用，本次复用）。

## 7. 变更文件清单

新增：
- `apps/web/src/lib/host-context/host-context-types.ts`
- `apps/web/src/lib/host-context/host-context-source.ts`
- `apps/web/src/lib/host-context/host-context-provider.tsx`
- `apps/web/src/lib/host-context/use-host-context.ts`
- `apps/web/src/lib/host-context/index.ts`
- `docs/plans/2026-06-15/wujie-scaffold-web-integration.md`（本文件）

修改：
- `apps/web/src/main.tsx`
- `apps/web/src/root-app.tsx`
- `apps/web/vite.config.ts`
