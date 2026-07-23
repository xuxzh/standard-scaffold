# ADR-0007 所有任务等级统一使用 worktree

日期：2026-07-23
适用等级：全部

## 状态

Accepted

## 修订记录

> 当前无修订。

## 背景

`AGENTS.md` 与 `docs/ai/ai-development-governance.md`（2026-05-25 初版，详见 [ADR-0001](./0001-ai-task-level-governance.md)）规定：`L0` / `L1` 默认使用独立任务分支（如 `feat/<task-slug>`），`L2` / `L3` 默认使用 `.worktrees/` 下的仓库级 worktree。该混合模型要求每个 `L0` / `L1` 会话判断"主工作目录是否被其他活动任务占用 / 独占状态是否明确"——判断依赖会话自知状态，是既有的成本与出错来源；同时 "L0 允许直接执行" 易被误读为允许绕过主分支保护。

考虑过继续保留初版混合模型（拒绝：占用判断成本仍在，且 "L0 直接执行" 的边界模糊已实际触发误改）、局部修订初版治理文档（拒绝：本次是对 Accepted 决策的整体反转，应新增 ADR 取代以保留决策历史）。

## 决策

1. `main` / `master` 只作为稳定集成分支，任何等级都不得在其上进行实质性编辑或提交。
2. 任何等级（`L0` / `L1` / `L2` / `L3`）的任务在开始实质性编辑前，都必须进入 `.worktrees/{branch-name}/` 下的独立 worktree。
3. 取消按等级或并发性决定是否创建 worktree 的分流判断。
4. worktree 一律通过 `scripts/worktree-add.sh`（或 `pnpm worktree:add`）创建；禁止绕开 wrapper。
5. 已位于本任务 worktree 时继续使用，不创建嵌套 worktree。
6. 本决策只隔离工作目录，不解决 Git 集成冲突、端口冲突或测试数据库冲突。
7. 本 ADR 整体取代 `AGENTS.md` 2026-05-25 初版中 "L0/L1 默认独立任务分支、L2/L3 默认 worktree" 的分流模型。

### 硬约束范式

> **在任何等级任务开始实质性编辑之前**，AI 必须 **先进入 `.worktrees/{branch-name}/` 下的独立 worktree（经 `scripts/worktree-add.sh` 创建）**；**汇报实际 worktree 路径与分支**于任务汇报；**缺少隔离 worktree 时 AI 必须停在 "未进入实施"**。

## 后果

- 正向影响：选择规则最简单、隔离最强，消除"主工作目录是否被占用"的判断与出错；与 `@report-platform/` 的 ADR-0010 修订对齐，便于多仓协同工作流。
- 约束或成本：所有 `L0` 单文件小改动也需一次 worktree 创建成本；用户已明确接受此取舍。
- 后续触发条件：若统一 worktree 造成明显效率问题，再评估分级豁免；本 ADR 不预先引入自动化。

## 关联

### 前置 ADR

- [ADR-0001](./0001-ai-task-level-governance.md)：任务分级来源。

### 基线文档

- [../ai/branch-strategy.md](../ai/branch-strategy.md)：完整执行规则的单点定义。
- [../ai/commit-convention.md](../ai/commit-convention.md)：commit 规范与前缀白名单。
- [../ai/ai-development-governance.md](../ai/ai-development-governance.md)：治理基线，本次同步更新。
- [../ai/runbooks/ai-development-runbook.md](../ai/runbooks/ai-development-runbook.md)：本次同步更新的实操 runbook。