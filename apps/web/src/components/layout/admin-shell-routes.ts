import type { ComponentType } from "react";
import {
  ArchiveIcon,
  BoxIcon,
  FileTextIcon,
  LayersIcon,
  LayoutDashboardIcon,
  Link2,
  PackageIcon,
  RulerIcon,
  SquareArrowOutUpRightIcon,
  WorkflowIcon,
} from "lucide-react";
import type { RouteActivityDefinition } from "@/components/routing/route-activity-cache";
import { DashboardPage } from "@/routes/dashboard";
import { DebugIpRewriteProxyPage } from "@/routes/debug.ip-rewrite-proxy";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { MaterialPackagingRelationPage } from "@/routes/packaging.material-packaging-relation";
import { PackagingKitPage } from "@/routes/packaging.packaging-kit";
import { PackagingLevelPage } from "@/routes/packaging.packaging-level";
import { PackagingRulePage } from "@/routes/packaging.packaging-rule";
import { PackagingSpecPage } from "@/routes/packaging.packaging-spec";
import { PackagingTypePage } from "@/routes/packaging.packaging-type";

export type AdminShellPathname =
  | "/dashboard"
  | "/examples/embedded"
  | "/packaging/packaging-type"
  | "/packaging/packaging-level"
  | "/packaging/packaging-spec"
  | "/packaging/packaging-kit"
  | "/packaging/packaging-rule"
  | "/packaging/material-packaging-relation"
  | "/debug/ip-rewrite-proxy";

type ShellIcon = ComponentType<{ className?: string }>;

export type AdminPageDefinition = {
  cacheKey?: string;
  component?: ComponentType;
  descriptionKey: string;
  icon: ShellIcon;
  navTitleKey: string;
  pathname: AdminShellPathname;
  tabSlug: string;
  tabVisible: boolean;
  testId: string;
  titleKey: string;
};

type AdminNavigationItem =
  | AdminPageDefinition
  | {
      descriptionKey: string;
      icon: ShellIcon;
      navTitleKey: string;
      pathname: "/examples/standalone";
      tabSlug: string;
      tabVisible: false;
      testId: string;
      titleKey: string;
    };

export type AdminNavigationGroup = {
  icon: ShellIcon;
  items: readonly AdminNavigationItem[];
  key: "examples" | "packaging" | "debug";
  titleKey: string;
};

