import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import {
  createBrowserHistory,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  redirect,
  RouterProvider
} from "@tanstack/react-router";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AdminLayout } from "@/components/layout/admin-layout";
import { Toaster } from "@/components/ui/sonner";
import { I18nProvider } from "@/i18n/i18n-provider";
import { createAppQueryClient } from "@/lib/query-client";
import { DashboardPage } from "@/routes/dashboard";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { StandaloneExamplePage } from "@/routes/examples.standalone";
import { PackagingTypePage } from "@/routes/packaging.packaging-type";
import "@/i18n/config";

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

const packagingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-type",
  component: () => (
    <AdminLayout>
      <PackagingTypePage />
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
  packagingRoute,
  standaloneExampleRoute
]);

function createAppRouter(initialEntries?: string[]) {
  return createRouter({
    routeTree,
    history: initialEntries
      ? createMemoryHistory({
          initialEntries
        })
      : createBrowserHistory(),
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
  const [queryClient] = useState(() => createAppQueryClient());

  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          <Toaster />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
