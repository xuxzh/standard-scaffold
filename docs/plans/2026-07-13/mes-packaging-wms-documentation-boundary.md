# MES 包装与 WMS 基础设施文档边界 Implementation Plan

## 目标

纠正当前文档中“包装模块属于或调用 WMS”的过时描述，明确包装类型、包装层级、包装规格、包装规则、包装套件和物料包装关系归属 MES，并保留未来接入独立 WMS 后端所需的全部基础设施。

## 变更级别

- 级别：`L2`
- 类型：仅文档
- 实施位置：独立 worktree `codex-mes-packaging-docs`
- 本计划落盘后再修改其他文档。

## 事实依据

- 包装代码位于 `apps/web/src/features/mes/packaging/`。
- 包装服务统一使用 `getMesClient()`。
- `docs/plans/2026-06-03/packaging-real-data-integration.md` 已记录六个包装页面接入 MES。
- `docs/test-reports/2026-06-03/packaging-real-data-integration-report-1033.md` 已验证六个包装服务使用 MES client。
- 项目未来仍可能连接 WMS，因此 WMS client、env、proxy、debug 配置和数据导入 module key 都是有效基础设施。

## 修改范围

1. 新增 ADR，长期固化 MES 包装与 WMS 基础设施的边界，并更新 ADR 索引。
2. 修正当前 README、上下文索引、业务模块组织规范、业务交付 runbook 和表单规范中的错误归属或失效引用。
3. 给 2026-05 的 15 份 `wms-*` 包装 spec/plan 增加统一修订提示，保留文件名、标题和历史正文。

## 非目标

- 不修改 TypeScript、测试、env、Vite 配置或运行时行为。
- 不删除或重命名 `wms-client`、`VITE_WMS_*`、`/api/wms`、debug proxy 的 `wms` key。
- 不删除数据导入的 `ImportModuleKey = "WMS"`、端口 `8283`、`getWmsClient()` 分派及相关测试。
- 不修改 MES 包装 Query Key 或 Mock 文案。
- 不重命名历史文档，不恢复已删除的 WMS E2E 文件。

## 实施步骤

### 1. 建立长期决策

- 新增 `docs/adr/0005-mes-packaging-wms-infrastructure-boundary.md`。
- 更新 `docs/adr/README.md` 索引。
- ADR 明确包装属于 MES，同时列出必须保留的 WMS 基础设施和历史文档处理原则。

### 2. 修正当前指导文档

- `docs/ai/context-index.md`：增加 MES 包装代码、业务资料和数据接入规范入口，声明领域边界。
- `apps/web/README.md`：把业务能力描述改为 MES 包装与独立 WMS API 基础设施并存；保留 WMS client/env 说明。
- `docs/standards/web-business-module-guidelines.md`：把 `features/mes` 的领域称谓、共享命名和 route 示例修正为 MES 现状。
- `docs/ai/runbooks/business-feature-ai-delivery-runbook.md`：把包装示例改为 MES，并停止指导新任务写入固定日期的历史 WMS spec。
- `docs/ui/components/form-patterns.md`：删除不存在的 WMS E2E 页面对象引用。

### 3. 标注历史快照

在 2026-05 的 8 份 plan 和 7 份 spec 标题后增加“修订说明（2026-07-13）”：

- 说明正文记录当时方案，不代表当前实现。
- 说明六个包装模块现归 MES 并使用 `getMesClient()`。
- 说明 WMS 基础设施继续保留。
- 链接 ADR、MES 数据接入模板、实施计划和验证报告。

只增加提示，不改历史正文、标题或文件名。

## 验证

1. `git status --short` 与 `git diff --name-only`：diff 仅包含 `docs/**` 和 `apps/web/README.md`。
2. `git diff --check`：无空白或补丁格式问题。
3. 定向搜索当前文档中的 `包装.*WMS`、`WMS.*包装`、`wms.packaging`、`wms.inventory`、`pages/wms/packaging`，确认不再把包装归属 WMS，也不引用不存在的 E2E 文件。
4. 确认 15 份历史目标文件均包含 `修订说明（2026-07-13）`，且没有文件被重命名或删除。
5. 确认 `wms-client`、WMS env/proxy/debug key、数据导入 WMS module key/端口及其测试无 diff。
6. 人工检查新增 ADR、修订提示和当前指南中的相对链接均指向真实文件。

本任务无运行时代码变化，因此不运行 Web 单测、typecheck、lint、build 或 E2E；最终报告需明确说明这一点。
