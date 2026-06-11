# 嵌入式页面（Embed Mode）改造方案

## 背景

本仓库的 Web 应用计划作为「被嵌入页面」被集成进已有的微服务/微前端平台（主平台）。主平台会以新窗口或 iframe 加载本应用的某些业务页面，并自带登录态（access token）。因此需要在保留现有带 chrome（侧边栏 + 顶栏）的访问方式之外，新增一种**不带任何 chrome、且自动从主平台接收 token** 的访问形式。

改造的核心目标：所有包装业务页（`/packaging/*`）都能以独立形式供主平台直接打开或嵌入，且不破坏现有的开发体验和测试流程。

## 任务级别

- `L2`（架构级）
- 涉及路由结构改造、`auth` 模块扩展、跨切关注点
- 跨 6 个业务路由 + auth 模块 + E2E helper

## 设计

### 1. URL 约定

通过**路径前缀**区分嵌入模式：

- 正常模式：`/packaging/packaging-type`
- 嵌入模式：`/embed/packaging/packaging-type`

`/embed/*` 下的路由不渲染 `AdminLayout`（即无 `AppSidebar`、`AppHeader`、`VersionBadge`），仅渲染 page 自身。

**为什么不选 `?embed=1` 这种查询参数：**

- 嵌入模式是结构化的"另一种形态"，不是同一形态的开关；用路径前缀更清晰。
- 方便后续在主平台做路由分流（路径前缀匹配 vs query 解析）。
- 一眼能在地址栏看出当前是嵌入模式。

**为什么不抽 `BareLayout` 替代 `AdminLayout`：**

- "嵌入"在概念上就是"不要 chrome"，这与 `AdminLayout` 的"提供 chrome"职责互斥；让同一个组件承担两套相反应职责会复杂化组件。
- `embedRoute` 自己作为 layout 父路由存在，`component: () => <Outlet />`，零渲染即可达成目的。

### 2. 路由树

```
rootRoute
├── ...（所有现有路由不变）
└── embedRoute (path: "embed")
    ├── embedPackagingTypeRoute           (packaging/packaging-type)
    ├── embedPackagingLevelRoute          (packaging/packaging-level)
    ├── embedPackagingKitRoute            (packaging/packaging-kit)
    ├── embedPackagingSpecRoute           (packaging/packaging-spec)
    ├── embedPackagingRuleRoute           (packaging/packaging-rule)
    └── embedMaterialPackagingRelationRoute (packaging/material-packaging-relation)
```

子路由的 `path` 全部使用**相对路径**（相对父路由 `/embed`），最终拼出完整 URL。

`embedRoute.beforeLoad` 调用 `handleEmbedAuth()`，不通过则抛错渲染错误页。子路由不重复声明鉴权。

后续如需把其他业务模块也接入嵌入模式，只需要在 `embedRoute` 下新增子路由条目，不需要改其它任何东西。

### 3. Token 注入协议

主平台传入 token 的三种方式（按优先级）：

#### 优先级 1：URL 查询参数 `?token=`

最简单、兼容所有加载方式（新窗口、`<a href>`、`<iframe src>`）。主平台用类似下面的方式打开：

```
https://your-app/embed/packaging/packaging-spec?token=<value>
```

`token` 字段支持两种格式：

- **JSON 字符串**（推荐）：`token` 是 `AuthToken` 的 JSON 序列化

  ```json
  {"tokenType":"Bearer","accessToken":"xxx","refreshToken":"yyy","expiresIn":3600}
  ```

  命中后调用 `setAuthToken(parsed)` 完整写入。

- **纯字符串**（简化场景）：`token` 直接就是 access token。此时只写入 `accessToken`，`tokenType` 默认为 `Bearer`，`refreshToken` 与 `expiresIn` 留空。后果：401 时刷新 token 的流程无法进行，但只要 access token 有效期间内页面正常使用没问题。

判定规则：以第一个字符是否为 `{` 区分。

#### 优先级 2：`postMessage`（iframe 场景）

当被嵌入到 iframe 且不希望 token 出现在 URL（避免进服务器日志、避免被中间链路缓存）时使用。

握手协议：

1. 嵌入页加载完成后，向 `window.parent` 发送：

   ```json
   { "type": "EMBED_READY" }
   ```

2. 主平台收到后向嵌入页发送：

   ```json
   { "type": "EMBED_TOKEN", "token": "<value>" }
   ```

   `token` 字段的两种格式同上。

3. 嵌入页收到 `EMBED_TOKEN` 后写入 `tokenStore` 并继续渲染。

**超时**：嵌入页启动一个 5 秒计时器，若到时仍未收到 `EMBED_TOKEN`，视为配置错误，渲染错误页（不跳转 `/login`，因为嵌入场景下没有可登录的 UI）。

