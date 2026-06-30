import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChevronRightIcon, WorkflowIcon } from "lucide-react";
import {
  adminNavigationGroups,
  getAdminPageDefinition,
} from "@/components/layout/admin-shell-routes";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

export function AppSidebar() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const { t } = useTranslation("common");
  const dashboardDefinition = getAdminPageDefinition("/dashboard");

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      examples: true,
      packaging: true,
      debug: true,
    },
  );

  const activeGroupKey = adminNavigationGroups.find((group) =>
    group.items.some((item) => item.pathname === pathname),
  )?.key;

  if (!dashboardDefinition) {
    return null;
  }

  const DashboardIcon = dashboardDefinition.icon;

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
              <SidebarMenuItem key={dashboardDefinition.pathname}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === dashboardDefinition.pathname}
                >
                  <Link
                    data-testid={dashboardDefinition.testId}
                    to={dashboardDefinition.pathname}
                  >
                    <DashboardIcon />
                    <span>{t(dashboardDefinition.navTitleKey)}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {adminNavigationGroups.map((group) => {
                const isGroupActive = group.items.some(
                  (item) => pathname === item.pathname,
                );
                const isExpanded =
                  expandedGroups[group.key] ?? group.key === activeGroupKey;
                const submenuId = `sidebar-group-${group.key}`;
                const GroupIcon = group.icon;

                return (
                  <SidebarMenuItem key={group.key}>
                    <SidebarMenuButton
                      aria-controls={submenuId}
                      aria-expanded={isExpanded}
                      className="justify-between"
                      isActive={isGroupActive}
                      onClick={() => {
                        setExpandedGroups((current) => ({
                          ...current,
                          [group.key]: !current[group.key],
                        }));
                      }}
                      type="button"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <GroupIcon />
                        <span>{t(group.titleKey)}</span>
                      </span>
                      <ChevronRightIcon
                        className={
                          isExpanded
                            ? "rotate-90 transition-transform"
                            : "transition-transform"
                        }
                      />
                    </SidebarMenuButton>
                    {isExpanded ? (
                      <SidebarMenuSub id={submenuId}>
                        {group.items.map((item) => {
                          const ItemIcon = item.icon;

                          return (
                            <SidebarMenuSubItem key={item.pathname}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={pathname === item.pathname}
                              >
                                <Link
                                  data-testid={item.testId}
                                  to={item.pathname}
                                >
                                  <ItemIcon />
                                  <span>{t(item.navTitleKey)}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    ) : null}
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
