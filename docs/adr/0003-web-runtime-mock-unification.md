# ADR-0003 收敛 Web 运行时 Mock 到 MSW

日期：2026-05-27

## 状态

Accepted

## 背景

`apps/web` 运行时同时存在 app client 内存 mock 和 `msw` browser mock，导致运行时行为不一致、调试体验混乱，并增加同一接口的重复维护成本。

## 决策

- `apps/web` 的运行时 mock 统一走 `fetch + msw`。
- `createMockTransport` 仅保留给测试 seam。
- `app-client.ts` 与 `wms-client.ts` 不再提供运行时内存 mock 回退。
- 未开启 mock 且缺少必要 base URL 时，直接暴露配置错误。

## 后果

- 正向影响：浏览器调试、E2E 和本地联调对运行时请求的观察方式一致。
- 约束或成本：开发环境必须明确选择 mock 模式或真实 API 配置，不能再依赖静默回退假数据。
- 后续触发条件：如未来引入 SSR、Node 侧渲染或服务端测试运行时，需要重新评估 `msw` 在非浏览器上下文中的 adapter 设计。
