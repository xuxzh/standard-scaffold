# 生产构建默认真实接口环境配置 Spec

日期：2026-06-03

## 背景

当前 `apps/web` 通过 `VITE_ENABLE_API_MOCKING` 控制是否启用 MSW。仓库默认示例文件 `apps/web/.env.example` 中该值为 `true`，而最近真实数据接入工作主要通过每个开发者本机修改 `apps/web/.env.local` 完成。

这种做法有两个问题：

- `pnpm --filter @repo/web build` 使用 Vite 的 `production` mode，但仓库中没有明确的生产构建默认环境文件。
- 团队成员如果忘记手工切换 `.env.local`，就可能打出仍然使用 mock 的构建产物。

本次变更需要把“生产构建默认走真实接口”沉淀为仓库约定，同时保留本地开发阶段继续使用 mock 的灵活性。

## 目标

- 为 `apps/web` 提供提交到仓库的 `production` 构建默认环境文件。
- 让 `pnpm --filter @repo/web build` 在默认情况下关闭 MSW，并使用真实接口地址。
- 保留 `apps/web/.env.local` 作为开发者本机覆盖配置，不要求每次打包前手工改文件。

## 非目标

- 不修改 `apps/web/src/main.tsx`、`apps/web/src/mocks/config.ts` 或任何 API client 逻辑。
- 不引入新的 Vite mode、自定义构建脚本或部署脚本。
- 不把当前所有环境都拆成独立文件，例如 `.env.development`、`.env.staging`。
- 不处理 CI/CD 密钥注入、部署平台环境变量托管或多套生产地址治理。

## 范围级别

- 建议任务级别：`L1`
- 原因：只涉及环境文件与文档约定调整，不改变运行时代码路径或业务数据流。

## 受影响边界

- 工具链：Vite 环境文件加载顺序，`vite build` 默认读取 `production` mode 配置。
- 配置文件：`apps/web/.env.production`、`apps/web/.env.example`。
- 文档说明：需要补充或更新对环境文件职责的说明。

## 建议方案

采用 Vite 默认约定，新增 `apps/web/.env.production` 并提交到仓库。文件中写入：

```env
VITE_ENABLE_API_MOCKING=false
VITE_API_BASE_URL=http://127.0.0.1:8080
VITE_WMS_API_BASE_URL=http://192.168.0.135:8283
VITE_MES_API_BASE_URL=http://192.168.0.135:8282
```

如现有仓库仍需打印服务地址，也一并在 `apps/web/.env.production` 中保留：

```env
VITE_PRINT_API_BASE_URL=http://127.0.0.1:3002
```

同时调整 `apps/web/.env.example` 注释，明确三件事：

- `.env.example` 是示例模板，不代表生产构建默认值。
- `.env.local` 用于开发者本机联调覆盖，可按需启用 mock 或真实接口。
- `.env.production` 用于仓库内生产构建默认值，默认关闭 API mock。

这样做的原因：

- 与 Vite 约定一致，`pnpm --filter @repo/web build` 不需要修改脚本即可生效。
- 不影响已有 `main.tsx` 中“仅当 `VITE_ENABLE_API_MOCKING === "true"` 时启动 worker”的逻辑。
- 团队成员即使不修改 `.env.local`，执行构建时也能得到真实接口配置。

## 备选方案

### 方案 A：新增 `apps/web/.env.production`

- 优点：最符合 Vite 默认行为，学习成本最低，误操作概率最低。
- 缺点：仓库会包含当前内网地址；如果未来生产地址频繁变化，需要再细化环境治理。

### 方案 B：修改 `apps/web/package.json` 的 `build` 脚本，显式切换 mode 或额外脚本

- 优点：可以扩展 `build:mock`、`build:staging` 等更细粒度命令。
- 缺点：增加脚本维护成本，且当前需求并不需要。

### 方案 C：继续依赖 `.env.local`

- 优点：不新增仓库文件。
- 缺点：依赖人工切换，无法满足“生产构建默认真实接口”的目标。

最终采用方案 A。

## 验证计划

- 检查 `apps/web/.env.production` 已存在，并包含 `VITE_ENABLE_API_MOCKING=false` 与真实接口地址。
- 检查 `apps/web/.env.example` 已明确 `.env.local` 与 `.env.production` 的职责。
- 运行 `pnpm --filter @repo/web build`，确认构建成功。
- 如有必要，通过构建产物或运行时检查确认没有再启用 MSW。

## 风险

- 地址信息风险：提交内网地址会把当前团队默认联调地址显式写入仓库，需要确认这符合项目协作方式。
- 环境覆盖风险：若开发者本机存在 `.env.production.local`，它仍会覆盖仓库默认值；这是 Vite 预期行为，需要在文档中说明。
- 认知迁移风险：已有文档部分内容仍以 `.env.local` 为主，需同步补充“构建默认走 `.env.production`”说明。

## 需要更新的文档

- `docs/specs/2026-06-03/production-build-real-api-defaults-design.md`
- `docs/plans/2026-06-03/production-build-real-api-defaults.md`
- 如改动范围允许，补充 `apps/web/.env.example` 内注释作为就近说明
