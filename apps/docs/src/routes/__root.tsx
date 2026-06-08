import {
  createRootRoute,
  HeadContent,
  Outlet,
  Scripts,
} from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import "../styles.css";

export const Route = createRootRoute({
  component: RootComponent,
});

function RootComponent() {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <RootProvider
          search={{
            options: {
              api: "/api/search",
            },
          }}
        >
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
}
