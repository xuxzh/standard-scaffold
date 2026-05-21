import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    key: "activeModules",
    value: "05",
  },
  {
    key: "sharedPackages",
    value: "03",
  },
  {
    key: "publicExamples",
    value: "02",
  }
] as const;

export function DashboardPage() {
  const { t } = useTranslation("dashboard");

  return (
    <section className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
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
