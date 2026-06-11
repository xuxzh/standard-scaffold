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
import { VersionBadge } from "@/components/layout/version-badge";
import { Toaster } from "@/components/ui/sonner";
import { LoginPage } from "@/features/auth/login-page";
import { I18nProvider } from "@/i18n/i18n-provider";
import { EmbedErrorPage } from "@/features/auth/embed-error-page";
import { handleEmbedAuth, type EmbedErrorCode } from "@/lib/auth/auth-embed";
import { getRedirectTarget, isSafeRedirectPath } from "@/lib/auth/auth-redirect";
import { hasAuthToken } from "@/lib/auth/token-store";
import { createAppQueryClient } from "@/lib/query-client";
import { DashboardPage } from "@/routes/dashboard";
import { DebugIpRewriteProxyPage } from "@/routes/debug.ip-rewrite-proxy";
import { EmbeddedExamplePage } from "@/routes/examples.embedded";
import { MaterialPackagingRelationPage } from "@/routes/packaging.material-packaging-relation";
import { PackagingKitPage } from "@/routes/packaging.packaging-kit";
import { StandaloneExamplePage } from "@/routes/examples.standalone";
import { PackagingLevelPage } from "@/routes/packaging.packaging-level";
import { PackagingSpecPage } from "@/routes/packaging.packaging-spec";
import { PackagingRulePage } from "@/routes/packaging.packaging-rule";
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
  return (
    <>
      <Outlet />
      <VersionBadge />
    </>
  );
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
     </AdminLayout >
     )
});

const packagingKitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-kit",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <PackagingKitPage />
    </AdminLayout>
  )
});

const packagingSpecRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-spec",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <PackagingSpecPage />
    </AdminLayout>
  )
});

const packagingRuleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-rule",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <PackagingRulePage />
    </AdminLayout>
  )
});

const materialPackagingRelationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/material-packaging-relation",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <MaterialPackagingRelationPage />
    </AdminLayout>
  )
});

const debugIpRewriteProxyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/debug/ip-rewrite-proxy",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <DebugIpRewriteProxyPage />
    </AdminLayout>
  )
});

const standaloneExampleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/examples/standalone",
  component: StandaloneExamplePage
});

// `embedRoute` is the URL prefix and the chrome-less shell for every
// `/embed/*` URL. It carries no `beforeLoad` so the auth-error page
// below can mount without going through the embed auth flow.
const embedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "embed",
  component: () => <Outlet />,
});

// `embedLayoutRoute` is the intermediate layout that runs the embed
// auth handshake for every *real* embedded page. Keeping the auth check
// here (rather than on `embedRoute`) lets `embedAuthErrorRoute` mount
// without re-triggering the failed handshake that redirected to it.
const embedLayoutRoute = createRoute({
  getParentRoute: () => embedRoute,
  id: "_layout",
  beforeLoad: ({ location }) =>
    handleEmbedAuth({ from: location.pathname }),
  component: () => <Outlet />,
});

const embedAuthErrorRoute = createRoute({
  getParentRoute: () => embedRoute,
  path: "auth-error",
  validateSearch: (search: Record<string, unknown>) => {
    const code = search.embedError;
    const from = search.from;
    return {
      embedError:
        code === "NO_TOKEN" ||
        code === "PARSE_ERROR" ||
        code === "TIMEOUT" ||
        code === "PARENT_DISCONNECTED"
          ? (code as EmbedErrorCode)
          : "NO_TOKEN",
      from:
        typeof from === "string" && isSafeRedirectPath(from) ? from : undefined,
    };
  },
  component: EmbedErrorPage,
});

const embedPackagingTypeRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: "packaging/packaging-type",
  component: PackagingTypePage,
});

const embedPackagingLevelRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: "packaging/packaging-level",
  component: PackagingLevelPage,
});

const embedPackagingKitRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: "packaging/packaging-kit",
  component: PackagingKitPage,
});

const embedPackagingSpecRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: "packaging/packaging-spec",
  component: PackagingSpecPage,
});

const embedPackagingRuleRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: "packaging/packaging-rule",
  component: PackagingRulePage,
});

const embedMaterialPackagingRelationRoute = createRoute({
  getParentRoute: () => embedLayoutRoute,
  path: "packaging/material-packaging-relation",
  component: MaterialPackagingRelationPage,
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
  packagingKitRoute,
  packagingSpecRoute,
  packagingRuleRoute,
  materialPackagingRelationRoute,
  packagingRoute,
  debugIpRewriteProxyRoute,
  standaloneExampleRoute,
  embedRoute.addChildren([
    embedAuthErrorRoute,
    embedLayoutRoute.addChildren([
      embedPackagingTypeRoute,
      embedPackagingLevelRoute,
      embedPackagingKitRoute,
      embedPackagingSpecRoute,
      embedPackagingRuleRoute,
      embedMaterialPackagingRelationRoute,
    ]),
  ])
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
