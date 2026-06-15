import { describe, expect, it } from "vitest";
import { mapHostSessionTokenToAuthToken } from "@/lib/auth/host-token-adapter";

describe("mapHostSessionTokenToAuthToken", () => {
  it("maps a PascalCase RhUserAuthorizationDto to a camelCase AuthToken", () => {
    const result = mapHostSessionTokenToAuthToken({
      Token: {
        TokenType: "Bearer",
        AccessToken: "access-1",
        ExpiresIn: 3600,
        RefreshToken: "refresh-1",
        acquireTime: new Date("2026-06-15T08:00:00Z"),
      },
    });

    expect(result).toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 3600,
    });
  });

  it("ignores the acquireTime field even after JSON round-tripping it to a string", () => {
    const result = mapHostSessionTokenToAuthToken({
      Token: {
        TokenType: "Bearer",
        AccessToken: "access-1",
        ExpiresIn: 3600,
        RefreshToken: "refresh-1",
        acquireTime: "2026-06-15T08:00:00.000Z",
      },
    });

    expect(result).toEqual({
      tokenType: "Bearer",
      accessToken: "access-1",
      refreshToken: "refresh-1",
      expiresIn: 3600,
    });
  });

  it("returns null when userSession is null", () => {
    expect(mapHostSessionTokenToAuthToken(null)).toBeNull();
  });

  it("returns null when userSession is undefined", () => {
    expect(mapHostSessionTokenToAuthToken(undefined)).toBeNull();
  });

  it("returns null when userSession is not an object", () => {
    expect(mapHostSessionTokenToAuthToken("not-an-object")).toBeNull();
    expect(mapHostSessionTokenToAuthToken(42)).toBeNull();
  });

  it("returns null when Token is missing", () => {
    expect(mapHostSessionTokenToAuthToken({})).toBeNull();
  });

  it("returns null when Token is null", () => {
    expect(mapHostSessionTokenToAuthToken({ Token: null })).toBeNull();
  });

  it("returns null when TokenType is missing", () => {
    expect(
      mapHostSessionTokenToAuthToken({
        Token: { AccessToken: "a", ExpiresIn: 1, RefreshToken: "r" },
      }),
    ).toBeNull();
  });

  it("returns null when AccessToken is empty", () => {
    expect(
      mapHostSessionTokenToAuthToken({
        Token: {
          TokenType: "Bearer",
          AccessToken: "",
          ExpiresIn: 1,
          RefreshToken: "r",
        },
      }),
    ).toBeNull();
  });

  it("returns null when ExpiresIn is NaN", () => {
    expect(
      mapHostSessionTokenToAuthToken({
        Token: {
          TokenType: "Bearer",
          AccessToken: "a",
          ExpiresIn: Number.NaN,
          RefreshToken: "r",
        },
      }),
    ).toBeNull();
  });

  it("coerces a numeric ExpiresIn string", () => {
    expect(
      mapHostSessionTokenToAuthToken({
        Token: {
          TokenType: "Bearer",
          AccessToken: "a",
          ExpiresIn: "3600",
          RefreshToken: "r",
        },
      }),
    ).toEqual({
      tokenType: "Bearer",
      accessToken: "a",
      refreshToken: "r",
      expiresIn: 3600,
    });
  });

  it("returns null when ExpiresIn is a non-numeric string", () => {
    expect(
      mapHostSessionTokenToAuthToken({
        Token: {
          TokenType: "Bearer",
          AccessToken: "a",
          ExpiresIn: "soon",
          RefreshToken: "r",
        },
      }),
    ).toBeNull();
  });

  it("returns null when RefreshToken is missing", () => {
    expect(
      mapHostSessionTokenToAuthToken({
        Token: { TokenType: "Bearer", AccessToken: "a", ExpiresIn: 1 },
      }),
    ).toBeNull();
  });
});
