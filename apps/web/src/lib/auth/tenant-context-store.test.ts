import { beforeEach, describe, expect, it } from "vitest";
import {
  clearTenantContext,
  getActiveTenantContext,
  getCompanyCode,
  getFactoryCode,
  setTenantContextFromToken,
} from "@/lib/auth/tenant-context-store";

function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = btoa(JSON.stringify(payload));
  return `${header}.${payloadSegment}.signature`;
}

beforeEach(() => {
  // The module-level cache persists across tests within a file. Reset
  // it explicitly so each test starts from an empty state. Also clear
  // localStorage so the lazy-hydration path does not pick up a stale
  // token written by a previous test.
  clearTenantContext();
  localStorage.clear();
});

describe("tenant-context-store", () => {
  it("starts empty when no token has been processed", () => {
    expect(getCompanyCode()).toBeNull();
    expect(getFactoryCode()).toBeNull();
    expect(getActiveTenantContext()).toBeNull();
  });

  it("populates the cache from a valid jwt payload", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    expect(getCompanyCode()).toBe("RUIHUI");
    expect(getFactoryCode()).toBe("DEFAULT");
    expect(getActiveTenantContext()).toEqual({
      companyCode: "RUIHUI",
      factoryCode: "DEFAULT",
    });
  });

  it("returns a defensive copy from getActiveTenantContext", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    const first = getActiveTenantContext();
    if (first) {
      first.companyCode = "TAMPERED";
    }

    expect(getCompanyCode()).toBe("RUIHUI");
  });

  it("clears the cache when the token lacks the CompanyCode claim", () => {
    setTenantContextFromToken(
      makeJwt({ FactoryCode: "DEFAULT", extra: "field" }),
    );

    expect(getCompanyCode()).toBeNull();
    expect(getFactoryCode()).toBeNull();
    expect(getActiveTenantContext()).toBeNull();
  });

  it("clears the cache when the token lacks the FactoryCode claim", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", extra: "field" }),
    );

    expect(getCompanyCode()).toBeNull();
    expect(getFactoryCode()).toBeNull();
  });

  it("clears the cache when claim values are empty strings", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "", FactoryCode: "DEFAULT" }),
    );
    expect(getActiveTenantContext()).toBeNull();

    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "" }),
    );
    expect(getActiveTenantContext()).toBeNull();
  });

  it("clears the cache when the token is not a three-segment jwt", () => {
    setTenantContextFromToken("not-a-jwt");

    expect(getCompanyCode()).toBeNull();
    expect(getFactoryCode()).toBeNull();
  });

  it("clears the cache when the token is null or undefined", () => {
    // Prime the cache, then exercise the null/undefined paths.
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    setTenantContextFromToken(null);
    expect(getActiveTenantContext()).toBeNull();

    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );
    setTenantContextFromToken(undefined);
    expect(getActiveTenantContext()).toBeNull();
  });

  it("replaces the cache when a new valid token arrives", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "F1" }),
    );
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "ACME", FactoryCode: "F2" }),
    );

    expect(getCompanyCode()).toBe("ACME");
    expect(getFactoryCode()).toBe("F2");
  });

  it("clears the cache when the new token is invalid even if the old one was valid", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );
    setTenantContextFromToken("not-a-jwt-anymore");

    expect(getActiveTenantContext()).toBeNull();
  });

  it("clearTenantContext empties the cache", () => {
    setTenantContextFromToken(
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    clearTenantContext();

    expect(getCompanyCode()).toBeNull();
    expect(getFactoryCode()).toBeNull();
    expect(getActiveTenantContext()).toBeNull();
  });
});

describe("tenant-context-store lazy hydration", () => {
  // These tests intentionally avoid the `beforeEach` clearTenantContext
  // hook above so they can observe the "fresh module load, token in
  // localStorage" scenario directly. Each test starts from a clean
  // localStorage and an empty cache by clearing both explicitly.

  it("populates the cache from localStorage on first read after a fresh page load", () => {
    clearTenantContext();
    localStorage.clear();
    localStorage.setItem(
      "accessToken",
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    // No prior setTenantContextFromToken call — this is the
    // post-refresh scenario where only localStorage knows about the
    // access token.
    expect(getActiveTenantContext()).toEqual({
      companyCode: "RUIHUI",
      factoryCode: "DEFAULT",
    });
    expect(getCompanyCode()).toBe("RUIHUI");
    expect(getFactoryCode()).toBe("DEFAULT");
  });

  it("hydration is a no-op when localStorage has no access token", () => {
    clearTenantContext();
    localStorage.clear();

    expect(getActiveTenantContext()).toBeNull();
  });

  it("hydration is a no-op when localStorage carries an opaque (non-jwt) token", () => {
    clearTenantContext();
    localStorage.clear();
    localStorage.setItem("accessToken", "opaque-token-without-claims");

    expect(getActiveTenantContext()).toBeNull();
  });

  it("hydration runs only once per module load", () => {
    clearTenantContext();
    localStorage.clear();
    localStorage.setItem(
      "accessToken",
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    // First read hydrates; second read should reuse the cached value
    // even if the localStorage entry has changed underneath us (the
    // token store is the only legitimate writer).
    expect(getCompanyCode()).toBe("RUIHUI");

    localStorage.setItem("accessToken", "different-token-now");

    expect(getCompanyCode()).toBe("RUIHUI");
  });

  it("clearTenantContext re-arms hydration so the next read re-probes localStorage", () => {
    clearTenantContext();
    localStorage.clear();
    localStorage.setItem(
      "accessToken",
      makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" }),
    );

    expect(getActiveTenantContext()).toEqual({
      companyCode: "RUIHUI",
      factoryCode: "DEFAULT",
    });

    clearTenantContext();

    // localStorage now has a different token; the next read should
    // pick it up because clearTenantContext resets the hydration flag.
    localStorage.setItem(
      "accessToken",
      makeJwt({ CompanyCode: "ACME", FactoryCode: "F2" }),
    );
    expect(getCompanyCode()).toBe("ACME");
    expect(getFactoryCode()).toBe("F2");
  });
});