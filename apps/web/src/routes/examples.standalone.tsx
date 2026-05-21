import { ArrowLeftIcon, SparklesIcon } from "lucide-react";
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
  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardDescription>Direct Route Access</CardDescription>
          <h1 className="text-3xl font-semibold">Standalone Example</h1>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 text-sm text-muted-foreground">
          <p>这个页面不经过后台壳，因此不会渲染菜单栏、标题栏或侧边栏。</p>
          <p>适合承载独立 Demo、分享页、登录页，或者需要全屏布局的说明页面。</p>
        </CardContent>
        <CardFooter className="gap-3">
          <Button asChild>
            <Link to="/dashboard">
              <ArrowLeftIcon data-icon="inline-start" />
              Return to Dashboard
            </Link>
          </Button>
          <Button variant="outline">
            <SparklesIcon data-icon="inline-start" />
            View Fullscreen Demo
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
