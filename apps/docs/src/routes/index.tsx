import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

function Home() {
  return (
    <main className="mx-auto flex min-h-svh max-w-3xl flex-col justify-center gap-6 px-6 py-16">
      <div className="space-y-3">
        <p className="text-sm font-medium text-fd-muted-foreground">
          Standard Scaffold
        </p>
        <h1 className="text-4xl font-semibold tracking-normal">项目文档</h1>
        <p className="text-lg text-fd-muted-foreground">
          面向项目维护者的工程说明、集成约定和后续业务文档入口。
        </p>
      </div>
      <Link
        to="/docs/$"
        params={{ _splat: "" }}
        className="w-fit rounded-md bg-fd-primary px-4 py-2 text-sm font-medium text-fd-primary-foreground"
      >
        进入文档
      </Link>
    </main>
  );
}
