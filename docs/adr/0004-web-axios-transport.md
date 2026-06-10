# ADR-0004 使用 Axios 实现 Web Transport

日期：2026-06-10

## 状态

Accepted

## 背景

Web 应用已经通过 `Transport -> HttpClient -> feature service` 隔离底层请求实现。
随着请求头、追踪和其他 transport 级横切需求增长，继续直接扩展原生 fetch
adapter 会重复实现 Axios 已提供的实例与拦截器机制。

## 决策

- App、MES、WMS、Print client 的默认 transport 使用 Axios。
- Axios 显式使用 fetch adapter，保持 MSW、`AbortSignal` 和浏览器网络调试路径。
- feature、route 和组件不得直接依赖 Axios，继续调用应用级 client 或 service。
- 请求拦截器只承载通用 transport 横切能力，例如动态 base URL、IP 改写、
  token 和通用请求头。
- 不开放 feature 级全局拦截器注册 API。新增横切能力必须在 `lib/api` 集中设计并
  测试。
- Axios 使用 `validateStatus: () => true`。401 刷新、请求重放、HTTP 错误、
  `DataResult` 校验和业务错误仍由 `HttpClient` 负责。
- `Transport`、`TransportRequest`、`TransportResponse` 和测试注入 API 保持
  稳定。

## 后果

- 正向影响：后续可在稳定边界内增加拦截器，不向业务层扩散 Axios 类型和异常。
- 正向影响：现有 service、React Query、MSW 和 transport 测试替身无需迁移。
- 约束或成本：Axios 成为 Web 应用的运行时依赖；升级时必须验证 fetch adapter
  和拦截器行为。
- 约束或成本：不能在 feature 中为了局部便利直接修改共享 Axios 实例。

## 关联

- ADR-0002：[保持 Web 数据访问分层](0002-web-data-access-layering.md)
- ADR-0003：[收敛 Web 运行时 Mock 到 MSW](0003-web-runtime-mock-unification.md)
- Spec：[Axios Transport 统一迁移设计](../specs/2026-06-10/axios-transport-migration.md)
