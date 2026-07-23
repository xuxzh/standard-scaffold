# 分支与 worktree 策略

> **这是单点定义文件**。所有改动前的分支检查、worktree 选择、命名约定都按此文件。

## 主分支保护

`main` / `master` 只作为稳定集成分支，任何等级的任务都不得在其上进行实质性编辑或提交。实质性编辑前必须先：

1. 运行 `git branch --show-current` 确认当前分支。
2. 运行 `git status --short` 确认工作区状态。
3. 运行 `git worktree list` 确认已有工作目录和分支。
4. 已位于本任务 worktree 时继续工作；位于主分支时先按下方规则创建并进入隔离 worktree。

"L0 允许直接执行" 只表示无需 task packet、spec 或 plan，不表示可以绕过本节主分支保护。

## 分支命名约定

- 默认使用任务分支，分支名格式：`<prefix>/<task-slug>`
- `<prefix>` 按**改动类型**而非 AI 工具（避免分支名锁定到具体 AI 厂商）；与 `scripts/worktree-add.sh` 的 `ALLOWED_PREFIXES` 保持一致：

  | 前缀 | 适用改动 |
  |---|---|
  | `feat/` | 新功能、可见行为新增 |
  | `fix/` | 缺陷修复 |
  | `opt/` | 性能 / 体验优化 |
  | `docs/` | 纯文档改动 |
  | `refactor/` | 重构（行为不变） |
  | `chore/` | 仓库级维护（依赖 / 构建 / 配置） |
  | `test/` | 仅补测试 |

- `<task-slug>` 使用小写字母、数字和短横线，长度控制在 3-6 个单词
- 同一任务内的多次提交可保留在同一分支，避免无意义的分支膨胀
- 不使用 AI 工具代号作为前缀（如 `codex-` / `claude-` / `cursor-`）；历史 plan / spec 中已记录的 `codex-*` 分支名保持原样，作为真实历史；新建任务一律按约定式前缀命名

## worktree 使用约定

任何等级（`L0` / `L1` / `L2` / `L3`）的任务，开始实质性编辑前都必须进入 `.worktrees/{branch-name}/` 下的独立 worktree；不再按等级或并发性区分是否创建 worktree（详见 [ADR-0007](../adr/0007-all-levels-worktree.md)）。

worktree 路径示例：

```text
{repo-root}/.worktrees/{branch-name}/
```

约定式分支名包含 `/`，不适合直接做目录名（会产生嵌套目录）。worktree 目录用不带斜杠的 slug（如 `.worktrees/<task-slug>`），分支用带前缀的约定式名（如 `feat/<task-slug>`）。

- worktree 一律通过 `scripts/worktree-add.sh`（或 `pnpm worktree:add`）创建；Claude Code 内 `git worktree add` 由项目级 `PreToolUse|Bash` hook 自动改写为 wrapper 调用，禁止绕开 wrapper（见 `AGENTS.md` AI 工作规则 11）。
- worktree 默认放在仓库根目录下的 `.worktrees/`；只有磁盘空间、权限或特殊调试环境要求时，才放到其他位置，并在任务记录或文档中说明原因。
- 已经位于本任务 worktree 时继续使用，不创建嵌套 worktree。

每个会话按以下顺序选择：先运行 `git branch --show-current`、`git status --short`、`git worktree list` 确认当前目录和已有 worktree；已在本任务 worktree 则继续使用；否则通过 `scripts/worktree-add.sh` 创建本任务的 `.worktrees/{branch-name}/` worktree 后进入。

worktree 只隔离工作目录，不消除不同任务修改相同行时的 Git 集成冲突，也不隔离开发服务端口或测试数据库；这些冲突由各任务在集成和验证阶段处理。

## 会话起点（L2 / L3 多 session 串行）

L2 / L3 任务的正式 spec / plan 放在 `docs/specs/` 与 `docs/plans/`；本仓库不在 `docs/superpowers/` 下建立同名 spec / plan 目录。每个新 session 启动时：

1. **必须**确认当前在哪个任务分支 / worktree 上（`git branch --show-current`）
2. **必须**从仓库文档读取上一 session 的交付物
3. **不允许**依赖会话历史推断上一 session 意图；新 session 没有上一 session 的记忆

L0 / L1 任务保持单 session；本节约束不向下传递。

## 汇报要求

每次任务汇报中**必须**说明：

- 实际使用的 worktree 路径与任务分支名
- 当前变更等级（`L0` / `L1` / `L2` / `L3`）
- L2 任务当前是哪个 session（规划 / 实施 / 评审）；L3 任务当前是哪个 session（设计 / 计划 / 实施 / 评审）
- 列出执行过的验证命令与退出码
- 列出未执行的验证及其原因
- L3 任务的"已批准"信号来源（issue / 评论 / 显式消息）

## 关联

- 任务分级与治理基线：[./ai-development-governance.md](./ai-development-governance.md)
- 提交规范：[./commit-convention.md](./commit-convention.md)
- ADR：[../adr/0001-ai-task-level-governance.md](../adr/0001-ai-task-level-governance.md)、[../adr/0007-all-levels-worktree.md](../adr/0007-all-levels-worktree.md)