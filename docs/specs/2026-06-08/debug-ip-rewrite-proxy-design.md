# Web 调试 IP 替换代理 Spec

日期：2026-06-08

## 修订记录

- **2026-06-09** 架构修订。原推荐的 Vite dev server 中间件方案（推荐架构章节）只对开发环境生效：`PUT /__debug/ip-rewrite-proxy/config` 端点在生产构建后被静态服务器返回 405；同时 `server.proxy` 的 `router` 回调也只活在 dev server 里，生产请求不会被改写。改为浏览器侧 transport 改写方案：
  - 配置存浏览器 `localStorage`（key `debug-ip-rewrite-proxy.config`），`createFetchTransport` 包装层在每次请求时按规则改写 host
  - 新增 `baseUrls: { app, wms, mes, print }` 字段，env（`VITE_*_API_BASE_URL`）仅为初始值
  - 启用代理 + 任何 baseUrl 为空时 transport 抛错，避免请求落到相对路径静默失败
  - 实施计划见 `docs/plans/2026-06-08/debug-ip-rewrite-proxy.md`，本文末尾「修订后架构」是当前推荐方案。下方原章节作为设计意图参考。

## 背景

后端联调时，开发者经常需要让前端继续请求原有接口端口，但临时把请求目标机器切到本机、同事机器或指定调试环境。例如原始请求为：

```text
http://192.168.1.20:8288/api/users?id=1
```

调试时希望只把目标 IP 改为 `127.0.0.1`，转发为：

```text
http://127.0.0.1:8288/api/users?id=1
```

这个需求的关键不是“端口映射”或“目标服务地址重写”，而是对命中规则的请求执行 **host/IP 替换**：保留原协议、端口、路径、查询参数、请求方法、请求体和主要请求头。

## 目标

- 在 Web 端提供一个调试配置入口，用于启用或关闭 IP 替换代理。
- 支持三种拦截模式：全部拦截、端口拦截、正则拦截。
- 命中拦截规则后，仅替换请求目标 host/IP，不改变原端口。
- 提供配置校验和规则预览能力，让开发者能在保存前确认某个 URL 是否会命中以及最终转发到哪里。
- 将真实转发逻辑放在开发或测试环境的代理层，避免 React 页面直接承担网络转发职责。

## 非目标

- 不支持把原端口 A 映射到目标端口 B。
- 不支持把 `http` 自动改为 `https`，或反向改写协议。
- 不支持改写路径、查询参数、请求方法或请求体。
- 不把该能力作为生产环境用户功能暴露。
- 不在本次设计中引入多条规则、多目标 IP 或复杂优先级编排；如后续需要，可在第一版稳定后扩展。
- 不绕过现有 `contract -> service -> route/component` 的数据访问分层。

## 范围级别

- 建议任务级别：`L2`
- 原因：该能力涉及本地调试 UI、运行时配置、请求代理适配和验证路径，会影响接口请求链路，但边界可限定在开发/测试调试能力内。

如果实现过程中需要改造所有 API client、引入新的常驻代理服务、影响生产构建或调整认证链路，应暂停并重新评估是否升级为 `L3`。

## 核心语义

调试代理启用后，对命中规则的 API 请求执行如下转换：

```text
原始 URL:   <protocol>://<original-host>:<original-port>/<path>?<query>
转发 URL:   <protocol>://<target-host>:<original-port>/<path>?<query>
```

示例：

| 原始请求 | 替换目标 IP | 转发目标 |
| --- | --- | --- |
| `http://192.168.1.20:8288/api/users` | `127.0.0.1` | `http://127.0.0.1:8288/api/users` |
| `http://10.0.0.5:3004/api/orders?status=open` | `192.168.1.88` | `http://192.168.1.88:3004/api/orders?status=open` |
| `https://api.example.test:8443/account/login` | `10.0.0.9` | `https://10.0.0.9:8443/account/login` |

