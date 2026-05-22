# `apps/web-e2e`

`apps/web-e2e` 是 `apps/web` 的独立端到端测试工程，基于 `Playwright` 实现。

当前这套 E2E 主要覆盖两类核心流程：

- 导航主链路：默认跳转、壳内页面跳转、独立页面访问
- 界面状态：主题切换、语言切换、刷新后的状态持久化

## 目标

- 让浏览器级主流程测试与业务应用代码解耦
- 先支持本地前端独立运行
- 后续通过环境变量切换到联调环境，而不是维护两套测试工程

## 目录结构

```text
apps/web-e2e/
  fixtures/
    test.ts
  helpers/
    env.ts
    routes.ts
    storage.ts
  pages/
    app-shell.page.ts
    settings.page.ts
  tests/
    navigation.spec.ts
    ui-state.spec.ts
  .env.example
  package.json
  playwright.config.ts
  tsconfig.json
```

各目录职责如下：

- `tests/`：按用户流程组织用例
- `pages/`：页面对象，封装高频交互和稳定断言
- `fixtures/`：共享测试上下文
- `helpers/`：环境变量、路由常量、本地存储 key 等辅助逻辑

## 运行方式

先在仓库根目录安装依赖：

```bash
pnpm install
```

### 从仓库根目录运行

推荐直接使用根目录脚本：

```bash
pnpm test:e2e
pnpm test:e2e:headed
pnpm test:e2e:staging
```

### 只运行 `web-e2e` workspace

```bash
pnpm --filter @repo/web-e2e test:e2e
pnpm --filter @repo/web-e2e test:e2e:headed
pnpm --filter @repo/web-e2e test:e2e:ui
pnpm --filter @repo/web-e2e test:e2e:debug
pnpm --filter @repo/web-e2e test:e2e:staging
```

### 运行单个 spec

```bash
pnpm --filter @repo/web-e2e test:e2e tests/navigation.spec.ts --project=chromium
pnpm --filter @repo/web-e2e test:e2e tests/ui-state.spec.ts --project=chromium
```

## 运行模式

### 本地模式

默认是 `local` 模式。

在这个模式下：

- `Playwright` 会自动启动 `apps/web`
- 默认访问地址是 `http://127.0.0.1:4173`
- `playwright.config.ts` 会自动复用本地已有服务

### 联调模式

联调模式使用外部环境地址，不会启动本地 `apps/web`。

示例：

```bash
E2E_MODE=staging E2E_BASE_URL=https://your-staging.example.com pnpm --filter @repo/web-e2e test:e2e
```

或者：

```bash
pnpm test:e2e:staging
```

注意：

- `E2E_MODE=staging` 时必须提供 `E2E_BASE_URL`
- 当前首批用例默认面向本地主流程与稳定联调链路

## 环境变量

可参考 `apps/web-e2e/.env.example`：

```bash
E2E_MODE=local
E2E_BASE_URL=http://127.0.0.1:4173
```

当前支持：

- `E2E_MODE=local|staging`
- `E2E_BASE_URL=<url>`

环境变量解析逻辑位于 `helpers/env.ts`。

## 当前覆盖范围

### `tests/navigation.spec.ts`

覆盖：

- 打开 `/` 自动跳转到 `/dashboard`
- 从后台首页跳转到壳内示例页
- 从后台首页进入独立示例页，并验证不渲染后台壳

### `tests/ui-state.spec.ts`

覆盖：

- 切换暗色主题并验证本地存储持久化
- 切换语言到英文并验证刷新后仍然生效

## 页面对象

当前包含两个页面对象：

- `AppShellPage`
  - 后台壳可见性断言
  - 侧边栏导航操作
- `SettingsPage`
  - 主题切换
  - 语言切换

如果后续新增复杂流程，优先把重复交互下沉到页面对象，而不是直接堆在 spec 里。

## 约定

- 用例优先验证用户可见行为，不要过度依赖实现细节
- 选择器优先级：
  - `getByRole`
  - 稳定文案
  - `data-testid`
- 不要依赖 Tailwind 类名或脆弱 DOM 层级
- 新增关键交互时，优先给 `apps/web` 补稳定标识，再写 E2E

## 常用验证命令

```bash
pnpm --filter @repo/web test
pnpm --filter @repo/web build
pnpm --filter @repo/web-e2e exec playwright test --list
pnpm test:e2e
```

## 后续扩展建议

下一批比较适合继续补的内容：

- 表单主流程
- 联调环境账号与数据准备
- CI 中的 smoke / full 两级执行策略
- 更细粒度的页面对象和 fixtures 抽象
