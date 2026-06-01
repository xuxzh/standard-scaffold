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

## `.env` 初始化

`apps/web` 当前依赖 Vite 环境变量为 app/WMS/MES API client 提供服务地址。

初始化步骤：

```bash
cp apps/web/.env.example apps/web/.env.local
```

然后按实际环境修改 `apps/web/.env.local`：

```bash
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://127.0.0.1:8283
VITE_MES_API_BASE_URL=http://127.0.0.1:8282
```

说明：

- `VITE_API_BASE_URL`、`VITE_WMS_API_BASE_URL` 和 `VITE_MES_API_BASE_URL` 在关闭 API mock 时都建议配置
- 未配置对应 API 的 base URL 且关闭 API mock 时，请求会抛出配置错误
- 修改 `.env.local` 后需要重启 Vite 开发服务器
- `.env.local` 用于本机私有配置，不应提交到仓库
- `.env.example` 只保留示例值和初始化模板

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
