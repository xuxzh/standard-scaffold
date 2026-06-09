# 实施计划：把 IP 替换代理从 Vite dev 插件搬到浏览器 transport 层

对应 spec：`docs/specs/2026-06-08/debug-ip-rewrite-proxy-design.md`（2026-06-09 修订记录）

> **背景：** 2026-06-08 spec 推荐的 Vite dev server 中间件方案（`PUT /__debug/ip-rewrite-proxy/config` + `server.proxy` 的 `router` 回调）在生产构建后不可用：端点返回 405、proxy 也不存在。本计划实施 spec 修订后架构（浏览器侧 transport 改写），覆盖原 plan 中的 Vite-plugin 切片。`superpowers:subagent-driven-development` 的步骤模板不适用——这是一个一次性的多文件迁移，不是 TDD 切片。

## 范围

L2 实施。修改纯逻辑库 + 4 个 API client + 1 个页面 + localStorage store + i18n + 清理 Vite 旧配置 + 更新 spec。

## 步骤

### 1. 扩展 pure lib（`apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts`）

- `DebugIpRewriteProxyConfig` 增加 `baseUrls: { app, wms, mes, print }`
- 新增导出 `getDefaultDebugIpRewriteProxyBaseUrls()`：从 `import.meta.env.VITE_*_API_BASE_URL` 读，缺失则空串
- `defaultDebugIpRewriteProxyConfig.baseUrls` 改用上面那个函数
- `normalizeDebugIpRewriteProxyConfig` 接受 `baseUrls`，每个 entry `trim()` 后通过；新增 `normalizeBaseUrls` 私有 helper
- **删除** `DEBUG_IP_REWRITE_PROXY_CONFIG_PATH` 常量

复用既有：`shouldRewriteDebugIpUrl`、`getDebugIpRewriteProxyPreview`、`parseDebugIpRewriteProxyPorts`、`formatDebugIpRewriteProxyPorts`。

### 2. 新建 localStorage store（`apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store.ts`）

- `DEBUG_IP_REWRITE_PROXY_CONFIG_STORAGE_KEY = "debug-ip-rewrite-proxy.config"`
- `loadDebugIpRewriteProxyConfigFromStorage()`：localStorage 不可用 / JSON 损坏 / normalize 抛错时回退到 `normalizeDebugIpRewriteProxyConfig({})`（**不**返回缓存的 `defaultDebugIpRewriteProxyConfig`，确保 `getDefaultDebugIpRewriteProxyBaseUrls()` 在每次调用时重新读 env——`vi.stubEnv` 等场景必需）
- `saveDebugIpRewriteProxyConfigToStorage(config)`：先 `normalize` 校验再写，setItem 失败静默

### 3. 改 `http-client.ts` 支持 lazy baseUrl

- `FetchTransportOptions.baseUrl` 类型从 `string` 改为 `string | (() => string | undefined)`
- 函数体里按调用解析：内部 `resolveBaseUrl` 辅助
- `createMockTransport` / `createHttpClient` 不动

### 4. 改 4 个 API client（`apps/web/src/lib/api/{app,wms,mes,print}-client.ts`）

每个 client 套同一模式：
- 保留 `getConfiguredXxxApiBaseUrl()`（env 兜底）
- 新增 `resolveXxxBaseUrl()`：
  - 读 `loadDebugIpRewriteProxyConfigFromStorage().baseUrls.<slot>`
  - 空串则回退到 `getConfiguredXxxApiBaseUrl()`
  - 若 `config.enabled === true` 且最终 baseUrl 为空 → 抛错
- `createDefaultXxxTransport()`：MSW 路径不变（`createFetchTransport()` 不传 baseUrl），真实路径改为 `createFetchTransport({ baseUrl: resolveXxxBaseUrl, getToken: getAccessToken })`
- `setXxxTransportForTests` / `resetXxxTransportForTests` 保持原样
- 删掉 `if (!baseUrl) throw new Error(...ENV_KEY is not configured)`

