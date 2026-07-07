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
  // it explicitly so each test starts from an empty state.
  clearTenantContext();
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