无显式端口的 URL 按协议默认端口处理，但转发 URL 不主动补写默认端口：

- `http` 默认端口视为 `80`
- `https` 默认端口视为 `443`

## 拦截模式

### 全部拦截

全部拦截表示所有进入调试代理范围的 API 请求都会替换 host/IP。

第一版仍应限定“代理范围”，避免误拦截静态资源、第三方 SDK、地图、埋点或认证页面资源。建议默认只处理应用 API client 发出的请求，或只处理明确进入调试代理入口的请求。

### 端口拦截

端口拦截表示只有原请求端口在配置列表中时才替换 host/IP。

示例配置：

```text
替换目标 IP：127.0.0.1
端口列表：8288,3004
```

命中示例：

```text
http://192.168.1.20:8288/api/users -> http://127.0.0.1:8288/api/users
```

未命中示例：

```text
http://192.168.1.20:9000/api/users
```

### 正则拦截

正则拦截表示只有原始完整 URL 命中配置正则时才替换 host/IP。

第一版建议明确只匹配完整 URL 字符串，便于开发者用同一规则同时约束 host、port 和 path。例如：

```text
^http://192\.168\.1\.20:8288/api/order/.*
```

如后续发现完整 URL 正则使用成本过高，再增加“匹配对象：完整 URL / path”选项。

## 推荐架构

采用“Web 配置面板 + 开发代理层 IP 替换”的方案。

```text
Web 调试配置页面
  -> 读取和保存调试配置
  -> 提供 URL 命中预览
  -> 应用 API 请求进入代理适配层
  -> 代理层判断是否命中规则
  -> 命中后只替换 host/IP，保留原端口转发
```

React 页面不直接发起跨域转发。原因是浏览器层会受 CORS、HTTPS、Service Worker 作用域、绝对 URL 是否经过同源代理等限制；把转发放在 Vite dev server、Node middleware 或独立调试代理层更稳定。

## 配置模型

第一版配置保持单目标 IP 和单模式：

```ts
type DebugProxyMode = "all" | "ports" | "regex";

interface DebugIpRewriteProxyConfig {
  enabled: boolean;
  targetHost: string;
  mode: DebugProxyMode;
  ports: number[];
  pattern: string;
}
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `enabled` | 是否启用调试代理 |
| `targetHost` | 替换后的 host/IP，不包含协议、端口或路径 |
| `mode` | 当前拦截模式 |
| `ports` | 端口拦截模式使用，值为 `1-65535` 的端口号 |
| `pattern` | 正则拦截模式使用，第一版匹配完整原始 URL |

配置由开发代理层持有，第一版使用代理进程内存存储，并通过同源调试端点供 Web 配置页面读写。建议端点形态如下：

```text
GET /__debug/ip-rewrite-proxy/config
PUT /__debug/ip-rewrite-proxy/config
```

这样可以保证 UI 预览、保存校验和真实代理转发读取同一份配置。页面可以在浏览器侧保留未保存的表单草稿，但不把 `localStorage` 作为代理层的真实配置来源。

## UI 设计建议

页面核心控件：

- 调试代理开关：展示当前是否启用。
- 替换目标 IP：输入 host/IP，不接受协议、端口、路径。
- 拦截模式：使用分段控件展示 `端口拦截`、`正则匹配`、`全部拦截`。
- 模式字段：
  - 端口拦截：展示端口列表输入框。
  - 正则匹配：展示正则输入框。
  - 全部拦截：不展示额外必填字段。
- 规则预览：输入原始 URL，实时显示是否命中和转发目标。
- 操作按钮：保存、重置配置。

界面文案应避免“目标服务地址”，统一使用“替换目标 IP”或“替换目标 Host”。核心说明为：

> 命中规则后，仅替换请求目标 IP/Host，保留原协议、端口、路径和查询参数。

## 校验规则

- `targetHost` 必填。
- `targetHost` 不允许包含协议，例如 `http://` 或 `https://`。
- `targetHost` 不允许包含端口、路径、query 或 hash。
- 端口列表只允许 `1-65535` 的整数，支持英文逗号分隔。
- 正则模式下 `pattern` 必填，且必须能被 `RegExp` 正常编译。
- 保存前应通过规则预览复用同一套命中判断和 URL 重写逻辑，避免 UI 预览与代理行为分叉。

