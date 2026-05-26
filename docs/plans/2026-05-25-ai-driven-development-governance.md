# AI 驱动开发治理实施计划

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

# AI 驱动开发治理实施计划

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

**目标：** 通过少量核心文档、模板、评审清单、运行手册和 GitLab 合并请求模板，把仓库的第一版 AI 驱动开发治理真正落到可执行状态。

**实现方式：** 采用“文档优先、入口集中、约束轻量”的落地方式。使用 `AGENTS.md` 作为高频入口，把 AI 开发入口、模板、清单和运行手册保留在 `docs/ai` 下，把设计与实施计划分别保留在 `docs/specs` 和 `docs/plans` 下，并通过 GitLab 合并请求模板收集 `spec`、`plan` 与验证证据，而不是一开始就依赖重量级自动化门禁。

**技术栈：** `Markdown`、`GitLab`、`pnpm`、`Turborepo`

---

## 文件清单

- 修改：`AGENTS.md`
- 新建：`docs/ai/README.md`
- 新建：`docs/ai/templates/feature-spec-template.md`
- 新建：`docs/ai/templates/implementation-plan-template.md`
- 新建：`docs/ai/templates/bugfix-brief-template.md`
- 新建：`docs/ai/templates/task-packet-template.md`
- 新建：`docs/ai/checklists/ai-review-checklist.md`
- 新建：`docs/ai/runbooks/ai-development-runbook.md`
- 新建：`.gitlab/merge_request_templates/ai-driven-change.md`

### 任务 1：补齐治理入口文档

**文件：**

- 修改：`AGENTS.md`
- 新建：`docs/ai/README.md`

- [ ] **步骤 1：在修改入口文档前重读已批准的治理设计**

执行：

```bash
sed -n '1,260p' docs/ai/ai-development-governance.md
```

预期：治理设计可在本地直接查看，确保入口文档链接到已经批准的规则，而不是重新发明一套说法。

- [ ] **步骤 2：在 `AGENTS.md` 中加入简洁的 AI 驱动开发约定段落**

把下面这段插入到 `## 项目边界` 之后、`## 参考文档` 之前：

```md
## AI 驱动开发约定

- 仓库默认采用“文档驱动、验证优先、AI 受控执行”的工作方式。
- 新功能、跨文件改动、数据流调整和中等以上重构，先写 spec 或 plan，再进入实现。
- 局部小改动可以直接做，但必须附最小验证，且不要顺手扩大范围。
- 完整治理基线见 `docs/ai/ai-development-governance.md`。
- 日常入口、模板、清单和 runbook 见 `docs/ai/README.md`。
```

- [ ] **步骤 3：创建 `docs/ai` 总入口文档**

创建 `docs/ai/README.md`：

```md
# AI 开发工作区指南

这个目录承载仓库内 AI 驱动开发的长期上下文。默认工作方式不是“先让 AI 写代码”，而是“先明确边界，再让 AI 在边界内执行”。

## 从哪里开始

- 治理基线：`ai/ai-development-governance.md`
- 实施计划：`plans/2026-05-25-ai-driven-development-governance.md`
- 仓库高频规则：`../../AGENTS.md`

## 日常入口

- 新功能或中等改动：先看治理基线，再从 `templates/feature-spec-template.md` 或 `templates/implementation-plan-template.md` 开始；如果当前会话没有对应技能，就直接按模板执行。
- 小型缺陷修复：从 `templates/bugfix-brief-template.md` 开始，先写现象、预期和假设。
- `L1` 级工作包：从 `templates/task-packet-template.md` 开始，明确锚点、验证和非目标。
- 评审：使用 `checklists/ai-review-checklist.md`。
- 常见执行陷阱和验证习惯：查看 `runbooks/ai-development-runbook.md`。

## 目录说明

- `specs/`：设计和边界文档
- `plans/`：可执行实施计划
- `templates/`：功能说明、实施计划、缺陷修复和任务包模板
- `checklists/`：评审和验收清单
- `runbooks/`：高频运行约定和排障提示

## 默认验证基线

按风险等级选择验证，不要求所有改动都跑完整基线。默认完整基线如下：

- `pnpm lint`
- `pnpm typecheck`
- `pnpm --filter @repo/web test`
- `pnpm --filter @repo/web-e2e test:e2e`
- `pnpm build`

## 使用规则

- 不要把聊天记录当作仓库知识库。
- 不要在没有验证结果时宣称改动完成。
- 不要在没有明确批准时推进高风险改动。
- 如果某个坑未来大概率重复出现，把它写进运行手册或仓库记忆，而不是只留在一次对话里。
```

