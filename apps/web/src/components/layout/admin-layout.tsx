1|import { useMemo, type ReactNode } from "react";
     2|import { useRouterState } from "@tanstack/react-router";
     3|import { useTranslation } from "react-i18next";
     4|import { AppHeader } from "@/components/layout/app-header";
     5|import { AppSidebar } from "@/components/layout/app-sidebar";
     6|import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
     7|
     8|type AdminLayoutProps = {
     9|  children: ReactNode;
    10|};
    11|
    12|const pageCopy = {
    13|  "/dashboard": {
    14|    titleKey: "pages.dashboard.title",
    15|    descriptionKey: "pages.dashboard.description"
    16|  },
    17|  "/examples/embedded": {
    18|    titleKey: "pages.embeddedExample.title",
    19|    descriptionKey: "pages.embeddedExample.description"
    20|  },
    21|  "/packaging/packaging-type": {
    22|    titleKey: "pages.packagingType.title",
    23|    descriptionKey: "pages.packagingType.description"
    24|  },
    25|  "/packaging/packaging-level": {
    26|    titleKey: "pages.packagingLevel.title",
    27|    descriptionKey: "pages.packagingLevel.description"
    28|  },
    29|    30|  "/packaging/packaging-kit": {
    31|    titleKey: "pages.packagingKit.title",
    32|    descriptionKey: "pages.packagingKit.description"
    33|    34|  "/packaging/packaging-spec": {
    35|    titleKey: "pages.packagingSpec.title",
    36|    descriptionKey: "pages.packagingSpec.description"
    37|    38|  }
    39|} as const;
    40|
    41|export function AdminLayout({ children }: AdminLayoutProps) {
    42|  const pathname = useRouterState({
    43|    select: (state) => state.location.pathname
    44|  });
    45|  const { t } = useTranslation("common");
    46|
    47|  const copy = useMemo(() => {
    48|    const current = pageCopy[pathname as keyof typeof pageCopy] ?? pageCopy["/dashboard"];
    49|
    50|    return {
    51|      title: t(current.titleKey),
    52|      description: t(current.descriptionKey)
    53|    };
    54|  }, [pathname, t]);
    55|
    56|  return (
    57|    <SidebarProvider>
    58|      <AppSidebar />
    59|      <SidebarInset data-testid="admin-shell">
    60|        <AppHeader title={copy.title} description={copy.description} />
    61|        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{children}</div>
    62|      </SidebarInset>
    63|    </SidebarProvider>
    64|  );
    65|}
    66|