# Web 构建版本号 + 产物 Zip 打包 Spec

日期：2026-06-09

## 背景

`apps/web` 当前构建产物是 `dist/ruihui-next/` 目录,运维/测试同学在交付时需要拿到一个可直接分发的压缩包,例
如 `ruihui-next_26.06.05.1800.zip`(此前仓库 `dist/` 中已残留过同类产物)。同时,前端页面在出现线上问题
时,需要让支持方能直观地确认"这个用户跑的是哪一版构建",因此在所有页面左下角显示构建版本号。

两者必须使用同一个时间戳,避免出现"页面显示的版本"与"zip 文件名指向的产物"对不上的情况。

## 目标

- 在构建时(本地/CI 同一行为)生成本次构建的时间戳版本号,格式 `YY.MM.DD.HHmm`,如 `26.06.09.0947`。
- 在 Web 应用的**所有页面**(包括 `/login`)的左下角显示该版本号,文案统一为 `Ver 26.06.09.0947`。
- 在 `vite build` 完成后,自动把 `dist/ruihui-next/` 打成 `dist/ruihui-next_<VERSION>.zip`。
- 显示版本号、zip 文件名、构建期 ISO 时间戳三者**来自同一字符串**,绝不允许运行时再算。

## 非目标

- 不做语义化版本(`package.json` 的 `version` 字段)对接,本次只引入时间戳版本。
- 不在 zip 中附带源码、`.env*`、`.map`、`node_modules` 等额外文件。
- 不暴露版本号给后端,不上报埋点,仅前端展示。
- 不调整现有 CDN/部署流程,zip 仅作为可分发的归档产物。
- 不做版本号的本地化文案(`zh-CN` / `en-US` 都显示 "Ver")。
- 不在 zip 内部嵌套另一层 `ruihui-next/`,也不在 zip 名里再加 git hash / commit 信息。

## 范围级别

任务级别:`L2`。

原因:

- 新增 `prebuild` / `postbuild` 两条 npm 生命周期脚本,影响 `pnpm --filter @repo/web build` 与
  `pnpm verify`(CI `validate` 阶段)的行为。
- 新增运行时 UI 浮层,挂在全局 `RootLayout`,覆盖 `/login` 与所有鉴权页。
- 新增 `archiver` 与 `@types/archiver` 两条 devDependencies。
- 引入生成文件 `src/generated/version.ts`,需要治理 `.gitignore` / `eslint` 忽略 / 类型 stub。

## 接口

### 1. 版本号格式

`apps/web/src/lib/version/format-version.ts` 暴露纯函数:

```ts
export function formatBuildVersion(date: Date): string; // -> "26.06.09.0947"
```

- 使用调用方传入的 `Date` 的本地时间(`getFullYear/getMonth/getDate/getHours/getMinutes`)。
- 年份取后两位。
- 月、日、时、分均为两位,不足补 `0`。
- 跨年(年末)、跨月(月末)、跨日(0 点)的行为完全由 `Date` 自身决定,函数本身不做边界校正。

### 2. 生成文件

`apps/web/src/generated/version.ts` 由 `scripts/generate-version.mjs` 写入,内容形如:

```ts
// 此文件由 scripts/generate-version.mjs 自动生成,请勿手改
export const APP_VERSION = "26.06.09.0947";
export const APP_BUILD_TIME_ISO = "2026-06-09T09:47:00+08:00";
export const APP_BUILD_TIMEZONE = "Asia/Shanghai";
```

**生成文件不入库**:`apps/web/src/generated/` 整目录加进根 `.gitignore`。`package.json` 暴露
`"prepare": "node scripts/generate-version.mjs"`,跟随 `pnpm install` 自动生成,保证 `git clone` 后第一次
`pnpm install` 即可得到 `version.ts`,后续 `pnpm dev` / `pnpm typecheck` 不会因为缺文件而失败。`prebuild`
始终覆盖,确保 CI 与本地产出物一致。

### 3. UI 组件

`apps/web/src/components/layout/version-badge.tsx`:

- 固定定位,`bottom-2 left-2`,`z-50`,`pointer-events-none`。
- 字体小、灰色 `text-muted-foreground/70`,`font-mono`。
- 文案:`Ver {APP_VERSION}`,中英文都展示 "Ver"。
- 带 `data-testid="app-version-badge"`,便于 E2E 选择器与单元测试断言。

挂载点:`apps/web/src/root-app.tsx` 的 `RootLayout` 函数,确保覆盖 `/login`、`/examples/standalone` 与所有
鉴权页。

### 4. 构建脚本

#### `scripts/generate-version.mjs`(prebuild)

- 读取 `process.env.BUILD_TZ`(默认 `Asia/Shanghai`)决定输出时区。
- 取当前 `Date`,调 `formatBuildVersion` 生成 `APP_VERSION`。
- 另生成 `APP_BUILD_TIME_ISO`(ISO 字符串,带时区偏移)。
- 写入 `apps/web/src/generated/version.ts`,ESM 模块,导出两个常量。
- 同步在终端打印本次构建的 `APP_VERSION`,便于在 CI 日志里一眼看到。

