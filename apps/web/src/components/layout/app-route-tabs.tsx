import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AdminPageDefinition } from "@/components/layout/admin-shell-routes";
import { cn } from "@/lib/utils";

export type OpenAdminTab = Pick<
  AdminPageDefinition,
  "icon" | "pathname" | "tabSlug" | "titleKey"
>;

type AppRouteTabsProps = {
  activePathname: string;
  tabs: readonly OpenAdminTab[];
};

export function AppRouteTabs({ activePathname, tabs }: AppRouteTabsProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  if (tabs.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label={t("tabs.openPages")}
      className="border-b bg-background/95 px-4 lg:px-6"
      data-testid="admin-route-tabs"
    >
      <div className="flex min-w-0 gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const isActive = tab.pathname === activePathname;
          const Icon = tab.icon;

          return (
            <button
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex h-8 max-w-56 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              data-testid={`admin-route-tab-${tab.tabSlug}`}
              key={tab.pathname}
              onClick={() => {
                void navigate({ to: tab.pathname });
              }}
              title={isActive ? t("tabs.currentPage") : undefined}
              type="button"
            >
              <Icon className="size-4 shrink-0" />
              <span className="truncate">{t(tab.titleKey)}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
