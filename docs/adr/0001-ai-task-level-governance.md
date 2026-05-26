# ADR-0001 使用任务分级治理 AI 改动风险

日期：2026-05-25

## 状态

Accepted

## 背景

仓库目标是支持 AI 参与日常开发，同时保持改动可理解、可验证、可回溯。没有任务分级时，AI 容易把局部问题扩大成跨边界重构，也容易在缺少验证证据时宣称完成。

## 决策

仓库采用 `L0`、`L1`、`L2`、`L3` 四级任务治理模型：

- `L0`：局部低风险改动，可直接执行，但必须有最小验证。
- `L1`：单一目标的常规改动，先明确目标、锚点、假设、验证和非目标。
- `L2`：跨文件行为、路由、数据流、共享边界等中等风险改动，必须先有 spec 或 plan。
- `L3`：依赖、CI、部署、安全、跨 workspace 重构等高风险改动，必须人工主导。

如分级存在争议，默认按更高风险级别处理。AI 无权自行把任务降级。

## 后果

- 正向影响：AI 执行前先明确范围和验证，减少误改、漏测和无控制扩张。
- 约束或成本：中等以上改动会增加文档前置成本。
- 后续触发条件：如果仓库引入完整 issue 流程或自动化任务系统，需要把分级模型映射到对应工作流。

## 关联

- Spec：[../specs/2026-05-25-ai-driven-development-governance-design.md](../specs/2026-05-25-ai-driven-development-governance-design.md)
- Runbook：[../ai/runbooks/ai-development-runbook.md](../ai/runbooks/ai-development-runbook.md)
