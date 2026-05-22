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
import { I18nProvider } from "@/i18n/i18n-provider";
import { DashboardPage } from "@/routes/dashboard";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { StandaloneExamplePage } from "@/routes/examples.standalone";
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

  return (
    <I18nProvider>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </I18nProvider>
  );
}
