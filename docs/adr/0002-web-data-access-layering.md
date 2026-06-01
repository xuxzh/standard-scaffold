# ADR-0002 保持 Web 数据访问分层

日期：2026-05-25

## 状态

Accepted

## 背景

`apps/web` 是可复用前端脚手架的主应用。随着远程数据能力增加，如果页面直接发请求或自行处理错误，后续 AI 改动会更难判断数据边界，也更容易造成重复实现和测试遗漏。

## 决策

新增远程资源时，默认沿用 `contract -> service -> route/component` 路径：

- `contract` 定义资源类型、响应形状和稳定 mock 数据。
- `service` 负责调用应用级 client，并暴露 query hook 或读取入口。
- `route/component` 只消费 service 暴露的接口，不直接依赖底层 transport。
- 通用 transport、错误归一化和测试注入能力继续放在 `apps/web/src/lib/api`。

除非有新的 spec 明确改变边界，否则不要在 route 或通用 UI 组件中直接新增请求逻辑。

## 后果

- 正向影响：数据读取路径更稳定，AI 可以从 contract 和 service 两个锚点理解变更。
- 约束或成本：简单页面也需要先补齐 contract 和 service。
- 后续触发条件：接入真实 API、运行时 schema 校验或 API 代码生成时，应更新本 ADR 或新增 ADR。

## 关联

- Spec：[../specs/2026-05-25/web-operations-and-data-access.md](../specs/2026-05-25/web-operations-and-data-access.md)
- Runbook：[../ai/runbooks/ai-development-runbook.md](../ai/runbooks/ai-development-runbook.md)
