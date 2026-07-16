# Web 生产 API 同源路由与调试直连实施计划

> **面向 Agent 执行者：** 使用 `superpowers:executing-plans` 按任务执行本计划。
> 行为变更严格遵循 TDD：先添加失败测试并确认失败原因，再实现最小改动。

**目标：** 生产构建使用稳定的 `/api/*` 同源前缀，由 Nginx 选择真实 API；
只有启用 IP 替换调试时才使用绝对 Base URL 直连可信且支持 CORS 的后端。

**实现方式：** 在 debug IP rewrite 模块集中校验绝对 HTTP(S) URL，在配置存储
模块集中解析 DEV、PROD 正常模式和 PROD 调试模式的 Base URL 优先级。四个 API
client 复用该解析函数，Nginx 示例按服务 upstream 分流。

**技术栈：** React 19、TypeScript、Axios fetch adapter、Vitest、Nginx

---

## 文件清单

- 新建：
  - `docs/specs/2026-07-16/web-production-api-nginx-routing-design.md`
  - `docs/plans/2026-07-16/web-production-api-nginx-routing.md`
  - `docs/adr/0006-web-production-api-routing.md`
- 修改：
  - `apps/web/.env.production`
  - `apps/web/README.md`
  - `deploy/nginx/standard-scaffold.conf.example`
  - `docs/adr/README.md`
  - `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts`
  - `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store.ts`
  - `apps/web/src/lib/api/{app,wms,mes,print}-client.ts`
  - `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`
  - `apps/web/src/i18n/resources/{zh-CN,en-US}/common.ts`
- 测试：
  - debug proxy、config store、调试页面、HTTP transport 和四个 API client 测试

### 任务 1：锁定调试配置校验和地址优先级

- [x] 为 `isAbsoluteHttpUrl()` 添加 http、https、相对 URL、空值和其他协议测试。
- [x] 添加测试：调试关闭允许 `/api/*`；调试开启要求四项都是绝对 HTTP(S) URL。
- [x] 添加测试：生产调试关闭忽略旧 localStorage；生产调试开启使用绝对地址；
      DEV 始终使用环境变量。
- [x] 运行定向测试，确认因缺少校验和旧优先级而失败。

执行：

```bash
pnpm --filter @repo/web exec vitest run \
  src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts \
  src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store.test.ts \
  src/lib/api/app-client.test.ts \
  src/lib/api/wms-client.test.ts \
  src/lib/api/mes-client.test.ts \
  src/lib/api/print-client.test.ts \
  src/lib/api/http-client.test.ts
```

### 任务 2：实现调试配置与四个 client

- [x] 实现 `isAbsoluteHttpUrl(value: string): boolean`。
- [x] 过滤 `getDefaultDebugIpRewriteProxyBaseUrls()` 中的相对环境变量。
- [x] 在 normalize 中拒绝启用状态下的空值、相对值和非 HTTP(S) URL。
- [x] 在 config store 中实现统一 Base URL 解析函数。
- [x] 让 App、WMS、MES、Print client 统一调用解析函数。
- [x] 重跑任务 1 的定向测试并确认通过。

### 任务 3：锁定并实现调试页面交互

- [x] 添加失败测试：相对或空 Base URL 下启用代理时显示警告且保存禁用。
- [x] 添加失败测试：填写四个绝对 URL 后警告消失且可以保存。
- [x] 使用共享绝对 URL 校验计算页面警告，新增中英文 i18n 文案。
- [x] 运行调试页面和 i18n 相关测试并确认通过。

执行：

```bash
pnpm --filter @repo/web exec vitest run \
  src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx \
  src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts
```

### 任务 4：更新生产配置与 Nginx 部署示例

- [x] 将 `.env.production` 四个 API 地址改为 `/api/*`。
- [x] 为 Nginx 示例增加四个 upstream 和前缀移除 location。
- [x] 保留 `/api/` 到应用 API 的现有兜底路由。
- [x] 更新 README 和 ADR，说明多服务器部署、远端 upstream 与调试安全边界。

### 任务 5：完整验证

- [x] 运行所有定向测试：8 个文件、74 个测试通过。
- [x] 运行 `pnpm --filter @repo/web typecheck`。
- [x] 运行 `pnpm --filter @repo/web lint`：0 error，11 个既有 warning。
- [x] 运行 `pnpm --filter @repo/web build`。
- [x] 运行 `pnpm verify:web`：91 个测试文件、667 个测试通过并完成构建。
- [x] 运行 `git diff --check` 并审查仅包含本任务文件。
- [ ] 在部署阶段执行 `nginx -t`、reload 和正常/调试烟测；本次仓库实现不操作服务器。
