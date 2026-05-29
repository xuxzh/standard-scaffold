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
import { LoginPage } from "@/features/auth/login-page";
import { I18nProvider } from "@/i18n/i18n-provider";
import { getRedirectTarget, isSafeRedirectPath } from "@/lib/auth/auth-redirect";
import { hasAuthToken } from "@/lib/auth/token-store";
import { createAppQueryClient } from "@/lib/query-client";
import { DashboardPage } from "@/routes/dashboard";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { StandaloneExamplePage } from "@/routes/examples.standalone";
import { PackagingLevelPage } from "@/routes/packaging.packaging-level";
import { PackagingTypePage } from "@/routes/packaging.packaging-type";
import "@/i18n/config";

type AppProps = {
  initialEntries?: string[];
};

type AuthenticatedLocation = {
  href?: string;
  pathname: string;
  searchStr?: string;
};

function RootLayout() {
  return <Outlet />;
}

function requireAuth({ location }: { location: AuthenticatedLocation }) {
  if (!hasAuthToken()) {
    throw redirect({
      to: "/login",
      search: {
        redirect: getRedirectTarget(location),
      },
    });
  }
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
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <DashboardPage />
    </AdminLayout>
  )
});

const embeddedExampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples/embedded",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <EmbeddedExamplePage />
    </AdminLayout>
  )
});

const packagingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-type",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <PackagingTypePage />
    </AdminLayout>
  )
});

const packagingLevelRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-level",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <PackagingLevelPage />
    </AdminLayout>
  )
});

const standaloneExampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples/standalone",
  component: StandaloneExamplePage
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: isSafeRedirectPath(search.redirect) ? search.redirect : undefined,
  }),
  beforeLoad: ({ search }) => {
    if (hasAuthToken()) {
      throw redirect({
        to: search.redirect ?? "/dashboard",
      });
    }
  },
  component: LoginPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  embeddedExampleRoute,
  packagingLevelRoute,
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
