import { useMemo, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { AppHeader } from "@/components/layout/app-header";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

type AdminLayoutProps = {
  children: ReactNode;
};

const pageCopy = {
  "/dashboard": {
    title: "Dashboard",
    description: "一个最小可扩展的 shadcn-admin 风格后台框架。"
  },
  "/examples/embedded": {
    title: "Embedded Example",
    description: "这个示例页面运行在后台壳内，用于验证菜单与内容区协同。"
  }
} as const;

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });

  const copy = useMemo(() => {
    return pageCopy[pathname as keyof typeof pageCopy] ?? pageCopy["/dashboard"];
  }, [pathname]);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <AppHeader title={copy.title} description={copy.description} />
        <div className="flex flex-1 flex-col gap-6 p-4 lg:p-6">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
