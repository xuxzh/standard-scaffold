/* global Response */
import { describe, expect, it } from "vitest";
import {
  buildPackagingSeedData,
  createMesClient,
  ensureRecords,
  login,
  readSeedConfig,
  seedMesPackagingData,
} from "./seed-mes-packaging-data.mjs";

describe("readSeedConfig", () => {
  it("reads required URLs and login credentials", () => {
    expect(
      readSeedConfig({
        MES_SEED_APP_API_BASE_URL: "http://127.0.0.1:8080",
        MES_SEED_API_BASE_URL: "http://127.0.0.1:8282",
        MES_SEED_USER_CODE: "DemoAdmin",
        MES_SEED_PASSWORD: "secret",
        MES_SEED_RECORD_COUNT: "20",
      }),
    ).toEqual({
      appApiBaseUrl: "http://127.0.0.1:8080",
      mesApiBaseUrl: "http://127.0.0.1:8282",
      userCode: "DemoAdmin",
      password: "secret",
      recordCount: 20,
    });
  });

  it("falls back to VITE_MOCK_RECORD_COUNT and clamps the count", () => {
    expect(
      readSeedConfig({
        MES_SEED_APP_API_BASE_URL: "http://app",
        MES_SEED_API_BASE_URL: "http://mes",
        MES_SEED_USER_CODE: "u",
        MES_SEED_PASSWORD: "p",
        VITE_MOCK_RECORD_COUNT: "1001.9",
      }).recordCount,
    ).toBe(1000);
  });

  it("falls back to 40 for invalid count values", () => {
    expect(
      readSeedConfig({
        MES_SEED_APP_API_BASE_URL: "http://app",
        MES_SEED_API_BASE_URL: "http://mes",
        MES_SEED_USER_CODE: "u",
        MES_SEED_PASSWORD: "p",
        MES_SEED_RECORD_COUNT: "abc",
      }).recordCount,
    ).toBe(40);
  });

  it("throws when required environment variables are missing", () => {
    expect(() => readSeedConfig({})).toThrow(
      "Missing required environment variables",
    );
  });
});

function dataResult(attach) {
  return {
    Success: true,
    Code: "",
    Message: "ok",
    Attach: attach,
    SkipCount: 0,
    TotalCount: Array.isArray(attach) ? attach.length : 1,
    Record: Array.isArray(attach) ? attach.length : 1,
  };
}

describe("MES seed HTTP client", () => {
  it("logs in with backend field names and returns the access token", async () => {
    const calls = [];
    const fetcher = async (url, init) => {
      calls.push({ url, init });

      return Response.json(
        dataResult({
          TokenType: "Bearer",
          AccessToken: "access-1",
          RefreshToken: "refresh-1",
          ExpiresIn: 604800,
        }),
      );
    };

    await expect(
      login({
        appApiBaseUrl: "http://app",
        userCode: "DemoAdmin",
        password: "secret",
        fetcher,
      }),
    ).resolves.toBe("access-1");

    expect(calls[0]).toMatchObject({
      url: "http://app/account/login",
      init: {
        method: "POST",
        body: JSON.stringify({
          UserCode: "DemoAdmin",
          Password: "secret",
        }),
      },
    });
  });

  it("sends bearer token to MES requests", async () => {
    const calls = [];
    const fetcher = async (url, init) => {
      calls.push({ url, init });
      return Response.json(dataResult([]));
    };

    const client = createMesClient({
      mesApiBaseUrl: "http://mes",
      accessToken: "access-1",
      fetcher,
    });

    await client.postDataResult("/PackagingTypeApi/GetPackagingTypeAutoQueryDatas", {
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1000,
    });

    expect(calls[0].init.headers.Authorization).toBe("Bearer access-1");
  });
});

describe("buildPackagingSeedData", () => {
  it("builds deterministic records with dependency references", () => {
    const data = buildPackagingSeedData({
      recordCount: 2,
      materials: [
        {
          MaterialCode: "MAT001",
          MaterialName: "Material 1",
          Unit: "pcs",
          MaterialTypeName: "FG",
        },
      ],
    });

    expect(data.packagingTypes).toHaveLength(2);
    expect(data.packagingLevels).toHaveLength(2);
    expect(data.packagingSpecs[0]).toMatchObject({
      SpecCode: "SEED_PKG_SPEC_001",
      PackagingTypeCode: "SEED_PKG_TYPE_001",
      PackagingLevelCode: "SEED_PKG_LEVEL_001",
    });
    expect(data.packagingRules[0].Details[0]).toMatchObject({
      PackagingLevelCode: "SEED_PKG_LEVEL_001",
      SpecCode: "SEED_PKG_SPEC_001",
    });
    expect(data.packagingKits[0]).toMatchObject({
      KitCode: "SEED_PKG_KIT_001",
      MainMaterialCode: "MAT001",
    });
    expect(data.materialPackagingRelations[0]).toMatchObject({
      MaterialCode: "MAT001",
      PackagingRuleCode: "SEED_PKG_RULE_001",
    });
  });

  it("throws when material-dependent seed data has no real materials", () => {
    expect(() =>
      buildPackagingSeedData({
        recordCount: 1,
        materials: [],
      }),
    ).toThrow("No materials returned from MES");
  });
});

describe("ensureRecords", () => {
  it("creates only missing records", async () => {
    const calls = [];
    const client = {
      async postDataResult(path, body) {
        calls.push({ path, body });

        if (path === "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas") {
          return dataResult(
            body.TypeCode === "$SEED_PKG_TYPE_001"
              ? [{ Id: 1, TypeCode: "SEED_PKG_TYPE_001" }]
              : [],
          );
        }

        return dataResult({ Id: 2, ...body });
      },
    };

    const result = await ensureRecords({
      client,
      label: "packaging type",
      queryPath: "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
      createPath: "/PackagingTypeApi/StorePackagingTypeData",
      codeField: "TypeCode",
      records: [
        { TypeCode: "SEED_PKG_TYPE_001", TypeName: "existing" },
        { TypeCode: "SEED_PKG_TYPE_002", TypeName: "missing" },
      ],
    });

    expect(result).toEqual({ existing: 1, created: 1 });
    expect(
      calls.filter(
        (call) => call.path === "/PackagingTypeApi/StorePackagingTypeData",
      ),
    ).toHaveLength(1);
  });
});

describe("seedMesPackagingData", () => {
  it("queries materials and writes packaging data in dependency order", async () => {
    const paths = [];
    const client = {
      async postDataResult(path, body) {
        paths.push(path);

        if (path === "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas") {
          return dataResult([
            {
              MaterialCode: "MAT001",
              MaterialName: "Material 1",
              Unit: "pcs",
              MaterialTypeName: "FG",
            },
          ]);
        }

        if (path.includes("Get")) {
          return dataResult([]);
        }

        return dataResult({ Id: 1, ...body });
      },
    };

    await seedMesPackagingData({ client, recordCount: 1 });

    expect(paths).toEqual([
      "/MaterialInfoApi/GetMaterialInfoAutoQueryDatas",
      "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
      "/PackagingTypeApi/StorePackagingTypeData",
      "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
      "/PackagingLevelApi/StorePackagingLevelData",
      "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas",
      "/PackagingSpecApi/StorePackagingSpecData",
      "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas",
      "/PackagingRuleApi/StorePackagingRuleData",
      "/PackagingKitApi/GetPackagingKitAutoQueryDatas",
      "/PackagingKitApi/StorePackagingKitData",
      "/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas",
      "/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData",
    ]);
  });
});