export const adminPageDefinitions = [
  {
    pathname: "/dashboard",
    tabSlug: "dashboard",
    tabVisible: true,
    titleKey: "pages.dashboard.title",
    descriptionKey: "pages.dashboard.description",
    navTitleKey: "navigation.dashboard",
    testId: "sidebar-nav-dashboard",
    icon: LayoutDashboardIcon,
    component: DashboardPage,
  },
  {
    pathname: "/examples/embedded",
    tabSlug: "examples-embedded",
    tabVisible: true,
    titleKey: "pages.embeddedExample.title",
    descriptionKey: "pages.embeddedExample.description",
    navTitleKey: "navigation.embeddedExample",
    testId: "sidebar-nav-embedded",
    icon: FileTextIcon,
    component: EmbeddedExamplePage,
  },
  {
    pathname: "/packaging/packaging-type",
    tabSlug: "packaging-packaging-type",
    tabVisible: true,
    cacheKey: "packaging-type",
    titleKey: "pages.packagingType.title",
    descriptionKey: "pages.packagingType.description",
    navTitleKey: "navigation.packagingTypeMaintenance",
    testId: "sidebar-nav-packaging-packaging-type",
    icon: PackageIcon,
    component: PackagingTypePage,
  },
  {
    pathname: "/packaging/packaging-level",
    tabSlug: "packaging-packaging-level",
    tabVisible: true,
    cacheKey: "packaging-level",
    titleKey: "pages.packagingLevel.title",
    descriptionKey: "pages.packagingLevel.description",
    navTitleKey: "navigation.packagingLevelMaintenance",
    testId: "sidebar-nav-packaging-packaging-level",
    icon: LayersIcon,
    component: PackagingLevelPage,
  },
  {
    pathname: "/packaging/packaging-spec",
    tabSlug: "packaging-packaging-spec",
    tabVisible: true,
    cacheKey: "packaging-spec",
    titleKey: "pages.packagingSpec.title",
    descriptionKey: "pages.packagingSpec.description",
    navTitleKey: "navigation.packagingSpecMaintenance",
    testId: "sidebar-nav-packaging-packaging-spec",
    icon: RulerIcon,
    component: PackagingSpecPage,
  },
  {
    pathname: "/packaging/packaging-kit",
    tabSlug: "packaging-packaging-kit",
    tabVisible: true,
    cacheKey: "packaging-kit",
    titleKey: "pages.packagingKit.title",
    descriptionKey: "pages.packagingKit.description",
    navTitleKey: "navigation.packagingKitMaintenance",
    testId: "sidebar-nav-packaging-packaging-kit",
    icon: ArchiveIcon,
    component: PackagingKitPage,
  },
  {
    pathname: "/packaging/packaging-rule",
    tabSlug: "packaging-packaging-rule",
    tabVisible: true,
    cacheKey: "packaging-rule",
    titleKey: "pages.packagingRule.title",
    descriptionKey: "pages.packagingRule.description",
    navTitleKey: "navigation.packagingRuleMaintenance",
    testId: "sidebar-nav-packaging-packaging-rule",
    icon: Link2,
    component: PackagingRulePage,
  },
  {
    pathname: "/packaging/material-packaging-relation",
    tabSlug: "packaging-material-packaging-relation",
    tabVisible: true,
    cacheKey: "material-packaging-relation",
    titleKey: "pages.materialPackagingRelation.title",
    descriptionKey: "pages.materialPackagingRelation.description",
    navTitleKey: "navigation.materialPackagingRelationMaintenance",
    testId: "sidebar-nav-packaging-material-packaging-relation",
    icon: BoxIcon,
    component: MaterialPackagingRelationPage,
  },
  {
    pathname: "/debug/ip-rewrite-proxy",
    tabSlug: "debug-ip-rewrite-proxy",
    tabVisible: true,
    titleKey: "pages.debugIpRewriteProxy.title",
    descriptionKey: "pages.debugIpRewriteProxy.description",
    navTitleKey: "navigation.debugIpRewriteProxy",
    testId: "sidebar-nav-debug-ip-rewrite-proxy",
    icon: Link2,
    component: DebugIpRewriteProxyPage,
  },
] as const satisfies readonly AdminPageDefinition[];

export const adminNavigationGroups = [
  {
    key: "examples",
    titleKey: "navigation.exampleManagement",
    icon: FileTextIcon,
    items: [
      adminPageDefinitions[1],
      {
        pathname: "/examples/standalone",
        tabSlug: "examples-standalone",
        tabVisible: false,
        titleKey: "pages.standaloneExample.title",
        descriptionKey: "pages.standaloneExample.description",
        navTitleKey: "navigation.standalonePreview",
        testId: "sidebar-nav-standalone",
        icon: SquareArrowOutUpRightIcon,
      },
    ],
  },
  {
    key: "packaging",
    titleKey: "navigation.packagingManagement",
    icon: PackageIcon,
    items: adminPageDefinitions.slice(2, 8),
  },
  {
    key: "debug",
    titleKey: "navigation.debugTools",
    icon: WorkflowIcon,
    items: [adminPageDefinitions[8]],
  },
] as const satisfies readonly AdminNavigationGroup[];

export function getAdminPageDefinition(pathname: string) {
  return adminPageDefinitions.find(
    (definition) => definition.pathname === pathname,
  );
}

export const packagingActivityDefinitions = adminPageDefinitions.flatMap(
  (definition): RouteActivityDefinition[] => {
    if (!("cacheKey" in definition) || !definition.cacheKey) {
      return [];
    }

    return [
      {
        cacheKey: definition.cacheKey,
        pathname: definition.pathname,
        component: definition.component,
      },
    ];
  },
);
