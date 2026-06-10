# API 开发代理前缀重写实施计划

> **执行要求：** 按 TDD 顺序逐步执行，每个行为必须先看到测试因缺少重写而失败，再实现最小改动。

**目标：** 让四个 Vite 开发代理在转发请求时移除各自的 `/api/<service>` 前缀。

**架构：** 保留现有四个独立代理和环境变量目标地址。为每个代理添加只匹配自身固定前缀的 `rewrite` 函数，不添加通用兜底代理，也不修改 API client 或业务接口路径。

**技术栈：** Vite 7、TypeScript、Vitest

---

### 任务 1：锁定四个代理的路径重写行为

**文件：**

- 修改：`apps/web/vite.config.test.ts`

- [x] **步骤 1：添加失败测试**

在默认代理测试中获取四个代理的 `rewrite` 函数，并断言：

```ts
expect(appProxy.rewrite?.("/api/app/users?page=1")).toBe("/users?page=1");
expect(wmsProxy.rewrite?.("/api/wms/inventory")).toBe("/inventory");
expect(mesProxy.rewrite?.("/api/mes/packaging/types")).toBe(
  "/packaging/types",
);
expect(printProxy.rewrite?.("/api/print/templates")).toBe("/templates");
```

- [x] **步骤 2：运行测试并确认失败**

运行：

```bash
pnpm --filter @repo/web test -- vite.config.test.ts
```

预期：测试因四个代理尚未定义 `rewrite` 而失败。

### 任务 2：实现固定代理前缀重写

**文件：**

- 修改：`apps/web/vite.config.ts`
- 验证：`apps/web/vite.config.test.ts`

- [x] **步骤 1：添加最小实现**

为四个代理分别添加固定前缀重写：

```ts
"/api/app": {
  target: devProxyTargets.app,
  changeOrigin: true,
  rewrite: (path) => path.replace(/^\/api\/app/, ""),
},
```

`wms`、`mes`、`print` 使用相同结构和各自的固定前缀。

- [x] **步骤 2：运行定向测试并确认通过**

运行：

```bash
pnpm --filter @repo/web test -- vite.config.test.ts
```

预期：`vite.config.test.ts` 全部通过。

- [x] **步骤 3：运行 Web 类型检查**

运行：

```bash
pnpm --filter @repo/web typecheck
```

预期：TypeScript 类型检查通过。

- [x] **步骤 4：检查差异**

运行：

```bash
git diff --check
git diff -- apps/web/vite.config.ts apps/web/vite.config.test.ts
```

预期：无空白错误，差异只包含四个代理的重写及其测试。

### 任务 3：验证开发服务器中的真实代理行为

**文件：**

- 不修改文件

- [x] **步骤 1：确认本机开发环境启用同源代理**

本机 `.env.local` 应包含：

```env
VITE_ENABLE_API_MOCKING=false
VITE_API_BASE_URL=/api/app
VITE_WMS_API_BASE_URL=/api/wms
VITE_MES_API_BASE_URL=/api/mes
VITE_PRINT_API_BASE_URL=/api/print
DEV_API_PROXY_ENABLED=true
```

- [x] **步骤 2：重启开发服务器**

环境文件和 Vite 配置只在启动时读取，因此重启：

```bash
pnpm --filter @repo/web dev
```

- [x] **步骤 3：浏览器验证**

在当前包装类型页面触发 MES 请求，确认浏览器仍请求：

```text
http://127.0.0.1:5173/api/mes/...
```

同时根据后端响应或代理日志确认后端收到的路径不再包含 `/api/mes`。

### 任务 4：提交实现

**文件：**

- 提交：`docs/plans/2026-06-10/api-proxy-prefix-rewrite.md`
- 提交：`apps/web/vite.config.ts`
- 提交：`apps/web/vite.config.test.ts`

- [ ] **步骤 1：只暂存任务文件**

```bash
git add docs/plans/2026-06-10/api-proxy-prefix-rewrite.md \
  apps/web/vite.config.ts \
  apps/web/vite.config.test.ts
```

- [ ] **步骤 2：提交**

```bash
git commit -m "fix(web): rewrite API proxy prefixes"
```

不得暂存或提交开发者本机的 `apps/web/.env.local`。
