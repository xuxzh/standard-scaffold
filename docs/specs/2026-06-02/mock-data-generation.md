# 可配置 Mock 数据生成 Spec

日期：2026-06-02

## 背景

当前 `apps/web/src/mocks/data/` 下的 mock store 主要依赖少量手写静态数组。列表分页、筛选、创建、编辑和删除逻辑已经存在，但默认数据量较少，不利于本地验证分页、筛选和选择弹窗体验。

本次改造将 mock 初始化数据改为按规则生成，并允许开发者通过 `.env.local` 调整生成数量。默认数量保持 40 条。

## 目标

- 使用 `VITE_MOCK_RECORD_COUNT` 控制 mock 初始化数据池数量，默认值为 40。
- 覆盖主列表和选项查询数据，包括包装类型、包装等级、包装规格、包装套件、包装规则、物料包装关系、物料选项和规则/规格/等级选项。
- 保留现有手写样例作为生成结果的前几条，稳定演示内容和既有测试锚点。
- 不改变页面分页常量、真实接口请求契约和 MSW handler 路由。

## 非目标

- 不提交或修改开发者本机的 `apps/web/.env.local`。
- 不引入 `faker`、`mockjs` 或其他新依赖。
- 不做后端级外键校验或完整业务图谱建模。
- 不改变真实 API 的分页参数和响应结构。

## 配置规则

新增 Vite 环境变量：

```env
VITE_MOCK_RECORD_COUNT=40
```

解析规则：

- 未配置、空值、非数字、小于 1 时回退到 40。
- 小数向下取整。
- 超过 1000 时限制为 1000，避免本地误配造成性能问题。

## 设计

在 `apps/web/src/mocks/config.ts` 新增 `getMockRecordCount()`，集中读取环境变量。所有默认 mock 数据生成入口都通过该函数获取数量。

新增 `apps/web/src/mocks/data/mock-store-utils.ts`，集中存放以下能力：

- `defaultMockRecordCount`
- `maxMockRecordCount`
- `createDataResult`
- `includesText`
- `paginateRecords`
- `cloneRecords`
- `buildRecords`
- `padNumber`

各 store 的对外工厂签名保持不变，例如 `createPackagingTypeMockStore(initialRecords = packagingTypeMockRecords)`。默认导出的 `*MockRecords` 改为由 seed 样例和确定性生成器补齐到配置数量。

## 验收标准

- 默认环境下主列表和选项查询返回的 `TotalCount` 为 40。
- `VITE_MOCK_RECORD_COUNT=12` 时，新建 store 的默认数据池为 12 条。
- 非法配置回退到 40。
- 现有筛选、分页、创建、编辑、删除、批量删除和 reset 行为保持可用。
- `.env.example` 说明新增配置，`.env.local` 不进入提交。
