import { refreshAuthToken } from "@/features/auth/auth-service";
import { redirectToLogin } from "@/lib/auth/auth-redirect";
import {
  clearAuthToken,
  getRefreshToken,
  setAuthToken,
} from "@/lib/auth/token-store";

let refreshPromise: Promise<boolean> | null = null;

async function refreshStoredToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    clearAuthToken();
    redirectToLogin();
    return false;
  }

  try {
    const nextToken = await refreshAuthToken(refreshToken);
    setAuthToken(nextToken);
    return true;
  } catch {
    clearAuthToken();
    redirectToLogin();
    return false;
  }
}

export async function handleUnauthorizedSession() {
  refreshPromise ??= refreshStoredToken().finally(() => {
    refreshPromise = null;
  });

  return await refreshPromise;
}
