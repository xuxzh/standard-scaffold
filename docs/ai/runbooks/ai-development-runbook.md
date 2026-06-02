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

## 分支与 worktree 选择

- 实质性编辑前先运行 `git branch --show-current` 和 `git status --short`，确认当前分支和工作区状态。
- `main` / `master` 只作为稳定集成分支，不直接提交开发改动；如果当前在主分支，先切到任务分支或创建隔离 worktree。
- 默认每个任务使用独立分支，分支名优先使用 `codex-<task-slug>`。
- `L0/L1` 通常使用任务分支即可；`L2` 在并行、长任务或高风险场景使用 worktree；`L3` 默认使用隔离分支或 `.worktrees/` 下的 worktree，并明确人工主导边界。
- 仓库级 worktree 默认创建在仓库根目录下的 `.worktrees/`；只有磁盘空间、权限或特殊调试环境要求时，才放到其他位置，并在任务记录或文档中说明原因。
- 汇报结果时说明实际使用的是任务分支还是 worktree，并列出执行过的验证命令。

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
