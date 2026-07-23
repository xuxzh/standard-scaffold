# AI 开发运行手册

## 目的

记录那些会重复出现的执行事实、验证习惯和仓库陷阱，不让它们只留在聊天记录里。

## 默认完整验证基线

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web-e2e test:e2e`
- `pnpm build`

不是所有改动都要跑完整基线；按风险等级收敛，但不要低于任务所需的最小验证。

## 合并前验证强度

- 纯文档改动：先确认 diff 仅包含 `docs/`、README 或说明文档，再做文档自检、占位符扫描和 Git 状态确认；不要求运行完整 `pnpm verify`。
- Web 代码改动：运行与改动直接相关的单元测试，并按影响面补充 `pnpm --filter @repo/web typecheck` 和 `pnpm --filter @repo/web lint`。
- 工具链、依赖、构建、CI 或环境配置改动：运行完整验证，或在有明确原因时运行覆盖同等风险面的替代命令。
- 如果验证失败且失败点与当前 diff 无关，应标注为基线失败，说明失败文件和命令，再由用户决定是否继续合并或先修复基线。

## 分支与 worktree 选择

- 实质性编辑前先运行 `git branch --show-current` 和 `git status --short`，确认当前分支和工作区状态。
- `main` / `master` 只作为稳定集成分支，任何等级都不得在其上直接提交开发改动。
- 所有等级（`L0`/`L1`/`L2`/`L3`）的任务在实质性编辑前都必须进入 `.worktrees/{branch-name}/` 下的独立 worktree；不允许在主工作目录直接切任务分支（详见 [ADR-0007](../../adr/0007-all-levels-worktree.md)）。
- worktree 一律通过 `scripts/worktree-add.sh`（或 `pnpm worktree:add`）创建。Claude Code 内 `git worktree add` 由项目级 `PreToolUse|Bash` hook 自动改写为 wrapper 调用（兼容 `rtk ` 前缀）；复合命令 / `git -C` 形式的 `git worktree add` 会被 hook `deny`，请改用独立命令或 `pnpm worktree:add`。
- 分支前缀白名单由 wrapper `ALLOWED_PREFIXES` 硬校验：`feat/` `fix/` `opt/` `docs/` `refactor/` `chore/` `test/`。非白名单前缀在 worktree 创建前 `exit 1`。
- 约定式分支名含 `/`，worktree 目录用不带斜杠的 slug（如 `.worktrees/<task-slug>`），分支用带前缀的约定式名（如 `feat/<task-slug>`）。历史 plan/spec 中已记录的 `codex-*` 名保持原样。
- 仓库级 worktree 默认创建在仓库根目录下的 `.worktrees/`；只有磁盘空间、权限或特殊调试环境要求时，才放到其他位置，并在任务记录或文档中说明原因。
- 汇报结果时说明实际使用的 worktree 路径与分支名，并列出执行过的验证命令。详见 [branch-strategy.md](../branch-strategy.md)。

## 什么时候从直接执行升级到 spec 或 plan

- 跨文件行为变化，例如一个修复同时改变了组件、route 和数据读取行为
- 数据流变化，例如把页面内请求改成 service 层读取，或反过来改坏边界
- route 流转变化，例如新增顶级路由、改默认跳转、改壳内与独立页的切换路径
- 共享组件行为变化，例如同一个组件的默认行为会影响多个页面
- provider 或 app-shell 变化，例如调整 theme、i18n、query provider 顺序
- CI、部署、依赖或环境相关变化

## 当前仓库的高频坑

- 本地 E2E 可能受 shell `http_proxy` 或 `https_proxy` 影响；确保 `NO_PROXY` 包含 `127.0.0.1,localhost`
- Theme 和 i18n provider 默认保持在 router 外层；除非有已验证设计，否则不要调整顺序
- 应用本地 UI 组件不要随手迁移到 `packages/ui`，除非任务明确要求做共享抽取

## 工作规则

- 优先选最接近行为控制处的文件作为锚点
- 第一次实质性编辑后，先跑最窄但足够的验证，再继续阅读或扩改
- 不要把生成内容本身当证据，证据应来自命令和检查结果
- 某个坑一旦重复出现，在修复过程或修复后立刻写回这里或仓库记忆
