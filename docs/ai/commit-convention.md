# Commit 规范（硬性约束）

> 本文件是本仓库 commit message 的**单点定义**，作为硬性约束执行。`AGENTS.md` 的「提交规范」段与 `scripts/worktree-add.sh` 的分支前缀校验均以本文件为准；三者出现冲突时以本文件为准并同步回写。

## 1. 格式

每条 commit 的标题行统一为：

```text
<type>(<scope>): <说明>
```

- `type`：**必填**，取值限下方白名单。
- `(scope)`：可选，标注受影响的模块 / 目录；允许二级路径。
- `<说明>`：**必填**，一句话描述本次改动，见「说明语言约束」。
- Merge commit 保留 Git 默认格式（`Merge branch '...'`），不受本规范约束。

## 2. type 白名单（硬约束）

只允许以下前缀，与 `scripts/worktree-add.sh` 的 `ALLOWED_PREFIXES` 保持一致：

| type | 含义 |
|---|---|
| `feat` | 新增功能 |
| `fix` | 修复缺陷 |
| `opt` | 优化（体验 / 性能等非功能性改进；本仓自定义，非标准 Conventional Commits 前缀） |
| `docs` | 文档改动 |
| `refactor` | 重构（不改变外部行为） |
| `chore` | 杂务（依赖、构建、配置等） |
| `test` | 仅测试相关改动 |

- 不得使用白名单以外的 type。
- 新增 type 前缀属于长期约定变更，需按 L3 流程处理，并**同时**更新本文件与 `scripts/worktree-add.sh`。

## 3. scope 约定

- scope 使用模块或目录名，例如 `web`、`web-e2e`、`ui`、`eslint-config`、`typescript-config`、`governance`、`ci`。
- 允许二级路径表达更精确的范围，例如 `web/data-import`、`governance/branch`。
- scope 可省略（如影响面为全仓的 `chore: pnpm install`）。

## 4. 说明语言约束（硬约束）

- `<说明>` 部分**必须使用中文**。
- 专有名词与业界约定的英文词汇**保留英文**，不强行翻译，例如：`E2E`、`URL`、`shadcn`、`Vitest`、`Playwright`、`pnpm`、`verify:fast`、组件名 / 命令名 / 文件名 / 标识符等。
- 目的：说明可读、检索友好，同时不破坏技术术语的准确性。

示例：

```text
feat(web): 增加 verify 局部验证脚本
fix(web): 修正 DataImportDialog 列宽在窄屏下溢出
opt(web): 列表筛选面板首屏渲染延迟优化
docs(governance): 引入 branch-strategy.md 与 commit-convention.md 单点定义
chore(scripts): 引入 worktree-add.sh wrapper 与 PreToolUse hook
refactor(ui): 拆分 AppDialog 标题区为独立子组件
test(web-e2e): 补充登录后路由跳转的回归用例
```

## 5. 与计划的关联

- 触及正式 spec / plan 或分级任务切片的改动，应在说明末尾附任务编号 `(Px.x)`，或在说明中点明对应 spec / plan，例如 `feat(web): 补齐 verify:fast / verify:full 双档入口 (P1.5)`。
- PR 描述需包含：简要摘要、变更路径、已执行的验证（命令 + 退出码 + 关键输出）、关联的计划章节。

## 6. 分支命名

- 新建分支名必须以 type 白名单前缀开头并接 `/`，例如 `feat/`、`fix/`、`opt/`、`docs/`、`refactor/`、`chore/`、`test/`。
- 该约束由 `scripts/worktree-add.sh` 在创建 worktree 时硬校验（非白名单前缀直接非零退出）。
- 分支名以 `/` 开头不符合约定，会被 wrapper 拒绝。