- [ ] **步骤 4：验证两个入口文档都含有预期的治理锚点**

执行：

```bash
rg -n "AI 驱动开发约定|governance-design|templates/feature-spec-template|runbooks/ai-development-runbook" AGENTS.md docs/ai/README.md
```

预期：命令输出 `AGENTS.md` 中的新治理段落，以及 `docs/ai/README.md` 中的入口链接。

- [ ] **步骤 5：提交入口文档改动**

执行：

```bash
git add AGENTS.md docs/ai/README.md
git commit -m "docs: add ai development entry points"
```

预期：生成一个只包含治理入口文档的提交。

### 任务 2：补齐可复用治理模板

**文件：**

- 新建：`docs/ai/templates/feature-spec-template.md`
- 新建：`docs/ai/templates/implementation-plan-template.md`
- 新建：`docs/ai/templates/bugfix-brief-template.md`
- 新建：`docs/ai/templates/task-packet-template.md`

- [ ] **步骤 1：创建功能设计模板**

创建 `docs/ai/templates/feature-spec-template.md`：

```md
# 功能设计模板

## 背景

- 为什么要做这次变更
- 这次变更解决什么问题
- 为什么现在启动这项工作

## 目标

- 用一句话描述期望结果

## 非目标

- 明确列出这次变更不做什么

## 范围级别

- 建议任务级别：`L1` / `L2` / `L3`
- 为什么适用这个级别

## 受影响边界

- 路由
- 数据流
- 状态边界
- 共享组件
- 工具链或脚本

## 建议方案

- 主要实现路径
- 为什么它符合当前仓库的既有模式

## 备选方案

- 方案 A
- 方案 B
- 为什么没有采用它们

## 验证计划

- 最小但有效的检查
- 如果主用户流程变化，需要补哪些更宽的检查
- 记录需要执行哪些命令，以及完成时将展示哪些验证证据

## 风险

- 行为回归风险
- 边界漂移风险
- 验证或落地风险

## 需要更新的文档

- `AGENTS.md`
- `docs/specs/...`
- `docs/plans/...`
- 如有需要，补充运行手册或清单更新
```

- [ ] **步骤 2：创建实施计划模板**

创建 `docs/ai/templates/implementation-plan-template.md`：

````md
# 实施计划模板

> **面向 Agent 执行者：** 优先使用 `superpowers:subagent-driven-development`，也可以使用 `superpowers:executing-plans` 按任务执行本计划。步骤使用复选框 `- [ ]` 语法跟踪。

如果当前会话没有这些技能，就直接把这个模板当作手工执行清单，并保持同样的逐任务验证纪律。

**目标：**

**实现方式：**

**技术栈：**

---

## 文件清单

- 新建：
- 修改：
- 测试：

### 任务 1：[名称]

**文件：**

- 新建：
- 修改：
- 测试：

- [ ] **步骤 1：编写或更新失败检查**

```text
在这里写出精确的测试、断言或结构化验证内容。
```

- [ ] **步骤 2：运行检查，确认当前状态**

从仓库根目录执行。

执行：

```bash
pnpm --filter @repo/web test
```

预期：

```text
在这里记录实现前该检查的实际结果。
```

- [ ] **步骤 3：实现最小改动**

```text
在这里写出需要新增或修改的精确代码或文档内容。
```

- [ ] **步骤 4：再次运行验证**

从仓库根目录执行。

执行：

```bash
pnpm --filter @repo/web test
```

预期：

```text
在这里记录改动后的通过结果。
```

- [ ] **步骤 5：提交**

```bash
git status --short
git add docs/ai/templates/feature-spec-template.md docs/ai/templates/implementation-plan-template.md
git commit -m "docs: update planning templates"
```

这里只是示例。实际执行前，请把暂存文件和提交信息替换成当前切片的真实内容。
````

- [ ] **步骤 3：创建缺陷修复说明模板**

创建 `docs/ai/templates/bugfix-brief-template.md`：

