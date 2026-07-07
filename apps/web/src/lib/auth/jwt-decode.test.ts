import { describe, expect, it } from "vitest";
import { decodeJwtPayload } from "@/lib/auth/jwt-decode";

/**
 * Builds a syntactically valid three-segment JWT around the given
 * payload object. The signature segment is a placeholder string —
 * `decodeJwtPayload` does not verify it.
 */
function makeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadSegment = btoa(JSON.stringify(payload));
  return `${header}.${payloadSegment}.signature`;
}

/**
 * Builds a JWT whose payload is base64URL-encoded (uses `-` and `_`,
 * drops `=` padding) to mirror real-world token serialisation. The
 * header segment is left as a literal placeholder because the decoder
 * does not inspect it.
 */
function makeBase64UrlJwt(payload: Record<string, unknown>): string {
  const json = JSON.stringify(payload);
  const base64 = btoa(json)
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return `header.${base64}.signature`;
}

describe("decodeJwtPayload", () => {
  it("decodes a valid three-segment jwt payload", () => {
    const token = makeJwt({ CompanyCode: "RUIHUI", FactoryCode: "DEFAULT" });

    expect(decodeJwtPayload(token)).toEqual({
      CompanyCode: "RUIHUI",
      FactoryCode: "DEFAULT",
    });
  });

  it("preserves the generic payload type for typed callers", () => {
    type MyClaims = { CompanyCode: string; FactoryCode: string };
    const token = makeJwt({ CompanyCode: "ACME", FactoryCode: "F1" });

    const decoded = decodeJwtPayload<MyClaims>(token);

    expect(decoded?.CompanyCode).toBe("ACME");
    expect(decoded?.FactoryCode).toBe("F1");
  });

  it("handles base64url-encoded payloads (no padding, url-safe chars)", () => {
    const token = makeBase64UrlJwt({
      CompanyCode: "RU+HUI/_id",
      FactoryCode: "DEFAULT",
    });

    expect(decodeJwtPayload(token)).toEqual({
      CompanyCode: "RU+HUI/_id",
      FactoryCode: "DEFAULT",
    });
  });

  it("returns null for non-three-segment strings", () => {
    expect(decodeJwtPayload("")).toBeNull();
    expect(decodeJwtPayload("only-one-segment")).toBeNull();
    expect(decodeJwtPayload("a.b")).toBeNull();
    expect(decodeJwtPayload("a.b.c.d")).toBeNull();
  });

  it("returns null for empty input", () => {
    expect(decodeJwtPayload("")).toBeNull();
  });

  it("returns null when the payload segment is empty", () => {
    expect(decodeJwtPayload("header..signature")).toBeNull();
  });

  it("returns null when the payload is not valid base64", () => {
    expect(decodeJwtPayload("header.!!!not-base64!!!.signature")).toBeNull();
  });

  it("returns null when the payload is not valid json", () => {
    const badJson = btoa("not-json-at-all");
    expect(decodeJwtPayload(`header.${badJson}.signature`)).toBeNull();
  });

  it("returns null when the payload is a json array", () => {
    const arrayPayload = btoa(JSON.stringify([1, 2, 3]));
    expect(decodeJwtPayload(`header.${arrayPayload}.signature`)).toBeNull();
  });

  it("returns null when the payload is a json primitive", () => {
    const primitive = btoa(JSON.stringify("plain-string"));
    expect(decodeJwtPayload(`header.${primitive}.signature`)).toBeNull();
    const numPrimitive = btoa(JSON.stringify(42));
    expect(decodeJwtPayload(`header.${numPrimitive}.signature`)).toBeNull();
  });

  it("returns null for non-string inputs", () => {
    // The signature is `(token: string) => T | null` so non-strings are
    // not part of the public contract, but the runtime guard handles
    // them defensively when called through unknown code paths.
    expect(decodeJwtPayload(undefined as unknown as string)).toBeNull();
    expect(decodeJwtPayload(null as unknown as string)).toBeNull();
  });
});