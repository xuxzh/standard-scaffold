import { useEffect, useState } from "react";
import { Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { embedPackagingActivityDefinitions } from "@/components/layout/admin-shell-routes";
import { RouteActivityCache } from "@/components/routing/route-activity-cache";
import { subscribeHostRouteSync } from "@/lib/host-route-sync/host-route-sync-source";

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
 */
export function EmbedLayout() {
  const navigate = useNavigate();
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [hostOpenPathnames, setHostOpenPathnames] = useState<
    readonly string[] | null
  >(null);

  useEffect(() => {
    return subscribeHostRouteSync((message) => {
      setHostOpenPathnames(message.openPathnames);
      if (message.activePathname && message.activePathname !== pathname) {
        void navigate({ to: message.activePathname });
      }
    });
  }, [navigate, pathname]);

  return (
    <main
      data-testid="embed-shell"
      className="flex h-svh min-h-0 flex-col overflow-hidden bg-background"
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden p-4 lg:p-6">
        <RouteActivityCache
          activePathnames={hostOpenPathnames ?? [pathname]}
          pathname={pathname}
          definitions={embedPackagingActivityDefinitions}
          fallback={<Outlet />}
        />
      </div>
    </main>
  );
}
