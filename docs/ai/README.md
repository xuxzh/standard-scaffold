# AI 开发工作区指南

这个目录承载仓库内 AI 驱动开发的长期上下文。默认工作方式不是“先让 AI 写代码”，而是“先明确边界，再让 AI 在边界内执行”。

## 从哪里开始

- AI 上下文索引：`context-index.md`
- 治理基线：`../specs/2026-05-25-ai-driven-development-governance-design.md`
- 实施计划：`../plans/2026-05-25-ai-driven-development-governance.md`
- 仓库高频规则：`../../AGENTS.md`

## 变更级别速记

- `L0`：局部低风险改动，例如文案、样式微调、局部测试修复。
- `L1`：单一目标的常规改动，通常只在一个子系统内扩展既有模式。
- `L2`：中等风险改动，涉及跨文件行为、路由流转、数据流或共享边界变化，先写 spec 或 plan。
- `L3`：高风险改动，例如依赖升级、CI、部署、安全、跨 workspace 重构，必须人工主导。

## 完成定义

只有同时满足以下条件，才能称为完成：

- 目标范围没有无控制扩张
- 改动与任务级别匹配
- 必要验证已经执行
- 没有新增与改动直接相关的错误
- 触及长期约定时，文档已经同步更新

## 日常入口

- 新功能或中等改动：先看治理基线，再从 `templates/feature-spec-template.md` 或 `templates/implementation-plan-template.md` 开始；如果当前会话没有对应技能，就直接按模板执行。
- 小型缺陷修复：从 `templates/bugfix-brief-template.md` 开始，先写现象、预期和假设。
- `L1` 级工作包：从 `templates/task-packet-template.md` 开始，明确锚点、验证和非目标。
- 评审：使用 `checklists/ai-review-checklist.md`。
- 常见执行陷阱和验证习惯：查看 `runbooks/ai-development-runbook.md`。

## 目录说明

- `context-index.md`：AI 新会话进入仓库时的导航地图
- `../specs/`：设计和边界文档
- `../plans/`：可执行实施计划
- `templates/`：功能说明、实施计划、缺陷修复和任务包模板
- `checklists/`：评审和验收清单
- `runbooks/`：高频运行约定和排障提示

## 默认验证基线

按风险等级选择验证，不要求所有改动都跑完整基线。默认完整基线如下：

- `pnpm verify`

该命令等价于以下分步检查：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web-e2e test:e2e`
- `pnpm build`

局部验证入口：

- `pnpm verify:web`
- `pnpm verify:e2e`

常用收敛方式如下：

- `L0`：至少跑与改动直接相关的最小检查
- `L1`：跑被修改那一层的测试或类型检查
- `L2`：覆盖静态检查、类型检查和受影响功能测试；主链路变化时补 E2E
- `L3`：在完整基线外，再人工确认验证范围是否足够

## 使用规则

- 不要把聊天记录当作仓库知识库。
- 不要在没有验证结果时宣称改动完成。
- 不要在没有明确批准时推进高风险改动。
- 如果某个坑未来大概率重复出现，把它写进运行手册或仓库记忆，而不是只留在一次对话里。
