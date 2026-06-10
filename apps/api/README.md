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
