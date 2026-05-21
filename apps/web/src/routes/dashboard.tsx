import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const stats = [
  {
    label: "Active Modules",
    value: "05",
    description: "当前初始化接入的核心后台模块。"
  },
  {
    label: "Shared Packages",
    value: "03",
    description: "继续复用 monorepo 内的共享配置与 UI 包。"
  },
  {
    label: "Public Examples",
    value: "02",
    description: "同时支持壳内页面和脱壳独立访问页面。"
  }
] as const;

export function DashboardPage() {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {stats.map((stat) => (
        <Card key={stat.label}>
          <CardHeader>
            <CardDescription>{stat.label}</CardDescription>
            <CardTitle className="text-3xl">{stat.value}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
