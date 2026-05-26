import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { packagingModuleSummary } from "@/features/wms/packaging/packaging-contract";

const summaryKeys = ["pendingTasks", "inProgressTasks", "exceptionTasks"] as const;

export function PackagingPage() {
  const { t } = useTranslation("common");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {summaryKeys.map((key) => (
        <Card key={key}>
          <CardHeader>
            <CardDescription>{t(`pages.packaging.summary.${key}.label`)}</CardDescription>
            <CardTitle className="text-3xl">{packagingModuleSummary[key]}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t(`pages.packaging.summary.${key}.description`)}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
