# Web Build 输出目录调整为 ruihui-next Spec

日期：2026-06-04

## 背景

当前 `apps/web` 使用 Vite 默认构建输出目录，执行 `pnpm --filter @repo/web build` 后产物会落在 `apps/web/dist`。

本次需求希望保留现有构建流程和静态资源命名规则，只把最终输出目录调整为 `apps/web/dist/ruihui-next`，以便后续部署或分发时拥有稳定的业务目录名。

## 目标

- 将 Web 应用构建产物的输出目录改为 `apps/web/dist/ruihui-next`。
- 保持现有构建命令不变，继续使用 `pnpm --filter @repo/web build`。
- 保持现有 `js`、`css` 和其他静态资源的命名规则不变。

## 非目标

- 不修改仓库根目录 `package.json` 中的 `build` 脚本。
- 不修改 `apps/web/package.json` 中的 `build` 脚本。
- 不修改 Rollup `entryFileNames`、`chunkFileNames` 或 `assetFileNames`。
- 不引入新的构建 mode、环境变量或部署脚本。
- 不调整 Turbo 的 `dist/**` 输出约定。

## 范围级别

- 建议任务级别：`L1`
- 原因：只涉及 `apps/web` 的单点构建配置调整，不改变页面行为、运行时代码路径或数据流。

## 受影响边界

- 工具链：`apps/web` 的 Vite build 配置。
- 输出产物：构建结果从 `apps/web/dist` 下沉到 `apps/web/dist/ruihui-next`。
- 验证路径：需要重新确认 `pnpm --filter @repo/web build` 的产物目录位置。

## 建议方案

在 `apps/web/vite.config.ts` 的 `build` 配置中新增：

```ts
build: {
  outDir: "dist/ruihui-next",
  rollupOptions: {
    // existing output config
  }
}
```

采用该方案的原因：

- 与 Vite 原生配置能力一致，不需要增加脚本包装或目录搬运步骤。
- 改动集中在最接近行为控制的位置，便于维护和理解。
- `turbo.json` 当前使用的 `dist/**` 输出匹配仍然有效，不需要联动修改。
- 不影响当前基于 hash 的静态资源命名和 `manualChunks` 拆包策略。

## 备选方案

### 方案 A：在 `vite.config.ts` 中配置 `build.outDir`

- 优点：改动最小，语义最直接，和现有构建流程完全兼容。
- 缺点：输出目录固定，如后续需要多套目录命名策略，需要再扩展配置。

### 方案 B：在 `apps/web/package.json` 的 `build` 脚本中增加构建后搬运

- 优点：可以在不改 Vite 配置的前提下控制最终目录结构。
- 缺点：引入额外脚本复杂度，且会增加构建后文件移动的维护成本。

### 方案 C：通过环境变量控制输出目录

- 优点：后续更容易扩展不同环境的输出目录。
- 缺点：超出当前需求，引入不必要的配置复杂度。

最终采用方案 A。

## 验证计划

- 运行 `pnpm --filter @repo/web build`，确认构建成功。
- 检查产物是否生成在 `apps/web/dist/ruihui-next`。
- 确认输出目录下仍包含 Vite 默认生成的入口文件和 `assets/` 目录。
- 确认仓库根目录和 `apps/web` 目录下未额外生成非预期的平行构建目录。

## 风险

- 路径假设风险：若仓库内其他脚本或部署流程硬编码依赖 `apps/web/dist` 根目录，需要后续同步调整。
- 文档缺口风险：当前已有文档对 Web 产物目录的描述仍指向 `apps/web/dist`，实现时可能需要一并修正。
- 构建缓存认知风险：Turbo 的输出匹配虽然仍覆盖 `dist/**`，但团队成员需要知道实际部署目录已下沉一级。

## 需要更新的文档

- `docs/specs/2026-06-04/web-build-outdir-ruihui-next-design.md`
- 如实现时发现现有文档明确声明产物目录为 `apps/web/dist`，则同步更新对应说明文档
