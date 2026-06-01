# 开发约束文档体系实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为仓库补齐 API 规范、UI 规范和代码规范的长期文档目录，并将其接入现有导航入口。

**Architecture:** 在 `docs/` 下新增 `api`、`ui`、`standards` 三类长期规范目录，每类先落一个目录说明文档和一个首批核心规范文档。随后更新 `AGENTS.md`、`docs/ai/context-index.md`、`docs/ai/README.md` 作为入口索引，保持长期规范、单次设计和 AI 工作流分层清晰。

**Tech Stack:** Markdown、仓库现有文档结构、AI 治理规则

---

### Task 1: 建立长期规范目录

**Files:**

- Create: `docs/api/README.md`
- Create: `docs/ui/README.md`
- Create: `docs/standards/README.md`

- [ ] **Step 1: 编写目录级职责说明**

为 `docs/api/`、`docs/ui/`、`docs/standards/` 分别补齐目录说明，明确每类文档承载的约束对象、与 `docs/specs`/`docs/adr`/`AGENTS.md` 的边界、以及推荐维护方式。

- [ ] **Step 2: 校对目录分工不重叠**

检查三份 `README.md`，确保没有把单次设计、实施计划或 ADR 的职责混入长期规范目录。

### Task 2: 编写首批规范文档

**Files:**

- Create: `docs/api/http-contract-guidelines.md`
- Create: `docs/ui/application-ui-guidelines.md`
- Create: `docs/standards/web-code-guidelines.md`

- [ ] **Step 1: 编写接口契约规范**

补齐前端对接 API 时的默认约定，包括命名风格、分页筛选排序、错误结构、日期时间和分层边界。

- [ ] **Step 2: 编写应用 UI 规范**

补齐壳层结构、组件复用优先级、页面常见状态规范、可访问性和响应式约束。

- [ ] **Step 3: 编写 Web 代码规范**

补齐别名约定、目录边界、组件与 hooks 职责、数据访问层次、状态管理边界和验证要求。

### Task 3: 接入导航入口

**Files:**

- Modify: `AGENTS.md`
- Modify: `docs/ai/context-index.md`
- Modify: `docs/ai/README.md`

- [ ] **Step 1: 更新仓库入口规则**

在 `AGENTS.md` 中新增“开发约束文档”小节，只保留入口说明和链接，不展开正文。

- [ ] **Step 2: 更新 AI 上下文索引**

在 `docs/ai/context-index.md` 中加入三类长期规范目录，使 AI 新会话能尽早定位到这些约束。

- [ ] **Step 3: 更新 AI 工作区指南**

在 `docs/ai/README.md` 的目录说明中补充长期规范目录的用途和边界。

### Task 4: 最小验证

**Files:**

- Verify: `docs/specs/2026-05-26/development-constraints-documentation-design.md`
- Verify: `docs/plans/2026-05-26/development-constraints-documentation.md`
- Verify: `docs/api/README.md`
- Verify: `docs/api/http-contract-guidelines.md`
- Verify: `docs/ui/README.md`
- Verify: `docs/ui/application-ui-guidelines.md`
- Verify: `docs/standards/README.md`
- Verify: `docs/standards/web-code-guidelines.md`
- Verify: `AGENTS.md`
- Verify: `docs/ai/context-index.md`
- Verify: `docs/ai/README.md`

- [ ] **Step 1: 运行文档级错误检查**

Run: `get_errors` on the touched Markdown files
Expected: no diagnostics on new or modified files

- [ ] **Step 2: 人工核对导航链路**

确认 `AGENTS.md`、`docs/ai/context-index.md`、`docs/ai/README.md` 都能把读者导航到新目录，且新目录内容与设计文档一致。