#### `scripts/package-dist.mjs`(postbuild)

- 解析 `apps/web/src/generated/version.ts` 的 `APP_VERSION`(正则提取字符串字面量,**不在本脚本中再算时间**)。
- 校验 `dist/ruihui-next/` 存在且非空,否则 throw。
- 用 `archiver` 把它打成 `dist/ruihui-next_${APP_VERSION}.zip`,压缩级别 9。
- zip 内部直接是 `ruihui-next/...`(`archiver.directory(src, "ruihui-next")` 即可,不要再嵌套)。
- 终端打印 `Created dist/ruihui-next_${APP_VERSION}.zip (XX KB)`。

#### `apps/web/package.json`

```jsonc
{
  "scripts": {
    "prepare": "node scripts/generate-version.mjs",
    "prebuild": "node scripts/generate-version.mjs",
    "build": "tsc -p tsconfig.json && vite build",
    "postbuild": "node scripts/package-dist.mjs"
  },
  "devDependencies": {
    "archiver": "^7.0.1",
    "@types/archiver": "^6.0.3"
  }
}
```

## 关键决策

- **单一来源**:版本号字符串只在前端代码里读 `APP_VERSION`,在 zip 脚本里通过正则从 `version.ts` 抠出同一个
  常量,而不是再 `new Date()` 一遍。这样 `Ver ...` 与 `_...zip` 永远一致。
- **不引入语义版本**:本次需求是时间戳,接 `package.json` 的 `version` 会引入"如何 bump"的额外讨论,留作
  后续 spec。
- **登录页也显示**:用户明确要求"所有页面",所以放在 `RootLayout` 而不是 `AdminLayout`。
- **固定文案 `Ver`**:用户明确要求中英文都显示 `Ver`,因此组件里**不调用** `useTranslation`,也不要再加
  `common.version.*` i18n key。
- **生成文件不入库,但首装自动生成**:`apps/web/src/generated/` 加进根 `.gitignore` 与 eslint ignores;同
  时 `package.json` 的 `prepare` 钩子在 `pnpm install` 时跑 `generate-version.mjs`,解决"刚 clone,文件不
  在,IDE 飘红"的问题。

## 风险与回滚

| 风险 | 缓解 |
|------|------|
| CI 容器 `TZ` 与本地不同,导致同一构建在两处跑出不同版本号 | 脚本里 `BUILD_TZ` 默认 `Asia/Shanghai` 并显式打印,README 注明;若 CI 想强制 UTC,可设 `BUILD_TZ=UTC` |
| 首次 clone 后 IDE 飘红 `@/generated/version` 找不到模块 | `pnpm install` 通过 `prepare` 钩子自动生成 `version.ts`,无需 commit stub |
| `archiver` 在 Node 18 下的 `fs/promises` 调用差异 | 项目根 `package.json` 已是 Node 20+ 假设,`archiver@7` 要求 Node 18+,沿用即可;若 CI 失败,把 `engines.node` 显式声明 ≥20 |
| `tsc -p tsconfig.json` 在 `prebuild` 之后才跑,导致 `tsc` 看到的 `APP_VERSION` 是新生成的 | 这是预期行为,确保类型与运行时一致 |
| 旧的 `dist/ruihui-next_*.zip` 残留导致磁盘膨胀 | postbuild 不主动清理旧 zip;若需要,在 `package-dist.mjs` 开头加 `rm -f dist/ruihui-next_*.zip`(留作后续增强,不在本次范围) |

## 完成定义

- [ ] `pnpm --filter @repo/web build` 跑通,产物包含 `dist/ruihui-next_<VERSION>.zip`。
- [ ] `pnpm --filter @repo/web lint` / `typecheck` / `test` 全绿。
- [ ] 启动 `pnpm --filter @repo/web dev`,所有页面(含 `/login`)左下角显示 `Ver <VERSION>`。
- [ ] 仓库内 `apps/web/src/generated/` 整目录 gitignore;`pnpm install` 之后 `version.ts` 自动出现,内容
      与本机时间一致。
- [ ] `docs/specs/2026-06-09/app-build-version.md` 本文件已提交。

## 涉及文件

| 类别 | 路径 |
|------|------|
| 新增 | `apps/web/src/lib/version/format-version.ts` |
| 新增 | `apps/web/src/lib/version/format-version.test.ts` |
| 新增 | `apps/web/src/components/layout/version-badge.tsx` |
| 新增 | `apps/web/src/components/layout/version-badge.test.tsx` |
| 新增 | `apps/web/scripts/generate-version.mjs` |
| 新增 | `apps/web/scripts/package-dist.mjs` |
| 新增(脚本生成,不入库) | `apps/web/src/generated/version.ts` |
| 修改 | `apps/web/src/root-app.tsx`(`RootLayout` 挂载 `<VersionBadge />`) |
| 修改 | `apps/web/package.json`(pre/post 脚本 + devDeps) |
| 修改 | `apps/web/eslint.config.js`(忽略 `src/generated`) |
| 修改 | `.gitignore`(`apps/web/src/generated/`) |
| 文档 | `docs/specs/2026-06-09/app-build-version.md`(本文件) |
