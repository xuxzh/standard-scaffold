import { Outlet } from "@tanstack/react-router";
import { RouteActivityPortalScope } from "@/components/routing/route-activity-portal";

/**
 * 嵌入式路由的视口容器。职责与 `AdminLayout` 对称但更轻:
 *
 * - 把路由树锁定到 `h-svh`,让 page `<section>` 的 `flex-1` 链路生效,
 *   配合 `DataTable` 已有的内部滚动结构(`min-h-0 flex-1 overflow-auto`
 *   + sticky 表头)实现"form+table 占满视口、仅 table 内部滚动"。
 * - 不渲染任何 chrome:既不挂 `AppHeader` / `AppSidebar`,
 *   也不渲染 `VersionBadge`(后者由 `AdminLayout` 承接,见
 *   `docs/specs/2026-06-11/embedded-page-mode.md` §"URL 约定")。
 * - 不需要 `md:h-[calc(100svh-1rem)]` 这种桌面端偏移:embed 没有
 *   header 占用空间,直接占满视口。
 *
 * 页面层不感知自己是否在 embed 模式,只关心"我能不能拿到 token、
 * 能不能正常调 API";高度约束是路由/布局关注点(spec §5)。
 *
 * 注意:虽然 embed 模式不接入 `RouteActivityCache`(无 keep-alive
 * 需求),我们仍然需要 `RouteActivityPortalScope`,否则 Radix UI 的
 * Dialog / AlertDialog / Sheet 会 portal 到 `document.body`,脱离
 * 嵌入容器。脱离后,父应用通过 `[data-qiankun]` scope 注入的样式
 * (见 `main.tsx` 的 `injectMicroHostStyles`)无法命中对话框内容,
 * 导致嵌入页面对话框样式丢失。
 */
export function EmbedLayout() {
  return (
    <RouteActivityPortalScope>
      <main
        data-testid="embed-shell"
        className="flex h-svh min-h-0 flex-col overflow-hidden bg-background"
      >
        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:p-6">
          <Outlet />
        </div>
      </main>
    </RouteActivityPortalScope>
  );
}
