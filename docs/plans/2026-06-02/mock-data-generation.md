# 可配置 Mock 数据生成 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让 `apps/web` 的 mock store 按 `VITE_MOCK_RECORD_COUNT` 生成默认数据，默认 40 条。

**Architecture:** 保持 MSW handler 和业务 service 契约不变，只重构 `mocks/config.ts` 与 `mocks/data/*` 的初始化数据来源。各 store 继续维护运行时内存状态，默认 seed 由现有样例加确定性生成器补齐。

**Tech Stack:** React 19、Vite、TypeScript、MSW、Vitest、pnpm workspace。

---

## 文件边界

- Modify: `apps/web/src/mocks/config.ts`
- Modify: `apps/web/src/mocks/config.test.ts`
- Create: `apps/web/src/mocks/data/mock-store-utils.ts`
- Modify: `apps/web/src/mocks/data/*-store.ts`
- Modify: `apps/web/src/mocks/data/*-store.test.ts`
- Modify: `apps/web/.env.example`

## Task 1: 配置读取

- [ ] 在 `config.test.ts` 添加 `getMockRecordCount()` 测试，覆盖默认值、合法值和非法值回退。
- [ ] 在 `config.ts` 实现 `defaultMockRecordCount = 40`、`maxMockRecordCount = 1000` 和 `getMockRecordCount()`。
- [ ] 运行 `rtk pnpm --filter @repo/web test apps/web/src/mocks/config.test.ts`。

## Task 2: 共享工具

- [ ] 创建 `mock-store-utils.ts`，集中 `createDataResult`、`includesText`、`paginateRecords`、`cloneRecords`、`buildRecords`、`padNumber`。
- [ ] 在一个 store 测试中先断言默认 40 和 stub 12。
- [ ] 将包装类型 store 迁移到共享工具和生成数据，确认测试通过。

## Task 3: 主列表数据生成

- [ ] 依次迁移包装等级、包装规格、包装套件、包装规则、物料包装关系 store。
- [ ] 每个 store 保留现有 seed 作为前几条，并用确定性数据补齐到配置数量。
- [ ] 每个 store 的 reset 回到当前环境变量对应的 seed 数据。

## Task 4: 选项数据生成

- [ ] 物料选项按同一配置数量生成。
- [ ] 规则选项从包装规则 mock 数据映射生成，并保留可用 `Details`。
- [ ] 包装规则的等级/规格选项从等级/规格 mock 数据派生。

## Task 5: 文档和验证

- [ ] 更新 `apps/web/.env.example`，新增 `VITE_MOCK_RECORD_COUNT=40` 和重启说明。
- [ ] 运行 `rtk pnpm --filter @repo/web test apps/web/src/mocks/config.test.ts`。
- [ ] 运行 `rtk pnpm --filter @repo/web test apps/web/src/mocks/data`。
- [ ] 运行 `rtk pnpm --filter @repo/web typecheck`。
- [ ] 运行 `rtk pnpm --filter @repo/web lint`。
