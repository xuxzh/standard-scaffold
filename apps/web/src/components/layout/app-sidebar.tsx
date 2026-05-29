1|import { useState } from "react";
     2|import { Link, useRouterState } from "@tanstack/react-router";
     3|import { useTranslation } from "react-i18next";
     4|import {
     5|  ChevronRightIcon,
     6|  LayoutDashboardIcon,
     7|  FileTextIcon,
     8|  PackageIcon,
     9|  SquareArrowOutUpRightIcon,
    10|  WorkflowIcon
    11|} from "lucide-react";
    12|import {
    13|  Sidebar,
    14|  SidebarContent,
    15|  SidebarGroup,
    16|  SidebarGroupContent,
    17|  SidebarGroupLabel,
    18|  SidebarHeader,
    19|  SidebarMenu,
    20|  SidebarMenuButton,
    21|  SidebarMenuItem,
    22|  SidebarMenuSub,
    23|  SidebarMenuSubButton,
    24|  SidebarMenuSubItem,
    25|  SidebarRail
    26|} from "@/components/ui/sidebar";
    27|
    28|export function AppSidebar() {
    29|  const pathname = useRouterState({
    30|    select: (state) => state.location.pathname
    31|  });
    32|  const { t } = useTranslation("common");
    33|
    34|  const primaryItems = [
    35|    {
    36|      title: t("navigation.dashboard"),
    37|      to: "/dashboard",
    38|      icon: LayoutDashboardIcon
    39|    }
    40|  ] as const;
    41|
    42|  const groupedItems = [
    43|    {
    44|      key: "examples",
    45|      title: t("navigation.exampleManagement"),
    46|      icon: FileTextIcon,
    47|      items: [
    48|        {
    49|          title: t("navigation.embeddedExample"),
    50|          to: "/examples/embedded",
    51|          icon: FileTextIcon,
    52|          testId: "sidebar-nav-embedded"
    53|        },
    54|        {
    55|          title: t("navigation.standalonePreview"),
    56|          to: "/examples/standalone",
    57|          icon: SquareArrowOutUpRightIcon,
    58|          testId: "sidebar-nav-standalone"
    59|        }
    60|      ]
    61|    },
    62|    {
    63|      key: "packaging",
    64|      title: t("navigation.packagingManagement"),
    65|      icon: PackageIcon,
    66|      items: [
    67|        {
    68|          title: t("navigation.packagingTypeMaintenance"),
    69|          to: "/packaging/packaging-type",
    70|          icon: PackageIcon,
    71|          testId: "sidebar-nav-packaging-packaging-type"
    72|        },
    73|        {
    74|          title: t("navigation.packagingLevelMaintenance"),
    75|          to: "/packaging/packaging-level",
    76|          icon: PackageIcon,
    77|          testId: "sidebar-nav-packaging-packaging-level"
    78|        },
    79|        {
    80|    81|          title: t("navigation.packagingKitMaintenance"),
    82|          to: "/packaging/packaging-kit",
    83|          icon: PackageIcon,
    84|          testId: "sidebar-nav-packaging-packaging-kit"
    85|    86|          title: t("navigation.packagingSpecMaintenance"),
    87|          to: "/packaging/packaging-spec",
    88|          icon: PackageIcon,
    89|          testId: "sidebar-nav-packaging-packaging-spec"
    90|    91|        }
    92|      ]
    93|    }
    94|  ] as const;
    95|
    96|  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    97|    examples: true,
    98|    packaging: true
    99|  });
   100|
   101|  const activeGroupKey = groupedItems.find((group) =>
   102|    group.items.some((item) => item.to === pathname)
   103|  )?.key;
   104|
   105|  return (
   106|    <Sidebar collapsible="icon" variant="inset">
   107|      <SidebarHeader>
   108|        <SidebarMenu>
   109|          <SidebarMenuItem>
   110|            <SidebarMenuButton asChild size="lg">
   111|              <Link to="/dashboard">
   112|                <WorkflowIcon />
   113|                <span>{t("brand.standardScaffold")}</span>
   114|              </Link>
   115|            </SidebarMenuButton>
   116|          </SidebarMenuItem>
   117|        </SidebarMenu>
   118|      </SidebarHeader>
   119|      <SidebarContent>
   120|        <SidebarGroup>
   121|          <SidebarGroupLabel>{t("navigation.title")}</SidebarGroupLabel>
   122|          <SidebarGroupContent>
   123|            <SidebarMenu>
   124|              {primaryItems.map((item) => (
   125|                <SidebarMenuItem key={item.to}>
   126|                  <SidebarMenuButton asChild isActive={pathname === item.to}>
   127|                    <Link data-testid="sidebar-nav-dashboard" to={item.to}>
   128|                      <item.icon />
   129|                      <span>{item.title}</span>
   130|                    </Link>
   131|                  </SidebarMenuButton>
   132|                </SidebarMenuItem>
   133|              ))}
   134|              {groupedItems.map((group) => {
   135|                const isGroupActive = group.items.some((item) => pathname === item.to);
   136|                const isExpanded = expandedGroups[group.key] ?? group.key === activeGroupKey;
   137|                const submenuId = `sidebar-group-${group.key}`;
   138|
   139|                return (
   140|                  <SidebarMenuItem key={group.key}>
   141|                    <SidebarMenuButton
   142|                      aria-controls={submenuId}
   143|                      aria-expanded={isExpanded}
   144|                      className="justify-between"
   145|                      isActive={isGroupActive}
   146|                      onClick={() => {
   147|                        setExpandedGroups((current) => ({
   148|                          ...current,
   149|                          [group.key]: !current[group.key]
   150|                        }));
   151|                      }}
   152|                      type="button"
   153|                    >
   154|                      <span className="flex min-w-0 items-center gap-2">
   155|                        <group.icon />
   156|                        <span>{group.title}</span>
   157|                      </span>
   158|                      <ChevronRightIcon
   159|                        className={isExpanded ? "rotate-90 transition-transform" : "transition-transform"}
   160|                      />
   161|                    </SidebarMenuButton>
   162|                    {isExpanded ? (
   163|                      <SidebarMenuSub id={submenuId}>
   164|                        {group.items.map((item) => (
   165|                          <SidebarMenuSubItem key={item.to}>
   166|                            <SidebarMenuSubButton asChild isActive={pathname === item.to}>
   167|                              <Link data-testid={item.testId} to={item.to}>
   168|                                <item.icon />
   169|                                <span>{item.title}</span>
   170|                              </Link>
   171|                            </SidebarMenuSubButton>
   172|                          </SidebarMenuSubItem>
   173|                        ))}
   174|                      </SidebarMenuSub>
   175|                    ) : null}
   176|                  </SidebarMenuItem>
   177|                );
   178|              })}
   179|            </SidebarMenu>
   180|          </SidebarGroupContent>
   181|        </SidebarGroup>
   182|      </SidebarContent>
   183|      <SidebarRail />
   184|    </Sidebar>
   185|  );
   186|}
   187|