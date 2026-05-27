type RouteLocation = {
  href?: string;
  pathname: string;
  searchStr?: string;
};

export function isSafeRedirectPath(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

export function getCurrentRedirectPath() {
  if (typeof window === "undefined") {
    return "/";
  }

  return `${window.location.pathname}${window.location.search}` || "/";
}

export function getRedirectTarget(location: RouteLocation) {
  if (isSafeRedirectPath(location.href)) {
    return location.href;
  }

  const search = typeof location.searchStr === "string" ? location.searchStr : "";

  return `${location.pathname}${search}` || "/";
}

export function getLoginPath(redirect?: string) {
  if (!isSafeRedirectPath(redirect)) {
    return "/login";
  }

  return `/login?redirect=${encodeURIComponent(redirect)}`;
}

export function redirectToLogin(redirect = getCurrentRedirectPath()) {
  if (typeof window === "undefined") {
    return;
  }

  const nextPath = getLoginPath(redirect);
  const currentPath = `${window.location.pathname}${window.location.search}`;

  if (currentPath === nextPath) {
    return;
  }

  window.history.replaceState({}, "", nextPath);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
