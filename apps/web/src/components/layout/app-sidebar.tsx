import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboardIcon,
  FileTextIcon,
  PackageIcon,
  SquareArrowOutUpRightIcon,
  WorkflowIcon
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname
  });
  const { t } = useTranslation("common");

  const primaryItems = [
    {
      title: t("navigation.dashboard"),
      to: "/dashboard",
      icon: LayoutDashboardIcon
    },
    {
      title: t("navigation.embeddedExample"),
      to: "/examples/embedded",
      icon: FileTextIcon
    },
    {
      title: t("navigation.packaging"),
      to: "/wms/packaging",
      icon: PackageIcon
    }
  ] as const;

  return (
    <Sidebar collapsible="icon" variant="inset">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/dashboard">
                <WorkflowIcon />
                <span>{t("brand.standardScaffold")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t("navigation.title")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {primaryItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton asChild isActive={pathname === item.to}>
                    <Link
                      data-testid={
                        item.to === "/dashboard"
                          ? "sidebar-nav-dashboard"
                          : item.to === "/wms/packaging"
                            ? "sidebar-nav-wms-packaging"
                            : "sidebar-nav-embedded"
                      }
                      to={item.to}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild>
              <Link data-testid="sidebar-nav-standalone" to="/examples/standalone">
                <SquareArrowOutUpRightIcon />
                <span>{t("navigation.standalonePreview")}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
