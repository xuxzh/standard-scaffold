# ADR-0005 明确 MES 包装与 WMS 基础设施边界

日期：2026-07-13

## 状态

Accepted

## 背景

包装类型、包装层级、包装规格、包装规则、包装套件和物料包装关系最初按 WMS 模块设计，2026-05 的相关 spec 和 plan 因此使用了 WMS 文件名、`getWmsClient()` 和 `wms` Query Key 等表述。

后续真实接口核对确认，这六个包装模块属于 MES 数据域。当前代码位于 `apps/web/src/features/mes/packaging/`，服务通过 `getMesClient()` 访问 MES 后端，2026-06-03 的真实数据接入计划和测试报告已验证这一状态。

与此同时，项目未来仍可能连接独立 WMS 后端。仓库中的 WMS client、环境变量、代理、调试配置和数据导入 module key 是有效的预留基础设施，不能因为包装模块归属调整而删除。

## 决策

- 六个包装模块归属 MES：包装类型、包装层级、包装规格、包装规则、包装套件和物料包装关系。
- 包装实现继续放在 `apps/web/src/features/mes/packaging/`，MES 业务请求统一使用 `getMesClient()`。
- WMS 作为独立后端域保留以下基础设施：
  - `apps/web/src/lib/api/wms-client.ts` 及其测试；
  - `VITE_WMS_*` 环境变量和 `/api/wms` Vite 代理；
  - debug IP rewrite proxy 的 `wms` 配置；
  - 数据导入的 `ImportModuleKey = "WMS"`、端口 `8283`、`getWmsClient()` 分派及相关测试。
- 不得根据仓库存在 WMS 基础设施，反向推断包装模块属于 WMS 或应使用 WMS client。
- 2026-05 的 `wms-*` 包装 spec 和 plan 保留文件名、标题和历史正文，作为当时设计与实施方案的时点快照；这些文档增加修订提示，但不作为当前实现依据。
- 当前包装实现以本 ADR、MES 页面数据接入规范、2026-06-03 的接入计划和验证报告为准。

## 后果

- 正向影响：当前指南能够准确区分 MES 包装业务和未来 WMS 集成基础设施，降低后续开发或 AI 再次把包装接入 WMS 的概率。
- 约束或成本：历史文档中仍会出现 WMS 文件名和旧实现描述，阅读时必须结合顶部修订提示和本 ADR。
- 后续触发条件：真正接入 WMS 业务模块时，应建立独立的 WMS 业务目录和数据访问边界，不复用 MES 包装模块的领域归属。

## 关联

- Plan：[MES 包装与 WMS 基础设施文档边界](../plans/2026-07-13/mes-packaging-wms-documentation-boundary.md)
- Plan：[包装六页真实数据接入与后续页面数据模板](../plans/2026-06-03/packaging-real-data-integration.md)
- Standard：[MES 页面真实数据接入模板](../standards/mes-page-data-integration-template.md)
- Test Report：[包装六页真实数据接入](../test-reports/2026-06-03/packaging-real-data-integration-report-1033.md)
