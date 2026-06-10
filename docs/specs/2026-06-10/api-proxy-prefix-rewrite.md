# API 开发代理前缀重写设计

## 目标

本地开发时，浏览器通过 Vite 前端端口访问同源 API 路径，并由 Vite 将请求转发到各服务的真实地址。转发时移除用于区分服务的前端代理前缀。

## 路径规则

四个已有代理分别应用固定的前缀重写：

- `/api/app/xxx` 转发为 `${DEV_API_PROXY_TARGET}/xxx`
- `/api/wms/xxx` 转发为 `${DEV_WMS_API_PROXY_TARGET}/xxx`
- `/api/mes/xxx` 转发为 `${DEV_MES_API_PROXY_TARGET}/xxx`
- `/api/print/xxx` 转发为 `${DEV_PRINT_API_PROXY_TARGET}/xxx`

例如：

```text
http://127.0.0.1:5173/api/mes/xxx
```

转发为：

```text
http://192.168.0.135:8282/xxx
```

## 实现

在 `apps/web/vite.config.ts` 的四个专用代理配置中分别添加 `rewrite`。每个规则只移除自己对应的固定前缀，保留后续路径和查询参数。

继续沿用现有环境变量和目标地址默认值，不新增环境变量，不改变目标地址的覆盖优先级。

## 验证

扩展 `apps/web/vite.config.test.ts`，直接调用四个代理的 `rewrite`，确认：

- 对应前缀被移除。
- 后续路径保持不变。
- 四个代理仍使用各自的目标地址。

完成后运行 Web 应用的定向 Vite 配置测试，并在本地页面触发一次请求，确认浏览器请求仍使用 `/api/<servicePrefix>/...`。

## 非目标

- 不添加 `/api/:servicePrefix/*` 通用兜底代理，因为无法从服务前缀可靠推导目标端口。
- 不修改生产环境 API 地址。
- 不调整 API client、业务 service 或接口路径常量。
- 不提交开发者本机的 `.env.local`。