```md
# 缺陷修复说明模板

## 现象

- 发生了什么
- 在哪里发生
- 用户是怎么感知到的

## 预期行为

- 正确行为应该是什么

## 最小复现面

- 能复现问题的最小 route、组件、命令或测试面

## 局部假设

- 用一个可证伪的解释说明为什么会出现这个问题

## 锚点

- 离该行为最近的归属文件、符号或测试

## 最便宜的判别检查

- 能推翻当前假设的最小命令或断言

## 非目标

- 这次修复不应扩展到什么范围

## 验证

- 必需的窄验证
- 如果该缺陷触及用户流程，需要补哪些更宽验证

## 需要保留的知识

- 如果这次暴露了一个会重复出现的坑，判断它应该写进运行手册、仓库记忆还是 `AGENTS.md`
- 在关闭任务前记录回写目标
```

- [ ] **步骤 4：创建 `L1` 任务包模板**

创建 `docs/ai/templates/task-packet-template.md`：

```md
# 任务包模板

## 目标

- 一个具体结果

## 级别

- 默认按 `L1` 处理；如果不是，说明为什么需要升级

## 锚点

- 主要文件或符号

## 假设

- 关于目标行为的一个局部、可证伪假设

## 最小改动

- 用来验证该假设的最小可行改动

## 验证

- 精确命令
- 预期结果

## 非目标

- 哪些内容必须保持在范围外

## 后续升级触发条件

- 什么结果会触发升级到 `spec` 或完整实施计划
```

- [ ] **步骤 5：验证模板是否暴露出预期标题**

执行：

```bash
rg -n "^## (背景|目标|局部假设|锚点|验证|非目标|文件清单)" docs/ai/templates
```

预期：所有模板都能输出预期标题，说明功能、计划、缺陷修复和 `L1` 任务包工作流都有清晰结构。

- [ ] **步骤 6：提交模板集**

执行：

```bash
git add docs/ai/templates
git commit -m "docs: add ai development templates"
```

预期：生成一个只包含可复用模板的提交。

### 任务 3：补齐评审清单与运行手册

**文件：**

- 新建：`docs/ai/checklists/ai-review-checklist.md`
- 新建：`docs/ai/runbooks/ai-development-runbook.md`

- [ ] **步骤 1：创建 AI 评审清单**

创建 `docs/ai/checklists/ai-review-checklist.md`：

```md
# AI 评审清单

## 审查顺序

1. 行为回归
2. 边界破坏
3. 验证缺失
4. 测试缺口或测试过弱
5. 可读性与可维护性

## 审查前先看哪里

- 仓库级边界先看 `AGENTS.md`
- 治理与完成定义先看 `docs/ai/ai-development-governance.md`
- 执行习惯和高频坑先看 `docs/ai/runbooks/ai-development-runbook.md`

## 核心问题

- 这次改动是否超出了声明目标，影响了额外的用户可见行为？
- 这次改动是否跨过了原本应先写 `spec` 或 `plan` 的边界？
- provider 顺序、route 流转或数据访问边界是否被隐式改变？
- 作者是否运行了当前切片最小但足够的验证？
- 如果主链路变了，是否考虑了浏览器级验证？
- 是否有遗漏的文档更新或运行手册回写？

## 问题写法

- 先写严重级别
- 再写文件与行为位置
- 再写风险说明
- 最后写缺失的验证或测试

## 无问题时的写法

如果没有发现实质性问题，明确写出“未发现实质性问题”，并补一句剩余风险或测试盲区。
```

- [ ] **步骤 2：创建治理执行运行手册**

创建 `docs/ai/runbooks/ai-development-runbook.md`：

```md
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

## 什么时候从直接执行升级到 `spec` 或 `plan`

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
```

- [ ] **步骤 3：验证评审清单与运行手册是否包含预期控制点**

执行：

```bash
rg -n "行为回归|默认完整验证基线|NO_PROXY|provider|共享组件行为变化" docs/ai/checklists/ai-review-checklist.md docs/ai/runbooks/ai-development-runbook.md
```

预期：评审清单能输出评审顺序，运行手册能输出验证基线和仓库陷阱。

- [ ] **步骤 4：提交评审清单和运行手册**

执行：

