import { useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

const pageCopy = {
  "/dashboard": {
    titleKey: "pages.dashboard.title",
    descriptionKey: "pages.dashboard.description"
  },
  "/examples/embedded": {
    titleKey: "pages.embeddedExample.title",
    descriptionKey: "pages.embeddedExample.description"
  },
  "/wms/packaging": {
    titleKey: "pages.packaging.title",
    descriptionKey: "pages.packaging.description"
  }
} as const;

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });
  const { t } = useTranslation("common");

  const copy = useMemo(() => {
    const current = pageCopy[pathname as keyof typeof pageCopy] ?? pageCopy["/dashboard"];

    return {
      title: t(current.titleKey),
      description: t(current.descriptionKey)
    };
  }, [pathname, t]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset data-testid="admin-shell">
        <AppHeader title={copy.title} description={copy.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
