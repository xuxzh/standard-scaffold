# ADR-0006 使用 Nginx 提供 Web 生产 API 同源路由

日期：2026-07-16

## 状态

Accepted

## 背景

Vite 的 `VITE_*` 环境变量在构建时写入静态产物。生产环境把 API 主机写成固定
IP 时，同一份 Web 构建产物无法部署到其他服务器并自然访问该服务器上的 API。

Web 同时保留浏览器端 IP 替换调试能力。该能力需要使用真实后端的绝对 Base URL，
仅替换 hostname 并保留端口、路径和查询参数，因此不能把普通生产同源路由和调试
直连混为同一地址来源。

## 决策

- 生产构建的 App、WMS、MES、Print Base URL 固定使用 `/api/app`、
  `/api/wms`、`/api/mes`、`/api/print`。
- 部署服务器的 Nginx 负责把四个前缀转发到独立 upstream，并移除固定前缀。
- 单个 API 迁移到其他服务器时，只修改对应 upstream，不重新构建 Web。
- 调试代理关闭时，生产 client 忽略 localStorage 中保存的 API Base URL。
- 调试代理开启时，四个 Base URL 必须全部是绝对 HTTP(S) URL；浏览器绕过
  Nginx 直连目标 API，再应用现有 host 替换规则。
- DEV 继续以环境变量和 Vite proxy 为单一来源，不读取生产调试覆盖。
- 调试目标必须是可信且支持 CORS 的 API，因为 Bearer token 会随请求发送。

## 后果

- 正向影响：同一份前端产物可以部署到多台服务器。
- 正向影响：后端本机、远端或容器地址只属于部署配置。
- 正向影响：正常生产请求保持同源，不需要浏览器 CORS 配置。
- 约束或成本：每个部署环境必须维护正确的 Nginx upstream。
- 约束或成本：调试直连仍受 CORS、HTTPS 证书和目标可信性约束。
- 约束或成本：远端 HTTPS 虚拟主机可能需要额外配置 SNI 和 Host。

## 关联

- Spec：[Web 生产 API 同源路由与调试直连设计](../specs/2026-07-16/web-production-api-nginx-routing-design.md)
- Plan：[Web 生产 API 同源路由与调试直连实施计划](../plans/2026-07-16/web-production-api-nginx-routing.md)
- ADR：[使用 Axios 实现 Web Transport](0004-web-axios-transport.md)
- ADR：[明确 MES 包装与 WMS 基础设施边界](0005-mes-packaging-wms-infrastructure-boundary.md)
