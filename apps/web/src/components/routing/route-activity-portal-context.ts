import { createContext, useContext } from "react";

export const RouteActivityPortalContext =
  createContext<HTMLElement | null>(null);

/**
 * A sibling portal target inside the same route Activity subtree. It is a
 * real DOM element (so it can host `position: fixed` children) but is
 * positioned at (0, 0) with zero size and `pointer-events: none`, so it
 * does not affect the route's layout or event handling. It exists
 * specifically so Dialog / AlertDialog can keep their overlay inside the
 * route activity cache (so it is hidden when the route is inactive) while
 * avoiding the `display: contents` ancestor that silently breaks
 * `position: fixed` inside wujie's degrade iframe.
 */
export const RouteActivityFixedPortalContext =
  createContext<HTMLElement | null>(null);

export function useRouteActivityPortalContainer() {
  return useContext(RouteActivityPortalContext) ?? undefined;
}

export function useRouteActivityFixedPortalContainer() {
  return useContext(RouteActivityFixedPortalContext) ?? undefined;
}
