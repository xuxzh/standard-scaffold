import { APP_VERSION } from "@/generated/version";

/**
 * 全局左下角版本号浮层。
 *
 * - 文案硬编码为 "Ver",中英文一致(用户明确要求)。
 * - 不读 i18n、不消费路由状态,挂在 RootLayout 即可覆盖所有页面(含 /login)。
 * - `pointer-events-none` 避免遮挡底部按钮。
 * - 带 `data-testid` 便于 E2E 与单元测试断言。
 */
export function VersionBadge() {
  return (
    <div
      data-testid="app-version-badge"
      aria-label="应用版本号"
      className="pointer-events-none fixed bottom-2 left-2 z-floating select-none font-mono text-xs tracking-tight text-muted-foreground/70"
    >
      Ver {APP_VERSION}
    </div>
  );
}
