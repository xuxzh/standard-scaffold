import { useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { VersionBadge } from "@/components/layout/version-badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AdminLayoutProps = { children: ReactNode };

const pageCopy = {
  "/dashboard": {
    titleKey: "pages.dashboard.title",
    descriptionKey: "pages.dashboard.description",
  },
  "/examples/embedded": {
    titleKey: "pages.embeddedExample.title",
    descriptionKey: "pages.embeddedExample.description",
  },
  "/packaging/packaging-type": {
    titleKey: "pages.packagingType.title",
    descriptionKey: "pages.packagingType.description",
  },
  "/packaging/packaging-level": {
    titleKey: "pages.packagingLevel.title",
    descriptionKey: "pages.packagingLevel.description",
  },
  "/packaging/packaging-kit": {
    titleKey: "pages.packagingKit.title",
    descriptionKey: "pages.packagingKit.description",
  },
  "/packaging/packaging-spec": {
    titleKey: "pages.packagingSpec.title",
    descriptionKey: "pages.packagingSpec.description",
  },
  "/packaging/packaging-rule": {
    titleKey: "pages.packagingRule.title",
    descriptionKey: "pages.packagingRule.description",
  },
  "/packaging/material-packaging-relation": {
    titleKey: "pages.materialPackagingRelation.title",
    descriptionKey: "pages.materialPackagingRelation.description",
  },
  "/debug/ip-rewrite-proxy": {
    titleKey: "pages.debugIpRewriteProxy.title",
    descriptionKey: "pages.debugIpRewriteProxy.description",
  },
} as const;

const heightConstrainedRoutes = new Set<string>([
  "/packaging/material-packaging-relation",
  "/packaging/packaging-type",
  "/packaging/packaging-level",
  "/packaging/packaging-spec",
  "/packaging/packaging-kit",
  "/packaging/packaging-rule",
]);

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { t } = useTranslation("common");
  const constrainHeight = heightConstrainedRoutes.has(pathname);

  const copy = useMemo(() => {
    const current =
      pageCopy[pathname as keyof typeof pageCopy] ?? pageCopy["/dashboard"];

    return {
      title: t(current.titleKey),
      description: t(current.descriptionKey),
    };
  }, [pathname, t]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset
        className={cn(
          constrainHeight &&
            "h-svh min-h-0 overflow-hidden md:h-[calc(100svh-1rem)]",
        )}
        data-testid="admin-shell"
      >
        <AppHeader title={copy.title} description={copy.description} />
        <div
          className={cn(
            "flex min-w-0 flex-1 flex-col gap-6 p-4 lg:p-6",
            constrainHeight && "min-h-0 overflow-hidden",
          )}
        >
          {children}
        </div>
        <VersionBadge />
      </SidebarInset>
    </SidebarProvider>
  );
}
