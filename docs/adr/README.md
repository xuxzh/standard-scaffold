# ADR

这个目录用于记录长期有效的技术决策。单次任务设计继续放在 `../specs/`，可执行计划继续放在 `../plans/`。

## 索引

- [0001 使用任务分级治理 AI 改动风险](0001-ai-task-level-governance.md)
- [0002 保持 Web 数据访问分层](0002-web-data-access-layering.md)
- [0003 收敛 Web 运行时 Mock 到 MSW](0003-web-runtime-mock-unification.md)
- [0004 使用 Axios 实现 Web Transport](0004-web-axios-transport.md)
- [0005 明确 MES 包装与 WMS 基础设施边界](0005-mes-packaging-wms-infrastructure-boundary.md)

## 何时新增 ADR

当某个决定会长期影响后续 AI 或人工开发判断时，新增 ADR。典型场景包括：

- 仓库级流程、验证或目录职责发生变化
- 架构边界、provider 顺序、数据访问路径等长期约定被确立或调整
- 某个方案被明确拒绝，且未来 AI 可能反复重新建议

单次任务的设计背景继续放在 `../specs/`，执行步骤继续放在 `../plans/`。