```bash
git add docs/ai/checklists docs/ai/runbooks
git commit -m "docs: add ai review checklist and runbook"
```

预期：生成一个只包含评审清单和运行手册的提交。

### 任务 4：为治理证据补齐 GitLab 合并请求模板

**文件：**

- 新建：`.gitlab/merge_request_templates/ai-driven-change.md`

- [ ] **步骤 1：创建 GitLab 合并请求模板目录和文件**

创建 `.gitlab/merge_request_templates/ai-driven-change.md`：

```md
## 摘要

- 改了什么
- 为什么要改

## 变更级别

- [ ] `L0`
- [ ] `L1`
- [ ] `L2`
- [ ] `L3`

## 关联的设计或计划

- Spec：
- Plan：
- 如果不需要，请说明原因：

## 验证证据

- 只勾选当前变更级别真正适用的验证；未执行的命令必须说明原因。
- [ ] `pnpm lint`
- [ ] `pnpm typecheck`
- [ ] `pnpm --filter @repo/web test`
- [ ] `pnpm --filter @repo/web-e2e test:e2e`
- [ ] `pnpm build`
- 未执行的命令及原因：

## 风险检查

- [ ] Route 或导航流发生变化
- [ ] 数据流边界发生变化
- [ ] Provider 顺序发生变化
- [ ] 共享组件行为发生变化
- [ ] CI、部署、依赖或环境行为发生变化

## 文档更新

- [ ] `AGENTS.md`
- [ ] `docs/specs/...`
- [ ] `docs/plans/...`
- [ ] 运行手册或清单
- [ ] 不需要更新文档

## 评审备注

- 需要重点评审的区域
- 已知权衡或剩余风险
```

- [ ] **步骤 2：验证模板已存在于 GitLab 预期路径**

执行：

```bash
test -f .gitlab/merge_request_templates/ai-driven-change.md && echo "template present"
```

预期：

```text
template present
```

- [ ] **步骤 3：提交合并请求模板**

执行：

```bash
git add .gitlab/merge_request_templates/ai-driven-change.md
git commit -m "docs: add ai driven merge request template"
```

预期：生成一个只包含 GitLab 模板的提交。

### 任务 5：做一轮文档一致性收口

**文件：**

- 修改：`AGENTS.md`
- 修改：`docs/ai/README.md`
- 修改：`docs/ai/templates/*.md`
- 修改：`docs/ai/checklists/ai-review-checklist.md`
- 修改：`docs/ai/runbooks/ai-development-runbook.md`
- 修改：`.gitlab/merge_request_templates/ai-driven-change.md`

- [ ] **步骤 1：扫描新治理文档中的占位词和弱描述**

执行：

```bash
rg -n "TODO|TBD|implement later|fill in details" AGENTS.md docs/ai/README.md docs/ai/templates docs/ai/checklists docs/ai/runbooks .gitlab/merge_request_templates/ai-driven-change.md
```

预期：没有匹配。如果出现匹配，在继续之前把它们替换成具体表达。

- [ ] **步骤 2：验证每个治理界面都能在需要时回链到已批准的 `spec` 或操作指南**

执行：

```bash
rg -n "governance-design|docs/ai/README.md|AI 开发工作区指南|AI 驱动开发约定" AGENTS.md docs/ai/README.md docs/ai/templates docs/ai/checklists docs/ai/runbooks .gitlab/merge_request_templates/ai-driven-change.md
```

预期：治理入口和指南引用都存在，这些文档不是彼此孤立的。

- [ ] **步骤 3：运行空白和 patch 健康检查**

执行：

```bash
git diff --check
```

预期：没有空白错误或损坏的 patch 标记。

- [ ] **步骤 4：检查最终 diff 是否仍然保持在治理文档范围内**

执行：

```bash
git --no-pager diff -- AGENTS.md docs/ai .gitlab/merge_request_templates/ai-driven-change.md
```

预期：diff 只包含治理文档、模板和 GitLab MR 模板，不混入其他无关改动。

- [ ] **步骤 5：如果一致性收口修改了文件，则提交清理结果**

执行：

```bash
git add AGENTS.md docs/ai .gitlab/merge_request_templates/ai-driven-change.md
git commit -m "docs: tighten ai governance docs"
```

预期：仅在一致性收口确实改动内容时生成最后一个清理提交。