### 5. 删 service + 改 page

删除：
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.ts`
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.test.ts`

修改 `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`：
- 删 `loading` state（localStorage 同步读）
- 删 `getDebugIpRewriteProxyConfig` / `saveDebugIpRewriteProxyConfig` 调用
- 改用 `loadDebugIpRewriteProxyConfigFromStorage` / `saveDebugIpRewriteProxyConfigToStorage`
- 加 4 个 baseUrl Input 字段（i18n key 见 §6）
- 加警告横幅：`form.enabled && 任一 baseUrl 为空` 时显示
- `handleReset` 把 `baseUrls` 也重置回 env 默认
- 修正过时的 preview 文案（去掉 "Vite dev proxy" 字样）

### 6. 加 i18n

`apps/web/src/i18n/resources/{zh-CN,en-US}/common.ts` 在 `pages.debugIpRewriteProxy` 下加：
- `baseUrlsCardTitle`
- `fields.appBaseUrl` / `fields.wmsBaseUrl` / `fields.mesBaseUrl` / `fields.printBaseUrl`
- `fields.baseUrlsDescription`
- `warnings.baseUrlsRequired`
- `feedback.saved` / `feedback.loadFailed`

### 7. Vite 清理

删除：
- `apps/web/vite/debug-ip-rewrite-proxy-plugin.ts`
- `apps/web/vite.config.test.ts`

修改 `apps/web/vite.config.ts`：移除 `createDebuggableApiProxy`/`debugIpRewriteProxyPlugin` import、`DEFAULT_DEV_PROXY_TARGETS` / `createApiProxy` / `server.proxy` 块、plugins 数组中的插件项、`loadEnv` 调用（不再需要）。保留 manualChunks、alias。

### 8. 测试更新

- `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.test.ts`：保留 6 个 case，加 1 个「`baseUrls` 缺省时回退到 env」
- `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store.test.ts`（新）：load 兜底、JSON 损坏、save round-trip、normalize 抛错时回退、跨字段 env 覆盖
- `apps/web/src/lib/api/{app,mes,wms}-client.test.ts`：删「base URL missing throws」case；新增「localStorage 覆盖 env」和「IP rewrite 启用 + baseUrl 空抛错」case
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.test.tsx`：从 `vi.stubGlobal('fetch', ...)` 切到 `localStorage` seed/assert；新增「enabled + 空 baseUrl 显示警告」和「fill 后警告消失」case
- `apps/web/src/features/mes/packaging/packaging-type/packaging-type-page.test.tsx`：将「base URL missing」case 改为「IP rewrite 启用 + baseUrl 空」case

### 9. 更新 spec

`docs/specs/2026-06-08/debug-ip-rewrite-proxy-design.md`：
- 文首加「修订记录」段（2026-06-09）
- 文末加「修订后架构」段：持久化模型、transport 改写流程、行为约定、失败兜底、文件清单

## 验证

```bash
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
pnpm --filter @repo/web test
```

手动 smoke（dev / prod build / MSW）见 plan-mode 文件 `/Users/xuxz/.claude/plans/immutable-bubbling-beaver.md` 的「验证」节。

## 风险

- `loadDebugIpRewriteProxyConfigFromStorage` 在每次请求时调用 → 4 个 client × 每个请求 = 多次 localStorage 读。性能可忽略（< 1ms）；如成为瓶颈再缓存。
- localStorage 跨浏览器/隐私模式不可用 → load 兜底到 env 默认。
- Bearer token 随改写 host 发出 → 用户预期行为，spec 修订记录已声明「不要把代理指向不信任的 host」。
- 回退：本次不删 git 历史，4 个删除文件独立 commit，逐文件 revert 即可回退到原 Vite-plugin 方案。

## i18n 存量债

页面里 6 处硬编码中文字段标签（启用代理、替换目标 IP/Host、匹配模式、端口列表、正则表达式、原始 URL 等）是 CLAUDE.md i18n 规则的存量违反，**本次故意保留**。如要清理，独立 PR。
