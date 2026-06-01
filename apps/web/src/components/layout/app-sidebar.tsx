import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ChevronRightIcon,
  LayoutDashboardIcon,
  FileTextIcon,
  PackageIcon,
  SquareArrowOutUpRightIcon,
  WorkflowIcon,
} from "lucide-react";
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

  const primaryItems = [
    {
      title: t("navigation.dashboard"),
      to: "/dashboard",
      icon: LayoutDashboardIcon,
    },
  ] as const;

  const groupedItems = [
    {
      key: "examples",
      title: t("navigation.exampleManagement"),
      icon: FileTextIcon,
      items: [
        {
          title: t("navigation.embeddedExample"),
          to: "/examples/embedded",
          icon: FileTextIcon,
          testId: "sidebar-nav-embedded",
        },
        {
          title: t("navigation.standalonePreview"),
          to: "/examples/standalone",
          icon: SquareArrowOutUpRightIcon,
          testId: "sidebar-nav-standalone",
        },
      ],
    },
    {
      key: "packaging",
      title: t("navigation.packagingManagement"),
      icon: PackageIcon,
      items: [
        {
          title: t("navigation.packagingTypeMaintenance"),
          to: "/packaging/packaging-type",
          icon: PackageIcon,
          testId: "sidebar-nav-packaging-packaging-type",
        },
        {
          title: t("navigation.packagingLevelMaintenance"),
          to: "/packaging/packaging-level",
          icon: PackageIcon,
          testId: "sidebar-nav-packaging-packaging-level",
        },
        {
          title: t("navigation.packagingKitMaintenance"),
          to: "/packaging/packaging-kit",
          icon: PackageIcon,
          testId: "sidebar-nav-packaging-packaging-kit",
        },
        {
          title: t("navigation.packagingSpecMaintenance"),
          to: "/packaging/packaging-spec",
          icon: PackageIcon,
          testId: "sidebar-nav-packaging-packaging-spec",
        },
      ],
    },
  ] as const;

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {
      examples: true,
      packaging: true,
    },
  );

  const activeGroupKey = groupedItems.find((group) =>
    group.items.some((item) => item.to === pathname),
  )?.key;

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
                    <Link data-testid="sidebar-nav-dashboard" to={item.to}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {groupedItems.map((group) => {
                const isGroupActive = group.items.some(
                  (item) => pathname === item.to,
                );
                const isExpanded =
                  expandedGroups[group.key] ?? group.key === activeGroupKey;
                const submenuId = `sidebar-group-${group.key}`;

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
                        <group.icon />
                        <span>{group.title}</span>
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
                        {group.items.map((item) => (
                          <SidebarMenuSubItem key={item.to}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={pathname === item.to}
                            >
                              <Link data-testid={item.testId} to={item.to}>
                                <item.icon />
                                <span>{item.title}</span>
                              </Link>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
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
