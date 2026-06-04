# Web README 环境使用说明补充 Spec

日期：2026-06-03

## 背景

`apps/web/README.md` 当前已经包含 `.env` 初始化说明，但内容仍以“复制 `.env.example` 到 `.env.local` 并修改地址”为主，没有同步反映这次新增的 `apps/web/.env.production` 约定。

在新的配置方案下：

- 团队开发时仍主要使用 `.env.local`
- 生产构建默认读取 `.env.production`
- `.env.production.local` 可以覆盖仓库内的生产构建默认值

如果 README 不更新，团队成员仍可能沿用旧认知，分不清“本机联调配置”和“打包构建默认值”的边界。

## 目标

- 在 `apps/web/README.md` 中提供团队可直接执行的环境使用说明。
- 让开发者清楚知道 `.env.example`、`.env.local`、`.env.production`、`.env.production.local` 的职责。
- 让常见场景的操作路径一目了然，包括 mock 开发、真实接口联调和生产构建。

## 非目标

- 不新增独立文档文件承载团队使用说明。
- 不修改运行时代码、构建脚本或环境变量键名。
- 不扩展到 `apps/web-e2e` 的环境变量说明。
- 不把 README 改造成完整部署手册。

## 范围级别

- 建议任务级别：`L1`
- 原因：仅调整 `apps/web/README.md` 文档内容和结构，不触及运行时代码。

## 受影响边界

- 文档文件：`apps/web/README.md`
- 说明内容：环境初始化、环境文件职责、常见使用场景、构建行为说明

## 建议方案

采用“README 就地增强”的方式，在 `apps/web/README.md` 中直接升级现有 `.env` 初始化章节，而不是新建独立文档。具体调整包括：

1. 将现有 `.env` 初始化小节扩展为“环境文件与初始化”
2. 新增“环境文件职责”说明，逐条解释：
   - `.env.example`
   - `.env.local`
   - `.env.production`
   - `.env.production.local`
3. 新增“常见场景”小节，覆盖：
   - 本地 mock 开发
   - 本地真实接口联调
   - 生产构建
4. 明确一条覆盖规则：
   - 本机存在 `.env.production.local` 时，会覆盖仓库中的 `.env.production`

这样做的原因：

- `apps/web/README.md` 已经是 Web 应用的首要入口文档，环境说明继续放在这里最容易被团队看到。
- 当前 README 已有 `.env` 初始化章节，原位增强比新增链接跳转更顺畅。
- 这次变更的重点是“团队如何正确使用环境文件”，不需要额外拆出独立文档增加维护成本。

## 备选方案

### 方案 A：在 `apps/web/README.md` 就地增强

- 优点：信息集中、学习路径最短、与现有结构最一致。
- 缺点：README 会比现在稍长。

### 方案 B：README 只放摘要，详细内容写到独立 docs 文件

- 优点：结构分层更明显，后续扩展空间更大。
- 缺点：团队需要额外点开第二份文档，不符合这次“快速建立共同认知”的目标。

最终采用方案 A。

## 设计

README 中建议保留现有“启动前准备”和“本地运行”结构，只重写环境相关部分。文档内容应满足以下要求：

- 初始化步骤继续从复制 `.env.example` 到 `.env.local` 开始，保持开发者熟悉的入口。
- 在初始化步骤之后，紧接着说明环境文件职责，避免用户只看到复制命令却不知道各文件用途。
- 常见场景必须给出最少但可直接执行的示例：
  - mock 开发时 `VITE_ENABLE_API_MOCKING=true`
  - 真实接口联调时 `VITE_ENABLE_API_MOCKING=false` 并配置 API base URL
  - 生产构建直接执行 `pnpm --filter @repo/web build`
- 明确说明生产构建默认读取 `.env.production`，避免团队误以为还需要先改 `.env.local`

## 验证计划

- 检查 `apps/web/README.md` 是否包含环境文件职责说明。
- 检查 README 是否包含 mock 开发、真实接口联调、生产构建三种场景。
- 检查 README 是否说明 `.env.production.local` 会覆盖 `.env.production`。
- 运行文档相关最小检查：确认 Markdown 结构清晰，引用的文件名和命令与仓库现状一致。

## 风险

- 文档漂移风险：若以后新增 `.env.staging` 等文件，README 需要同步更新。
- 过度展开风险：如果把部署、CI、E2E 环境都写进来，会让 README 偏离本次目标。
- 认知混淆风险：如果没有明确区分“开发覆盖”和“生产构建默认值”，团队仍可能误用 `.env.local`。

## 需要更新的文档

- `docs/specs/2026-06-03/web-readme-env-usage-guide-design.md`
- `docs/plans/2026-06-03/web-readme-env-usage-guide.md`
- `apps/web/README.md`
