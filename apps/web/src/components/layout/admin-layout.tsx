import { useMemo, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  type AdminPageDefinition,
  getAdminPageDefinition,
  packagingActivityDefinitions,
} from "@/components/layout/admin-shell-routes";
import { AppHeader } from "@/components/layout/app-header";
import {
  AppRouteTabs,
  type OpenAdminTab,
} from "@/components/layout/app-route-tabs";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { VersionBadge } from "@/components/layout/version-badge";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

type AdminLayoutProps = { children: ReactNode };

const fallbackPageDefinition = getAdminPageDefinition("/dashboard");
const heightConstrainedRoutes = new Set(
  packagingActivityDefinitions.map((definition) => definition.pathname),
);

function toOpenAdminTab(definition: AdminPageDefinition): OpenAdminTab {
  return {
    icon: definition.icon,
    pathname: definition.pathname,
    tabSlug: definition.tabSlug,
    titleKey: definition.titleKey,
  };
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { t } = useTranslation("common");
  const pageDefinition = getAdminPageDefinition(pathname);
  const constrainHeight = heightConstrainedRoutes.has(pathname);
  const [openTabs, setOpenTabs] = useState<OpenAdminTab[]>(() =>
    pageDefinition?.tabVisible ? [toOpenAdminTab(pageDefinition)] : [],
  );

  const renderedTabs =
    pageDefinition?.tabVisible &&
    !openTabs.some((tab) => tab.pathname === pageDefinition.pathname)
      ? [...openTabs, toOpenAdminTab(pageDefinition)]
      : openTabs;

  if (renderedTabs !== openTabs) {
    setOpenTabs(renderedTabs);
  }

  const copy = useMemo(() => {
    const current = pageDefinition ?? fallbackPageDefinition;

    return {
      title: current ? t(current.titleKey) : "",
    };
  }, [pageDefinition, t]);

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
        <AppHeader title={copy.title} />
        <AppRouteTabs activePathname={pathname} tabs={renderedTabs} />
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
