# `apps/web`

`apps/web` 是当前仓库的主 Web 应用，基于 `React 19`、`Vite`、`TypeScript`、`TanStack Router` 和 `React Query` 构建。

当前应用提供：

- 后台壳层与导航框架
- 多语言与主题切换
- 基础数据展示与表单能力
- WMS 业务模块接入入口

## 目录结构

```text
apps/web/
  src/
    components/   # 通用组件、布局组件、UI 基础组件
    features/     # 业务模块与页面级功能
    hooks/        # 复用 hooks
    i18n/         # 国际化配置与资源
    lib/          # 基础工具、query client、API client
    routes/       # 路由页面与路由相关数据逻辑
    stores/       # 客户端全局状态
    test/         # 测试初始化
  .env.example
  package.json
  tsconfig.json
  vite.config.ts
  vitest.config.ts
```

各目录职责如下：

- `src/components/`：应用壳层、通用组件和本地 UI 基础组件
- `src/features/`：按业务域组织的功能模块
- `src/lib/api/`：应用 API client 与 WMS API client
- `src/routes/`：页面路由与页面装配
- `src/i18n/`：语言资源、provider 和初始化逻辑
- `src/stores/`：跨页面共享的客户端状态

## 启动前准备

先在仓库根目录安装依赖：

```bash
pnpm install
```

## 环境文件与初始化

`apps/web` 依赖 Vite 环境文件为 app/WMS/MES/Print API 提供地址，并控制是否启用浏览器端 API mock。

初始化本机开发配置：

```bash
cp apps/web/.env.example apps/web/.env.local
```

环境文件职责：

- `apps/web/.env.example`：示例模板，用于初始化本机配置，不作为团队默认运行值
- `apps/web/.env.local`：开发者本机覆盖配置，用于 mock 开发或真实接口联调，不提交到仓库
- `apps/web/.env.production`：仓库内生产构建默认值，`pnpm --filter @repo/web build` 默认读取
- `apps/web/.env.production.local`：本机临时覆盖生产构建值，优先级高于 `.env.production`

通用说明：

- 关闭 API mock 时，需要为对应数据域配置真实 API base URL
- 未配置对应 API 的 base URL 且关闭 API mock 时，请求会抛出配置错误
- 修改 `.env.local` 或 `.env.production.local` 后，需要重新执行对应命令
- `.env.local` 和 `.env.production.local` 都属于本机私有覆盖文件，不应提交到仓库
- `.env.example` 只提供初始化模板；团队默认生产构建值以 `.env.production` 为准

### 本地 mock 开发

在 `apps/web/.env.local` 中设置：

```env
VITE_ENABLE_API_MOCKING=true
VITE_MOCK_RECORD_COUNT=40
```

然后运行：

```bash
pnpm --filter @repo/web dev
```

### 本地真实接口联调

在 `apps/web/.env.local` 中设置：

```env
VITE_ENABLE_API_MOCKING=false
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://192.168.0.135:8283
VITE_MES_API_BASE_URL=http://192.168.0.135:8282
VITE_PRINT_API_BASE_URL=http://127.0.0.1:3002
```

修改后需要重启 Vite 开发服务器：

```bash
pnpm --filter @repo/web dev
```

### 生产构建

直接运行：

```bash
pnpm --filter @repo/web build
```

默认会读取 `apps/web/.env.production`，因此不需要在打包前手工改 `.env.local`。

如果本机存在 `apps/web/.env.production.local`，它会覆盖仓库中的 `.env.production`。

## 本地运行

### 从仓库根目录运行

推荐使用 workspace 过滤命令：

```bash
pnpm --filter @repo/web dev
```

默认会以 `127.0.0.1` 启动 Vite 开发服务器。

### 在 `apps/web` 目录内运行

```bash
pnpm dev
```

## 常用命令

```bash
pnpm --filter @repo/web dev
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm --filter @repo/web build
```

## 测试与验证

日常改动优先执行：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

如果改动影响到端到端主链路，再配合仓库根目录或 `apps/web-e2e` 的 Playwright 验证。

## 开发约定

- 使用 `pnpm`，不要切换到 `npm` 或 `yarn`
- `@/` 指向 `src/*`
- 优先复用 `src/components/ui` 中已有组件
- API 响应缓存、loading、error 继续使用 `React Query`
- 跨页面客户端状态默认使用 `Zustand`
- 文案需同时兼顾中英文资源，不要只改单一语言

## 相关文件

- `src/lib/api/wms-client.ts`：WMS API client 与环境变量读取入口
- `src/lib/api/mes-client.ts`：MES API client 与环境变量读取入口
- `src/root-app.tsx`：应用启动与 provider 装配入口
- `src/routes/`：页面级路由入口
- `src/features/`：业务功能实现