## 请求适配边界

需要在实施前确认当前应用请求形态：

- 如果请求统一走相对路径或同源 API 前缀，Vite/Node 代理较容易接管。
- 如果业务代码中存在直接请求 `http://ip:port/path` 的绝对 URL，浏览器会直接向该地址发起请求，普通 Vite proxy 不一定能拦截。

针对绝对 URL 场景，推荐在应用 API transport 层提供一个调试代理入口，让调试模式下的请求先进入同源代理，再由代理层执行 host/IP 替换和转发。该适配应集中在 `apps/web/src/lib/api` 或现有 API client 附近，不应散落到页面和 feature service 中。

## 备选方案

### 方案 A：开发代理层重写 host/IP

- 优点：稳定、可测试、规避浏览器 CORS 限制，接近真实后端请求行为。
- 缺点：需要在开发服务或本地代理层增加配置读取和转发逻辑。

最终推荐采用该方案。

### 方案 B：Service Worker 拦截后改写

- 优点：浏览器内配置体验轻，不需要额外代理服务。
- 缺点：作用域和生命周期复杂，跨域和 HTTPS 场景仍受限制，不适合作为第一版稳定能力。

### 方案 C：Monkey patch `fetch` 和 `XMLHttpRequest`

- 优点：实现快，适合临时 PoC。
- 缺点：覆盖面不完整，对第三方 SDK、SSE、WebSocket、表单提交和非 fetch 请求不稳定，也容易污染业务运行时。

不推荐作为正式实现。

## 验证计划

正式实现完成后至少验证：

- 配置模型和 URL 重写函数的单元测试：
  - 全部拦截命中。
  - 端口拦截命中和未命中。
  - 正则拦截命中和未命中。
  - 转发 URL 保留原协议、端口、路径和 query。
  - 非法目标 host、非法端口、非法正则被拒绝。
- Web UI 测试：
  - 不同模式只展示相关字段。
  - 规则预览与保存校验一致。
  - 重置配置恢复默认值。
- 类型检查和 lint：

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

如果代理层通过 E2E 覆盖，应补充一个最小 Playwright 用例验证用户可见的配置保存和预览行为；真实网络转发可用集成测试或代理层单元测试覆盖。

## 风险

- 绝对 URL 请求可能绕过普通 Vite proxy，需要先确认现有 API client 的请求路径。
- 如果调试代理误暴露到生产环境，可能造成安全风险或请求被错误转发。
- 如果允许任意目标 host，调试代理可能被误用为开放代理；实现时需要限制环境和可访问范围。
- 正则规则过于灵活，可能导致用户误配；规则预览和清晰错误提示是第一版必须项。
- HTTPS 证书、Host header、后端虚拟主机和 CORS 策略可能影响真实转发行为，需要在代理层明确处理策略。

## 验收标准

- 用户可以在 Web 调试页面启用或关闭 IP 替换代理。
- 用户可以配置替换目标 IP/Host，并选择全部拦截、端口拦截或正则拦截。
- 命中规则后，转发目标只改变 host/IP，不改变原端口。
- UI 能在保存前预览指定 URL 的命中结果和转发目标。
- 该能力默认只在开发或测试环境可用，生产环境不可启用。
- 文档、计划和测试覆盖能说明该能力不会改变业务 API 分层。

## 需要更新的文档

- 新增本 spec：`docs/specs/2026-06-08/debug-ip-rewrite-proxy-design.md`
- 后续进入实施前新增计划：`docs/plans/2026-06-08/debug-ip-rewrite-proxy.md`
- 如实现后形成长期调试代理约定，补充 `docs/standards/` 或 `docs/api/` 中的请求调试说明

