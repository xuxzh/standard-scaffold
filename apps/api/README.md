# `apps/api`

`apps/api` 是基于 NestJS、Prisma 和 PostgreSQL 的 API 应用。

## 启动前准备

先在仓库根目录安装依赖：

```bash
pnpm install
```

复制环境变量示例文件：

```bash
cp apps/api/.env.example apps/api/.env
```

根据本机 PostgreSQL 配置修改 `apps/api/.env` 中的数据库连接：

```env
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5432/standard_scaffold?schema=public"
```

确保目标数据库已经创建并且可以访问。

首次启动或修改 `prisma/schema.prisma` 后，同步数据库结构并生成 Prisma Client：

```bash
pnpm --filter @repo/api db:push
```

如果只需要重新生成 Prisma Client：

```bash
pnpm --filter @repo/api prisma:generate
```

## 本地运行

在仓库根目录运行：

```bash
pnpm --filter @repo/api dev
```

API 默认监听 `http://127.0.0.1:3000`，Swagger 文档地址为：

```text
http://127.0.0.1:3000/api/docs
```

可以通过 `PORT` 环境变量覆盖默认端口。

## MES AI Chat 配置

AI Chat 还需要：

```env
HERMES_API_BASE_URL=http://127.0.0.1:8650
HERMES_API_KEY=replace-me
HERMES_REQUEST_TIMEOUT_MS=30000
MES_CONTEXT_DIRECTORY=/absolute/path/to/apps/api/config/ai/mes
```

`DATABASE_URL` 继续从 `apps/api/.env` 读取。`MES_CONTEXT_DIRECTORY` 未设置时默认读取 `apps/api/config/ai/mes`；所需五个上下文文件缺失或结构非法时 API 会启动失败。真实配置不得使用猜测的 schema 或指标口径。

本地确定性 AI E2E 使用现有 API `.env` 中的 `DATABASE_URL`，但以 fake Hermes 代替真实模型和 MSSQL：

```bash
pnpm --filter @repo/web-e2e test:e2e:ai-chat
```

真实 Profile 安装与 macOS/Ubuntu 运行边界见 `docs/ai/runbooks/hermes-mes-ai-chat-macos.md` 和 `docs/ai/runbooks/hermes-mes-ai-chat-ubuntu.md`。
