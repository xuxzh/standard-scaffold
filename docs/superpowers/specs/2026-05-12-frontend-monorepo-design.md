# 前端 Monorepo 初始化设计

日期：2026-05-12

## 目标

初始化一个干净的前端 monorepo 框架。第一步只提供项目结构、workspace 连接、共享配置包和基础验证脚本，不加入业务功能。

## 技术栈

- 包管理器：pnpm
- 任务编排：Turborepo
- Web 应用：Vite、React 19、TypeScript
- 共享包结构：
  - `apps/web`：初始 React Web 应用
  - `packages/ui`：预留的共享 UI 包
  - `packages/typescript-config`：共享 TypeScript 配置
  - `packages/eslint-config`：共享 ESLint 配置

## 版本方向

项目会使用稳定版 React 19。因为这是一个新项目，没有历史 React 依赖包袱，直接使用当前 React 主版本可以避免后续从 React 18 迁移到 React 19。

具体的 React 19 patch 版本由 pnpm 在初始化时解析，只使用稳定版本。Canary、experimental、beta 和 release candidate 版本不在本次范围内。

## 根目录脚本

根目录 `package.json` 提供以下脚本：

- `dev`：通过 Turbo 运行开发任务
- `build`：通过 Turbo 构建全部应用和包
- `lint`：通过 Turbo 检查全部应用和包
- `typecheck`：通过 Turbo 对全部应用和包做类型检查

## 配置

根目录包含：

- `pnpm-workspace.yaml`：用于 workspace 包发现
- `turbo.json`：用于任务编排
- `package.json`：包含私有 workspace 元信息和根脚本
- `.gitignore`：覆盖依赖目录、构建产物、日志和本地环境文件

TypeScript 和 ESLint 配置包需要提供可复用的配置入口，供初始应用和后续新增 package 使用。

## 初始应用

`apps/web` 是一个最小化的 Vite React TypeScript 应用，需要满足：

- 使用 `react-dom/client` 挂载
- 使用 workspace 中的 React 19 依赖
- 包含一个简单的 starter 组件
- 支持 `dev`、`build`、`lint` 和 `typecheck` 脚本

## 验证方式

初始化完成后，运行可用的包管理器验证命令：

- 使用 pnpm 安装依赖
- 运行 `pnpm build`
- 运行 `pnpm lint`
- 运行 `pnpm typecheck`

如果依赖安装被网络限制阻塞，先请求执行网络安装命令的权限，然后继续验证。

## 不包含范围

- 应用路由
- UI 设计系统实现
- 单元测试或 e2e 测试框架
- CI 配置
- 部署配置
- 状态管理、数据请求或 API client