## 修订后架构（2026-06-09 起为推荐方案）

### 持久化

```text
localStorage key: debug-ip-rewrite-proxy.config
{
  enabled: boolean
  targetHost: string          // e.g. "127.0.0.1"
  mode: "all" | "ports" | "regex"
  ports: number[]
  pattern: string
  baseUrls: { app, wms, mes, print: string }   // 完整绝对地址，env 仅为初始值
}
```

读取：`loadDebugIpRewriteProxyConfigFromStorage()`。localStorage 不可用 / JSON 损坏 / normalize 抛错时回退到 `normalizeDebugIpRewriteProxyConfig({})`，不阻塞页面或请求。

写入：`saveDebugIpRewriteProxyConfigToStorage(config)`，先 `normalizeDebugIpRewriteProxyConfig` 校验再写。

### Transport 改写流程

```text
getAppClient() / getWmsClient() / getMesClient() / getPrintClient()
  ↓
createFetchTransport({ baseUrl: () => resolveXxxBaseUrl(), getToken })
  ↓
每次请求：
  1. resolveXxxBaseUrl() → config.baseUrls[xxx] || env 兜底
  2. 若 config.enabled && baseUrl === "" → 抛 "启用 IP 替换代理时..."
  3. 用 baseUrl 构造绝对 URL
  4. 若 config.enabled && shouldRewrite(url) → url.hostname = targetHost
  5. fetch
```

MSW 路径下 `createFetchTransport()` 不传 baseUrl，rewrite 自然 no-op，无需特判。

### 行为约定

- env 缺失不再是硬错误：所有 4 个 client 的「env 未配置抛错」逻辑被移除。env 缺失的请求会变成相对 URL（落到 dev server 或生产静态服务器），由调用方承担后果。
- Bearer token 随改写后的 host 一起发出。spec 修订记录已注明：不要把代理指向不信任的 host。
- 跨 tab 同步：每次请求都重读 localStorage，天然跨 tab 同步；不引入 pub/sub。
- 生产环境不关停 UI：用户希望在 prod 也能调试，故路由、侧边栏、布局入口**不再**加 `import.meta.env.DEV` gate（与原验收标准「生产环境不可启用」相违，是有意的偏差）。

### 失败兜底

| 场景 | 行为 |
| --- | --- |
| `config.enabled === true` 且某 baseUrl 为空 | transport 抛错，UI 显示警告横幅 |
| localStorage 损坏 / 不可用 | load 回退到 env 默认 + `defaultDebugIpRewriteProxyConfig` |
| 规则正则编译失败 | `normalize` 抛错，保存被阻止，UI 显示该错误 |
| `targetHost` 含协议/端口/路径 | `normalize` 抛错，保存被阻止 |

### 改动文件范围（相对原 spec 方案）

删除：
- `apps/web/vite/debug-ip-rewrite-proxy-plugin.ts`
- `apps/web/vite.config.test.ts`
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-service.{ts,test.ts}`

修改：
- `apps/web/vite.config.ts`（移除 `server.proxy` 块与插件 import）
- `apps/web/src/lib/api/http-client.ts`（`createFetchTransport` 支持 lazy `baseUrl`）
- `apps/web/src/lib/api/{app,wms,mes,print}-client.ts`（统一改用 `resolveXxxBaseUrl`）
- `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy.ts`（配置模型 + `baseUrls`）
- `apps/web/src/features/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-page.tsx`（localStorage + baseUrl 输入）
- `apps/web/src/i18n/resources/{zh-CN,en-US}/common.ts`（新增 baseUrl 相关 key）

新增：
- `apps/web/src/lib/debug-ip-rewrite-proxy/debug-ip-rewrite-proxy-config-store.{ts,test.ts}`
- `docs/plans/2026-06-08/debug-ip-rewrite-proxy.md`（实施计划）

