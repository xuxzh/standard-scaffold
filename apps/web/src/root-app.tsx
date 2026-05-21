import { createMemoryHistory, createRootRoute, createRoute, createRouter, Outlet, redirect, RouterProvider } from "@tanstack/react-router";
import { AdminLayout } from "@/components/layout/admin-layout";
import { DashboardPage } from "@/routes/dashboard";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { StandaloneExamplePage } from "@/routes/examples.standalone";

type AppProps = {
  initialEntries?: string[];
};

function RootLayout() {
  return <Outlet />;
}

const rootRoute = createRootRoute({
  component: RootLayout
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  }
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: () => (
    <AdminLayout>
      <DashboardPage />
    </AdminLayout>
  )
});

const embeddedExampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples/embedded",
  component: () => (
    <AdminLayout>
      <EmbeddedExamplePage />
    </AdminLayout>
  )
});

const standaloneExampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples/standalone",
  component: StandaloneExamplePage
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  embeddedExampleRoute,
  standaloneExampleRoute
]);

function createAppRouter(initialEntries: string[] = ["/dashboard"]) {
  return createRouter({
    routeTree,
    history: createMemoryHistory({
      initialEntries
    }),
    defaultPreload: "intent",
    scrollRestoration: true
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}

export function App({ initialEntries }: AppProps) {
  const router = createAppRouter(initialEntries);

  return <RouterProvider router={router} />;
}
