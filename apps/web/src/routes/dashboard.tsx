import { RotateCwIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStatsQuery } from "@/features/dashboard/dashboard-service";

export function DashboardPage() {
  const { t } = useTranslation("dashboard");
  const dashboardStatsQuery = useDashboardStatsQuery();

  if (dashboardStatsQuery.isPending) {
    return (
      <section className="space-y-4">
        <p role="status" className="text-sm text-muted-foreground">
          {t("status.loading")}
        </p>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index}>
              <CardHeader>
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (dashboardStatsQuery.isError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("status.errorTitle")}</CardTitle>
          <CardDescription>{t("status.errorDescription")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4">
          <p className="text-sm text-muted-foreground">{dashboardStatsQuery.error.message}</p>
          <Button onClick={() => void dashboardStatsQuery.refetch()}>
            <RotateCwIcon data-icon="inline-start" />
            {t("status.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {dashboardStatsQuery.data.stats.map((stat) => (
        <Card key={stat.key}>
          <CardHeader>
            <CardDescription>{t(`stats.${stat.key}.label`)}</CardDescription>
            <CardTitle className="text-3xl">{stat.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{t(`stats.${stat.key}.description`)}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
