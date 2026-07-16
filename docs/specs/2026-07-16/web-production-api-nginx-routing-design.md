# Web 生产 API 同源路由与调试直连设计

## 背景

`apps/web/.env.production` 当前把 App、WMS、MES、Print API 固定为
`192.168.0.135` 上的绝对地址。Vite 会在构建时把 `VITE_*` 环境变量写入静态
产物，因此同一个前端压缩包无法直接部署到其他服务器并访问该服务器上的 API。

项目已经在开发环境使用 `/api/app`、`/api/wms`、`/api/mes`、
`/api/print` 同源前缀，但生产环境和 Nginx 示例尚未采用同一边界。同时，生产
环境保留了浏览器端 IP 替换调试功能：用户可以为四个 API 设置绝对 Base URL，
再仅替换目标 host，保留协议、端口、路径和查询参数。

## 目标

让同一份 Web 构建产物可以部署到多台服务器，正常请求由部署服务器的 Nginx
选择真实 API 地址，同时保留显式启用后绕过 Nginx 的 IP 替换调试能力。

## 非目标

- 不修改 Vite 开发代理、MSW 或 API mock 行为。
- 不调整 `Transport -> HttpClient -> feature service` 数据访问分层。
- 不修改业务接口路径、认证 token、Print 租户字段或 AI `/api/ai` 路径。
- 不在本次任务中修改或 reload 实际部署服务器的 Nginx。
- 不为 Nginx 引入服务发现、主动健康检查或配置中心。

## 范围级别

任务级别为 `L2`。变更同时影响生产构建配置、四个 API client 的运行时地址
优先级、浏览器调试配置校验、Nginx 部署边界和长期文档。

## 受影响边界

- 构建配置：生产 `VITE_*_API_BASE_URL` 从绝对地址改为 `/api/*`。
- 请求数据流：生产正常模式走同源 Nginx，调试模式走浏览器直连。
- 浏览器状态：localStorage 只在调试代理启用时影响 API Base URL。
- 部署配置：Nginx 按 App、WMS、MES、Print 四个 upstream 分流。
- 用户界面：调试开启时要求四个完整 HTTP(S) Base URL。

## 建议方案

### 生产正常模式

```text
Browser /api/mes/WorkOrderApi/Query
  -> current host Nginx
  -> mes_api upstream
  -> /WorkOrderApi/Query
```

`.env.production` 固定使用：

```env
VITE_API_BASE_URL=/api/app
VITE_WMS_API_BASE_URL=/api/wms
VITE_MES_API_BASE_URL=/api/mes
VITE_PRINT_API_BASE_URL=/api/print
```

Nginx 为四个前缀配置独立 upstream。`proxy_pass` 使用尾斜杠去掉
`/api/<service>/` 前缀。未来迁移单个 API 时，只修改对应 upstream 的
`server` 地址并 reload Nginx，不重新构建前端。

### 调试直连模式

调试代理关闭时，四个 client 始终使用环境变量，忽略 localStorage 中保存的
Base URL。调试代理开启时，四个 localStorage Base URL 必须全部是
`http://` 或 `https://` 绝对地址；请求先使用该绝对地址拼接业务路径，再按
现有 all、ports 或 regex 规则替换 hostname。

地址优先级固定为：

| 环境 | 调试代理 | Base URL 来源 |
| --- | --- | --- |
| DEV | 任意 | 环境变量，由 Vite proxy 处理 |
| PROD | 关闭 | 环境变量中的 `/api/*` |
| PROD | 开启 | localStorage 中对应的绝对 Base URL |

生产环境的相对 `/api/*` 不能作为调试 Base URL 默认值。读取默认值时只保留
绝对 HTTP(S) 环境变量；相对值转换为空，要求用户显式填写可信的直连目标。

### 非法配置处理

- UI 在调试开启且任一 Base URL 非绝对 HTTP(S) URL 时显示双语警告并禁用保存。
- normalize 在调试开启时执行同样校验，避免绕过 UI 保存非法配置。
- 损坏或旧的非法 localStorage 配置继续按现有容错策略回退到默认关闭状态。
- Bearer token 会发送到调试目标；调试地址只能指向可信且支持 CORS 的 API。

## 备选方案

### 每个部署目标重新构建

由流水线为每台服务器注入绝对地址。该方案仍产生多份环境绑定产物，不能满足
“构建一次、多处部署”，不采用。

### 浏览器根据 `window.location.hostname` 拼接端口

该方案把端口拓扑、HTTP/HTTPS 和主机规则重新带回前端，并容易产生混合内容和
证书问题，不采用。

### 调试模式替换 Nginx 主机

该方案要求目标服务器部署完全一致的 `/api/*` 路由，并把匹配端口从真实 API
端口改为 80/443，会改变现有 IP 替换语义，不采用。

## 验证计划

- 单元测试覆盖绝对 URL 校验、默认值过滤、旧配置回退和地址优先级。
- 四个 client 分别验证正常模式忽略旧 localStorage、调试模式直连并替换 host。
- 页面测试验证非法配置警告、保存禁用和合法配置保存。
- 运行 Web 测试、类型检查、lint、构建和 `pnpm verify:web`。
- 部署阶段在实际服务器执行 `nginx -t`、reload 和四个 API 的正常/调试烟测。

## 风险

- Nginx 尾斜杠配置错误会导致后端收到 `/api/<service>` 前缀。
- 关闭调试时若仍读取旧 localStorage，会破坏构建产物的环境无关性。
- 调试直连会把 Bearer token 发往目标 host，必须限制为可信内网 API。
- 远端 HTTPS upstream 若依赖虚拟主机，需要部署侧额外配置 SNI 和 Host。

## 需要更新的文档

- `docs/plans/2026-07-16/web-production-api-nginx-routing.md`
- `docs/adr/0006-web-production-api-routing.md`
- `apps/web/README.md`
- `deploy/nginx/standard-scaffold.conf.example`
