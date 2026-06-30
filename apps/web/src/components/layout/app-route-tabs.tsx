import { XIcon } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import type { AdminPageDefinition } from "@/components/layout/admin-shell-routes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type OpenAdminTab = Pick<
  AdminPageDefinition,
  "icon" | "pathname" | "tabSlug" | "titleKey"
>;

type AppRouteTabsProps = {
  activePathname: string;
  onCloseTab: (pathname: OpenAdminTab["pathname"]) => void;
  tabs: readonly OpenAdminTab[];
};

export function AppRouteTabs({
  activePathname,
  onCloseTab,
  tabs,
}: AppRouteTabsProps) {
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
        {tabs.map((tab, index) => {
          const isActive = tab.pathname === activePathname;
          const Icon = tab.icon;
          const title = t(tab.titleKey);

          return (
            <div
              className={cn(
                "inline-flex h-8 max-w-64 shrink-0 items-center rounded-md border text-sm transition-colors",
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
              key={tab.pathname}
            >
              <button
                aria-current={isActive ? "page" : undefined}
                className="inline-flex h-full min-w-0 flex-1 items-center gap-2 rounded-l-md px-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                data-testid={`admin-route-tab-${tab.tabSlug}`}
                onClick={() => {
                  void navigate({ to: tab.pathname });
                }}
                title={isActive ? t("tabs.currentPage") : undefined}
                type="button"
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{title}</span>
              </button>
              <Button
                aria-label={t("tabs.closePage", { title })}
                className={cn(
                  "mr-1 text-current opacity-70 hover:text-destructive hover:opacity-100",
                  isActive && "hover:bg-primary-foreground/20",
                )}
                data-testid={`admin-route-tab-close-${tab.tabSlug}`}
                onClick={() => {
                  const remainingTabs = tabs.filter(
                    (item) => item.pathname !== tab.pathname,
                  );

                  onCloseTab(tab.pathname);

                  if (!isActive) {
                    return;
                  }

                  const nextTab =
                    remainingTabs[index - 1] ?? remainingTabs[index];

                  void navigate({ to: nextTab?.pathname ?? "/dashboard" });
                }}
                size="icon-xs"
                title={t("tabs.closePage", { title })}
                type="button"
                variant="ghost"
              >
                <XIcon data-icon="inline-start" />
              </Button>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