**安全约束**：

- 嵌入页接收 `message` 时**不校验 `event.origin`**（v1 简化）。后续如主平台域名固定，可加上 `event.origin === "https://main-platform"` 的校验。本期在 spec 中标注为「已知 v1 简化项」，不阻塞发布。
- 嵌入页只读 `message.data.type === "EMBED_TOKEN"`，对其它消息不响应。

#### 优先级 3：（未来扩展位）

主平台如果选择通过 HTTP Header 传 token，需主平台使用 service worker 拦截请求注入。本期**不实现**，留作扩展点。

### 4. 错误处理

`handleEmbedAuth` 在以下情况视为鉴权失败：

- URL 没有 `?token=` 且不在 iframe 中（直接顶层窗口打开）→ 立即失败
- 在 iframe 中且 5 秒内未收到 `EMBED_TOKEN` → 超时失败
- `?token=` 存在但解析失败（JSON 格式错误）→ 解析失败

失败时**不**重定向到 `/login`（嵌入场景无登录 UI），而是抛 `redirect` 到 `/embed/auth-error` 路由，渲染一个错误页：

- 显示中文/英文双语错误信息（通过 `common` i18n namespace）
- 提供"重新尝试"按钮（重新触发 `acquireEmbedToken`）
- 主平台可以根据 `postMessage` 协议被告知错误：

  ```json
  { "type": "EMBED_ERROR", "code": "TIMEOUT" | "PARSE_ERROR" | "NO_TOKEN", "message": "..." }
  ```

  这样主平台 UI 可以兜底显示。

### 5. `AdminLayout` / 业务页面的关系

- 业务页面**不感知**自己是否处于嵌入模式；它们只关心"我能不能拿到 token、能不能正常调 API"。
- `AdminLayout` 不变；嵌入路由根本不走 `AdminLayout`。
- 未来如果某个嵌入页面需要"轻量外壳"（比如嵌入到主平台时还希望带面包屑），可以单独提供 `EmbeddedLayout`；本期不做。

## 文件改动清单

| 路径 | 改动 |
|---|---|
| `apps/web/src/lib/auth/auth-embed.ts` | 新建。导出 `acquireEmbedToken`、`handleEmbedAuth`、`EMBED_TOKEN_TIMEOUT_MS`、`EmbedTokenMessage` 等类型 |
| `apps/web/src/lib/auth/auth-embed.test.ts` | 新建。覆盖 URL 解析、JSON/plain 两种格式、postMessage 超时、错误抛出 |
| `apps/web/src/root-app.tsx` | 新增 `embedRoute` 父路由 + 6 个嵌入子路由，更新 `routeTree` |
| `apps/web-e2e/helpers/routes.ts` | 新增 6 个 `embed*` 路径键 |
| `apps/web/src/i18n/resources/zh-CN/common.ts` 与 `en-US/common.ts` | 新增嵌入错误页相关 key（`pages.embedError.title`、`pages.embedError.timeout` 等） |
| `apps/web/src/features/auth/embed-error-page.tsx` | 新建。错误页组件，调用 `useTranslation` 展示多语言文案 |

## 测试计划

### 单元测试（`auth-embed.test.ts`）

- URL `?token=xxx` 纯字符串：成功 setAccessToken
- URL `?token=<json>` JSON 格式：成功 setAuthToken
- URL `?token=<invalid-json>`：抛 `PARSE_ERROR`
- 顶层窗口无 `?token=`：立即返回 `false`
- iframe 场景下收到 `EMBED_TOKEN` 消息：成功注入
- iframe 场景下 5 秒未收到消息：返回 `false`
- iframe 场景下收到非 `EMBED_TOKEN` 类型消息：忽略

### E2E（暂不写，待主平台对接后再补）

`packaging-type.page.ts` 不需要改 — 现有 `goto()` 仍然走带 chrome 的 URL。后续如果做嵌入 E2E，新增 `embed-packaging-type.page.ts`，调用 `appRoutes.embedPackagingType`。

## 非目标

- 不实现 token 刷新专用流程：嵌入模式下沿用现有 401 刷新逻辑，由主平台保证 access token 较长有效期或在 401 时主动重新发起握手
- 不实现 HTTP Header 注入
- 不实现 postMessage origin 校验（v1 简化）
- 不为嵌入场景引入新的 layout 组件
- 不改 `AdminLayout` 自身

## 升级触发条件

如果实现时发现以下任一情况，升级为 L3 并补充完整实施计划：

- 主平台要求 postMessage origin 校验，且不固定单一域名
- 主平台需要"嵌入页 → 主平台"反向调用（如嵌入页内操作完成后通知主平台刷新）
- 嵌入场景下的 401 刷新需要走主平台代理（不能直接调后端 `/auth/refresh`）
