1|import { useState } from "react";
     2|import { QueryClientProvider } from "@tanstack/react-query";
     3|import {
     4|  createBrowserHistory,
     5|  createMemoryHistory,
     6|  createRootRoute,
     7|  createRoute,
     8|  createRouter,
     9|  Outlet,
    10|  redirect,
    11|  RouterProvider
    12|} from "@tanstack/react-router";
    13|import { ThemeProvider } from "@/components/theme/theme-provider";
    14|import { AdminLayout } from "@/components/layout/admin-layout";
    15|import { Toaster } from "@/components/ui/sonner";
    16|import { LoginPage } from "@/features/auth/login-page";
    17|import { I18nProvider } from "@/i18n/i18n-provider";
    18|import { getRedirectTarget, isSafeRedirectPath } from "@/lib/auth/auth-redirect";
    19|import { hasAuthToken } from "@/lib/auth/token-store";
    20|import { createAppQueryClient } from "@/lib/query-client";
    21|import { DashboardPage } from "@/routes/dashboard";
    22|import { EmbeddedExamplePage } from "@/routes/examples.embedded";
    23|import { PackagingKitPage } from "@/routes/packaging.packaging-kit";
    24|import { StandaloneExamplePage } from "@/routes/examples.standalone";
    25|import { PackagingLevelPage } from "@/routes/packaging.packaging-level";
    26|import { PackagingSpecPage } from "@/routes/packaging.packaging-spec";
import { PackagingRulePage } from "@/routes/packaging.packaging-rule";
    27|import { PackagingTypePage } from "@/routes/packaging.packaging-type";
    28|import "@/i18n/config";
    29|
    30|type AppProps = {
    31|  initialEntries?: string[];
    32|};
    33|
    34|type AuthenticatedLocation = {
    35|  href?: string;
    36|  pathname: string;
    37|  searchStr?: string;
    38|};
    39|
    40|function RootLayout() {
    41|  return <Outlet />;
    42|}
    43|
    44|function requireAuth({ location }: { location: AuthenticatedLocation }) {
    45|  if (!hasAuthToken()) {
    46|    throw redirect({
    47|      to: "/login",
    48|      search: {
    49|        redirect: getRedirectTarget(location),
    50|      },
    51|    });
    52|  }
    53|}
    54|
    55|const rootRoute = createRootRoute({
    56|  component: RootLayout
    57|});
    58|
    59|const indexRoute = createRoute({
    60|  getParentRoute: () => rootRoute,
    61|  path: "/",
    62|  beforeLoad: () => {
    63|    throw redirect({ to: "/dashboard" });
    64|  }
    65|});
    66|
    67|const dashboardRoute = createRoute({
    68|  getParentRoute: () => rootRoute,
    69|  path: "/dashboard",
    70|  beforeLoad: requireAuth,
    71|  component: () => (
    72|    <AdminLayout>
    73|      <DashboardPage />
    74|    </AdminLayout>
    75|  )
    76|});
    77|
    78|const embeddedExampleRoute = createRoute({
    79|  getParentRoute: () => rootRoute,
    80|  path: "/examples/embedded",
    81|  beforeLoad: requireAuth,
    82|  component: () => (
    83|    <AdminLayout>
    84|      <EmbeddedExamplePage />
    85|    </AdminLayout>
    86|  )
    87|});
    88|
    89|const packagingRoute = createRoute({
    90|  getParentRoute: () => rootRoute,
    91|  path: "/packaging/packaging-type",
    92|  beforeLoad: requireAuth,
    93|  component: () => (
    94|    <AdminLayout>
    95|      <PackagingTypePage />
    96|    </AdminLayout>
    97|  )
    98|});
    99|
   100|const packagingLevelRoute = createRoute({
   101|  getParentRoute: () => rootRoute,
   102|  path: "/packaging/packaging-level",
   103|  beforeLoad: requireAuth,
   104|  component: () => (
   105|    <AdminLayout>
   106|      <PackagingLevelPage />
   107|    </AdminLayout>
   108|  )
   109|});
   110|
   111|   112|const packagingKitRoute = createRoute({
   113|  getParentRoute: () => rootRoute,
   114|  path: "/packaging/packaging-kit",
   115|  beforeLoad: requireAuth,
   116|  component: () => (
   117|    <AdminLayout>
   118|      <PackagingKitPage />
   119|   120|const packagingSpecRoute = createRoute({
   121|  getParentRoute: () => rootRoute,
   122|  path: "/packaging/packaging-spec",
   123|  beforeLoad: requireAuth,
   124|  component: () => (
   125|    <AdminLayout>
   126|      <PackagingSpecPage />
   127|   128|    </AdminLayout>
   129|  )
   130|});
   131|
   132|const packagingRuleRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/packaging/packaging-rule",
  beforeLoad: requireAuth,
  component: () => (
    <AdminLayout>
      <PackagingRulePage />
    </AdminLayout>
  )
});

const standaloneExampleRoute = createRoute({
   133|  getParentRoute: () => rootRoute,
   134|  path: "/examples/standalone",
   135|  component: StandaloneExamplePage
   136|});
   137|
   138|const loginRoute = createRoute({
   139|  getParentRoute: () => rootRoute,
   140|  path: "/login",
   141|  validateSearch: (search: Record<string, unknown>) => ({
   142|    redirect: isSafeRedirectPath(search.redirect) ? search.redirect : undefined,
   143|  }),
   144|  beforeLoad: ({ search }) => {
   145|    if (hasAuthToken()) {
   146|      throw redirect({
   147|        to: search.redirect ?? "/dashboard",
   148|      });
   149|    }
   150|  },
   151|  component: LoginPage,
   152|});
   153|
   154|const routeTree = rootRoute.addChildren([
   155|  indexRoute,
   156|  loginRoute,
   157|  dashboardRoute,
   158|  embeddedExampleRoute,
   159|  packagingLevelRoute,
   160|   161|  packagingKitRoute,
   162|   163|  packagingSpecRoute,
  packagingRuleRoute,
   164|   165|  packagingRoute,
   166|  standaloneExampleRoute
   167|]);
   168|
   169|function createAppRouter(initialEntries?: string[]) {
   170|  return createRouter({
   171|    routeTree,
   172|    history: initialEntries
   173|      ? createMemoryHistory({
   174|          initialEntries
   175|        })
   176|      : createBrowserHistory(),
   177|    defaultPreload: "intent",
   178|    scrollRestoration: true
   179|  });
   180|}
   181|
   182|declare module "@tanstack/react-router" {
   183|  interface Register {
   184|    router: ReturnType<typeof createAppRouter>;
   185|  }
   186|}
   187|
   188|export function App({ initialEntries }: AppProps) {
   189|  const router = createAppRouter(initialEntries);
   190|  const [queryClient] = useState(() => createAppQueryClient());
   191|
   192|  return (
   193|    <I18nProvider>
   194|      <ThemeProvider>
   195|        <QueryClientProvider client={queryClient}>
   196|          <RouterProvider router={router} />
   197|          <Toaster />
   198|        </QueryClientProvider>
   199|      </ThemeProvider>
   200|    </I18nProvider>
   201|  );
   202|}
   203|