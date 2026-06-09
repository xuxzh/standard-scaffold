# 实施计划：双轨代理（Vite dev proxy + 浏览器 transport 改写）

对应 spec：`docs/specs/2026-06-08/debug-ip-rewrite-proxy-design.md`

> **背景：** 2026-06-08 引入浏览器侧 host 改写（commit `e6ddf0f`）时，**同时删除了**本地 Vite dev proxy；本次把 Vite dev proxy 补回来，形成"双轨"：dev 模式走 Vite proxy（env 变量开关），生产/预发走浏览器 transport 改写（页面 UI 开关）。两个机制按部署形态互斥使用，不会双重重写。

## 范围

L2 实施。修改 vite.config.ts、vite.config.test.ts（新增）、`.env.*` 三份；不修改任何业务 feature、API client、debug 页面代码。

## 双轨设计

| 场景 | 浏览器看到的目标地址 | 实现机制 | 开关 | 配置位置 |
|------|----------------------|----------|------|----------|
| `pnpm dev`（启用本地代理） | `/api/app` `/api/wms` `/api/mes` `/api/print`（同源相对路径） | Vite dev server 的 `server.proxy` 把这 4 条路径转发到 `DEV_*_API_PROXY_TARGET` 指定的真实后端 | 环境变量 `DEV_API_PROXY_ENABLED`（默认 `true`，显式 `"false"` 关闭） | `apps/web/vite.config.ts` |
| `pnpm build` + serve（生产/预发） | `http://192.168.0.135:8282/...` 等绝对地址 | `createFetchTransport` 在 `fetch` 前对 `host` 做 `192.168.0.135 → 127.0.0.1` 之类的改写 | `/debug/ip-rewrite-proxy` 页面 → `localStorage.debug-ip-rewrite-proxy.config` 的 `enabled` 字段 | `apps/web/src/lib/api/http-client.ts` |
| `VITE_ENABLE_API_MOCKING=true` | 相对路径 `/api/*` | MSW 拦截浏览器请求；Vite proxy 不参与（请求到 Vite 时已被 MSW 吞掉，理论上不会触发 proxy） | 环境变量 `VITE_ENABLE_API_MOCKING` | `apps/web/src/mocks/config.ts` |

### 为什么不会双重重写

- Vite dev proxy 接收的请求 URL 是同源相对路径（`/api/mes/...`）；浏览器侧 host 改写需要 `new URL(...)` 解析主机名，相对路径无法解析 → no-op
- 生产构建的 dist 里没有 Vite dev server，dev proxy 不存在；浏览器请求直接发到绝对 URL，host 改写接管

### baseUrl 与 dev proxy 状态的关系（用户手动维护）

- `DEV_API_PROXY_ENABLED=true`（默认）→ 期望 `VITE_API_BASE_URL=/api/app`、`/api/wms`、`/api/mes`、`/api/print`（相对路径）
- `DEV_API_PROXY_ENABLED=false` → 用户手动把 `VITE_*_API_BASE_URL` 改为 `http://<host>:<port>` 绝对地址，浏览器直连

不引入自动联动逻辑，避免状态机复杂度。这一耦合在 `.env.example` 注释里写明。

## 步骤

### 1. 改 `apps/web/vite.config.ts`

- 引入 `loadEnv`；`defineConfig` 改为函数式，接收 `{ mode }`
- `fileEnv = loadEnv(mode, process.cwd(), "")`，叠加 `process.env`（允许 shell / 测试覆盖）
- `devProxyEnabled = env.DEV_API_PROXY_ENABLED !== "false"`（默认值 true）
- `devProxyTargets` 四项：先取 `env.DEV_*_API_PROXY_TARGET`，再回退到内联常量 `http://192.168.0.135:{8288,8283,8282,3002}`
- `server: devProxyEnabled ? { proxy: { "/api/app": {...}, "/api/wms": {...}, "/api/mes": {...}, "/api/print": {...} } } : undefined`
- 保留现有 `build.outDir` / `rollupOptions.manualChunks` / `resolve.alias`

