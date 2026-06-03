# 包装六页真实数据接入与后续页面数据模板 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让包装模块六个页面接入真实 MES 数据，并沉淀后续新页面可复用的数据接入模板。

**Architecture:** 保持现有 `contract -> service -> queries -> page` 分层。页面只消费 query hook 和页面 record，mock 模式与真实模式通过 API client 和环境变量切换，后端差异统一收敛在 contract/service 层。

**Tech Stack:** React 19、Vite、TypeScript、TanStack Query、MSW、Vitest、pnpm workspace。

---

## 范围与前置条件

- 变更级别：`L2`。
- 本计划覆盖六个包装页面：包装类型、包装层级、包装套件、包装规格、包装规则、物料包装关系。
- 本计划只描述真实数据接入和后续页面模板；落盘本计划不代表实施业务代码。
- 前置条件：物料包装关系页当前误用 WMS client，需要先由用户修复为 MES client。修复完成后，本计划再进入实施。
- 真实数据切换通过 `apps/web/.env.local` 完成：
  - `VITE_ENABLE_API_MOCKING=false`
  - `VITE_MES_API_BASE_URL=<MES 服务地址>`
  - `VITE_API_BASE_URL=<应用级服务地址，如登录仍走 app client>`
- `apps/web/src/mocks/data` 继续作为本地联调数据和接口字段参考，不复制到页面局部状态。

## 文件边界

- Create: `docs/plans/2026-06-03/packaging-real-data-integration.md`
- Precondition Modify: `apps/web/src/features/mes/packaging/material-packaging-relation/material-packaging-relation-service.ts`
- Inspect: `apps/web/src/features/mes/packaging/*/*-contract.ts`
- Inspect: `apps/web/src/features/mes/packaging/*/*-service.ts`
- Inspect: `apps/web/src/features/mes/packaging/*/*-queries.ts`
- Inspect: `apps/web/src/mocks/handlers.ts`
- Inspect: `apps/web/src/mocks/data/*-store.ts`
- Optional Modify: only the affected `*-contract.ts` or `*-service.ts` files if real API fields differ from current contract.

## Task 1: 确认前置修复

- [ ] 确认 `material-packaging-relation-service.ts` 已从 `getWmsClient()` 改为 `getMesClient()`。
- [ ] 确认物料包装关系相关路径仍保持当前 service 常量命名，不在页面组件中直接拼 URL。
- [ ] 运行 `rtk pnpm --filter @repo/web typecheck`。
- [ ] Expected: 类型检查通过；如失败，只处理 MES client 切换造成的类型问题。

## Task 2: 六页接口契约核对

- [ ] 对照真实 MES 接口，核对包装类型 service 路径、查询 payload、创建 payload、更新 payload、删除 payload。
- [ ] 对照真实 MES 接口，核对包装层级 service 路径、列表返回、树返回和父级字段。
- [ ] 对照真实 MES 接口，核对包装套件 service 路径、主物料选项、子项 `Children` 字段。
- [ ] 对照真实 MES 接口，核对包装规格 service 路径、类型选项、层级选项和数字字段。
- [ ] 对照真实 MES 接口，核对包装规则 service 路径、等级选项、规格选项、规则明细、配置读取和配置保存。
- [ ] 对照真实 MES 接口，核对物料包装关系 service 路径、物料选项、包装规则选项、明细字段。
- [ ] 如路径和字段与当前 contract 基本一致，不改页面代码。
- [ ] 如存在字段差异，只在对应 `*-contract.ts` 或 `*-service.ts` 增加映射。

## Task 3: 真实模式环境验证

- [ ] 在本机私有配置 `apps/web/.env.local` 设置 `VITE_ENABLE_API_MOCKING=false`。
- [ ] 设置 `VITE_MES_API_BASE_URL` 指向真实 MES 服务。
- [ ] 如登录或刷新 token 仍走 app client，设置 `VITE_API_BASE_URL`。
- [ ] 重启 Vite 开发服务：`rtk pnpm --filter @repo/web dev`。
- [ ] 在浏览器 Network 中确认包装六页请求均命中 `VITE_MES_API_BASE_URL`。
- [ ] 确认请求未被 MSW service worker 拦截。

## Task 4: 页面级冒烟验证

- [ ] 包装类型：验证列表、筛选、分页、创建、编辑、删除、批量删除。
- [ ] 包装层级：验证列表、筛选、分页、树查看、创建、编辑、删除、批量删除。
- [ ] 包装套件：验证列表、筛选、分页、物料选择、子项查看、创建、编辑、删除、批量删除。
- [ ] 包装规格：验证列表、筛选、分页、类型选项、层级选项、创建、编辑、删除、批量删除。
- [ ] 包装规则：验证列表、筛选、分页、等级选项、规格选项、规则明细、配置读取、配置保存、创建、编辑、删除、批量删除。
- [ ] 物料包装关系：验证列表、筛选、分页、物料选择、包装规则选择、规则明细回填、创建、编辑、删除、批量删除。
- [ ] 如真实接口返回空配置，包装规则配置继续使用当前默认配置逻辑。

## Task 5: 后续新页面数据接入模板

- [ ] 新页面先维护 `*-contract.ts`，定义后端 DTO、列表查询参数、表单输入类型和 DTO 到页面 record 的映射函数。
- [ ] 新页面再维护 `*-service.ts`，定义接口路径常量、请求 payload 转换、返回字段归一化和后端差异适配。
- [ ] 新页面通过 MES client 访问 MES 业务接口；页面组件不得直接调用 `fetch` 或拼接 URL。
- [ ] 新页面维护 `*-queries.ts`，统一 React Query key、列表查询、详情查询、创建、更新、删除、批量删除 mutation 和 query invalidation。
- [ ] mock 数据统一放在 `apps/web/src/mocks/data/<domain>-store.ts`，seed 数据使用真实业务语义，生成数据覆盖分页、筛选和批量操作。
- [ ] MSW handler 只接 service 中声明的路径；mock 模式用于本地开发和测试，真实模式只切环境变量。
- [ ] 新页面验收标准：页面代码在 mock 模式和真实模式之间不需要修改。

## Task 6: 最小验证命令

- [ ] 运行 `rtk pnpm --filter @repo/web test`。
- [ ] Expected: Web 单元测试通过。
- [ ] 运行 `rtk pnpm --filter @repo/web typecheck`。
- [ ] Expected: 类型检查通过。
- [ ] 运行 `rtk pnpm --filter @repo/web lint`。
- [ ] Expected: lint 通过。

## Assumptions

- 真实后端路径和当前 service 常量基本一致。
- 真实返回格式基本符合当前 `DataResult<T>` 契约。
- 物料包装关系属于 MES 数据域，执行本计划前会先修复为 MES client。
- 后续新页面的数据接入优先服务通用脚手架能力，不在页面中写产品定制化数据源逻辑。
