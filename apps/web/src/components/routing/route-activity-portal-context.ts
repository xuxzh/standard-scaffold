import { createContext, useContext } from "react";

export const RouteActivityPortalContext =
  createContext<HTMLElement | null>(null);

export function useRouteActivityPortalContainer() {
  return useContext(RouteActivityPortalContext) ?? undefined;
}