### 2. 新增 `apps/web/vite.config.test.ts`

三个用例（`@vitest-environment node`）：

1. 不设 `DEV_API_PROXY_ENABLED` → 4 条 proxy 全部注册，target 走默认常量
2. `process.env.DEV_API_PROXY_ENABLED = "false"` → `resolvedConfig.server?.proxy` 为 `undefined`
3. `process.env.DEV_MES_API_PROXY_TARGET = "http://1.2.3.4:9000"` → 仅 `/api/mes` target 变；其他 3 条仍走默认，证明按 key 粒度覆盖

`afterEach` 清理 5 个 `DEV_*_PROXY*` 进程 env key。

### 3. 改 `apps/web/.env.example`

- 注释段说明 `DEV_API_PROXY_ENABLED` 的语义、与 `VITE_*_API_BASE_URL` 的耦合、`DEV_*_API_PROXY_TARGET` 的覆盖用法
- 列出 5 个 env 变量（1 个开关 + 4 个 target）的默认示例值

### 4. 改 `apps/web/.env.local`

- 显式加 `DEV_API_PROXY_ENABLED=true`
- 显式列出 4 个 `DEV_*_API_PROXY_TARGET`（与 `.env.production` 中 `VITE_*_API_BASE_URL` 的目标地址一致）

### 5. 改 `apps/web/.env.production`

- 加 `DEV_API_PROXY_ENABLED=false` 作为构建期明确意图记录（生产构建里 Vite dev server 不运行，loadEnv 读不到这条也不影响行为；记录仅为排查时一目了然）

### 6. 不修改的代码

- 浏览器侧 transport 改写（`http-client.ts`、`{app,wms,mes,print}-client.ts`）保持 e6ddf0f 之后的实现
- `/debug/ip-rewrite-proxy` 页面、`debug-ip-rewrite-proxy-config-store.ts` 保持 e6ddf0f 之后的实现
- 不引入 Vite 插件（无动态 target 重写需求）、不引入 `__debug/ip-rewrite-proxy/config` 端点

## 验证

按 plan-mode 文件 `/Users/xuxz/.claude/plans/web-starry-blossom.md` 的「Verification」节跑：

1. `pnpm --filter @repo/web typecheck`
2. `pnpm --filter @repo/web lint`
3. `pnpm --filter @repo/web test -- --run vite.config.test.ts`
4. 手动 smoke：dev proxy 开/关两种状态下 Network 面板的请求 URL；prod build 下 `/debug/ip-rewrite-proxy` 页面切到启用后的 host 改写效果；MSW 模式两者均为 no-op
5. `pnpm verify`

## 风险

- **默认开启**：本地 `pnpm dev` 默认走 Vite proxy，若后端不可达会暴露 502/网络错误；`.env.local` 必须能联调，否则用户需 `DEV_API_PROXY_ENABLED=false` 并改 `VITE_*_API_BASE_URL` 为绝对地址。已在 `.env.example` 注释里提醒。
- **target 写死兜底**：内联 `DEFAULT_DEV_PROXY_TARGETS` 仍是 `192.168.0.135`；不同开发者本机后端 IP 不一致时需覆盖 `DEV_*_API_PROXY_TARGET`，否则请求到错误的机器。这一点也是 2026-06-08 原版就有的设计，本计划保留。
- **不开 8022/8283/8282/3002 端口的机器**：`pnpm dev` 启动后浏览器会看到代理错误，按上面的"手动改"流程降级。

## 与 e6ddf0f 修订后架构的关系

本次计划是 e6ddf0f 浏览器 transport 改写的**叠加**，不是替代。设计依据在 `docs/specs/2026-06-08/debug-ip-rewrite-proxy-design.md` 的「修订记录 + 修订后架构」段；本计划只补回 Vite dev proxy 这一轨。两轨并存时按上面表格里的场景分派，不互相干扰。
