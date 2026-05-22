import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader
} from "@/components/ui/card";

export function StandaloneExamplePage() {
  const { t } = useTranslation("examples");

  return (
    <main
      data-testid="standalone-page"
      className="flex min-h-svh items-center justify-center bg-muted/30 p-6"
    >
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>{t("standalone.routeAccess")}</CardDescription>
          <h1 className="text-3xl font-semibold">{t("standalone.title")}</h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>{t("standalone.paragraphOne")}</p>
          <p>{t("standalone.paragraphTwo")}</p>
        </CardContent>
        <CardFooter className="gap-3">
          <Button asChild>
            <Link to="/dashboard">
              <ArrowLeftIcon data-icon="inline-start" />
              {t("standalone.returnToDashboard")}
            </Link>
          </Button>
          <Button variant="outline">
            <SparklesIcon data-icon="inline-start" />
            {t("standalone.fullscreenDemo")}
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
