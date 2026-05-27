import { afterEach, describe, expect, it } from "vitest";
import {
  clearAccessTokenForTests,
  clearAuthToken,
  getAccessToken,
  getAuthToken,
  getRefreshToken,
  hasAuthToken,
  setAccessTokenForTests,
  setAuthToken,
} from "@/lib/auth/token-store";

afterEach(() => {
  localStorage.clear();
});

describe("token-store", () => {
  it("persists the complete auth token in localStorage", () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });

    expect(getAuthToken()).toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });
    expect(getAccessToken()).toBe("access-1");
    expect(getRefreshToken()).toBe("refresh-1");
    expect(hasAuthToken()).toBe(true);
  });

  it("clears every auth token field", () => {
    setAuthToken({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 604800,
    });

    clearAuthToken();

    expect(getAuthToken()).toBeNull();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(hasAuthToken()).toBe(false);
  });

  it("keeps the existing test helper behavior for bearer injection tests", () => {
    setAccessTokenForTests("access-only");

    expect(getAccessToken()).toBe("access-only");
    expect(hasAuthToken()).toBe(true);

    clearAccessTokenForTests();

    expect(getAccessToken()).toBeNull();
  });
});
