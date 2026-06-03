# MES Packaging Seed Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增一个可重复运行的仓库脚本，将 MES 包装六页真实后端数据补齐到 mock 配置对应条数。

**Architecture:** 脚本通过 app 登录接口获取 access token，再通过 MES HTTP API 查询和补写包装主数据。脚本只补缺，不覆盖、不删除真实数据；数据依赖按包装类型、包装层级、包装规格、包装规则、包装套件、物料包装关系顺序建立。

**Tech Stack:** Node.js ESM、pnpm workspace、MES DataResult API、Vitest、现有 React/Vite 环境变量约定。

---

## 范围与准入

- 变更级别：`L2`。
- 本计划只实现真实 MES 后端种子数据写入脚本，不改页面、不改 MSW mock store、不写数据库直连脚本。
- 覆盖六个包装页面：
  - 包装类型：`/PackagingTypeApi/*`
  - 包装层级：`/PackagingLevelApi/*`
  - 包装规格：`/PackagingSpecApi/*`
  - 包装规则：`/PackagingRuleApi/*`
  - 包装套件：`/PackagingKitApi/*`
  - 物料包装关系：`/MaterialPackagingRelationApi/*`
- 脚本运行数量读取顺序：
  1. `MES_SEED_RECORD_COUNT`
  2. `VITE_MOCK_RECORD_COUNT`
  3. 默认 `40`
- 数量解析规则与现有 mock 一致：非法值或小于 1 回退到 `40`，小数向下取整，最大 `1000`。
- 脚本不在请求体中传 `CompanyCode`、`FactoryCode`；公司与工厂上下文由后端从 token 解析。
- 当前仓库只有物料查询接口，没有物料新增接口。包装套件和物料包装关系必须复用 `/Material/GetMaterialAutoQueryDatas` 返回的真实物料；如果没有可用物料，脚本应失败并说明原因。

## 文件边界

- Create: `apps/web/scripts/seed-mes-packaging-data.mjs`
- Create: `apps/web/scripts/seed-mes-packaging-data.test.mjs`
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.example`
- Optional Create: `docs/test-reports/2026-06-03/mes-packaging-seed-data-report.md`

## 环境变量

脚本读取以下变量：

```env
MES_SEED_APP_API_BASE_URL=http://127.0.0.1:8080
MES_SEED_API_BASE_URL=http://127.0.0.1:8282
MES_SEED_USER_CODE=DemoAdmin
MES_SEED_PASSWORD=Icpt1357!!
MES_SEED_RECORD_COUNT=40
```

含义：

- `MES_SEED_APP_API_BASE_URL`：登录接口 base URL，脚本调用 `POST /account/login`。
- `MES_SEED_API_BASE_URL`：MES base URL，脚本调用包装与物料 API。
- `MES_SEED_USER_CODE` / `MES_SEED_PASSWORD`：用于登录真实后端的账号密码。
- `MES_SEED_RECORD_COUNT`：目标 seed 条数；未设置时复用 `VITE_MOCK_RECORD_COUNT`。

## 数据编码

每类数据使用稳定编码前缀。脚本通过精确查询判断是否已存在，只创建缺少项。

| 页面 | 编码字段 | 编码格式 |
| --- | --- | --- |
| 包装类型 | `TypeCode` | `SEED_PKG_TYPE_001` |
| 包装层级 | `LevelCode` | `SEED_PKG_LEVEL_001` |
| 包装规格 | `SpecCode` | `SEED_PKG_SPEC_001` |
| 包装规则 | `RuleCode` | `SEED_PKG_RULE_001` |
| 包装套件 | `KitCode` | `SEED_PKG_KIT_001` |
| 物料包装关系 | `MaterialCode + PackagingRuleCode` | 复用真实物料编码 + `SEED_PKG_RULE_001` |

## Task 1: 新增脚本入口与配置解析

**Files:**
- Create: `apps/web/scripts/seed-mes-packaging-data.mjs`
- Create: `apps/web/scripts/seed-mes-packaging-data.test.mjs`

- [ ] **Step 1: 写配置解析测试**

在 `apps/web/scripts/seed-mes-packaging-data.test.mjs` 中先写 Vitest 测试：

```js
import { describe, expect, it } from "vitest";
import { readSeedConfig } from "./seed-mes-packaging-data.mjs";

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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: FAIL，原因是 `apps/web/scripts/seed-mes-packaging-data.mjs` 尚不存在或未导出 `readSeedConfig`。

- [ ] **Step 3: 实现最小配置解析**

在 `apps/web/scripts/seed-mes-packaging-data.mjs` 中实现：

```js
import { env, exit } from "node:process";
import { pathToFileURL } from "node:url";

const defaultRecordCount = 40;
const maxRecordCount = 1000;

function parseRecordCount(rawValue) {
  const parsedValue =
    typeof rawValue === "string" ? Number.parseFloat(rawValue) : Number.NaN;

  if (!Number.isFinite(parsedValue) || parsedValue < 1) {
    return defaultRecordCount;
  }

  return Math.min(Math.floor(parsedValue), maxRecordCount);
}

export function readSeedConfig(source = env) {
  const missingKeys = [
    "MES_SEED_APP_API_BASE_URL",
    "MES_SEED_API_BASE_URL",
    "MES_SEED_USER_CODE",
    "MES_SEED_PASSWORD",
  ].filter((key) => !source[key]);

  if (missingKeys.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingKeys.join(", ")}`,
    );
  }

  return {
    appApiBaseUrl: source.MES_SEED_APP_API_BASE_URL,
    mesApiBaseUrl: source.MES_SEED_API_BASE_URL,
    userCode: source.MES_SEED_USER_CODE,
    password: source.MES_SEED_PASSWORD,
    recordCount: parseRecordCount(
      source.MES_SEED_RECORD_COUNT ?? source.VITE_MOCK_RECORD_COUNT,
    ),
  };
}

export async function main() {
  const config = readSeedConfig();
  console.info(
    `Preparing MES packaging seed data, target count: ${config.recordCount}`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
  });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: PASS。

## Task 2: 登录与 HTTP DataResult 客户端

**Files:**
- Modify: `apps/web/scripts/seed-mes-packaging-data.mjs`
- Modify: `apps/web/scripts/seed-mes-packaging-data.test.mjs`

- [ ] **Step 1: 写登录和 bearer token 测试**

追加测试：

```js
import { login, createMesClient } from "./seed-mes-packaging-data.mjs";

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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: FAIL，原因是 `login` 和 `createMesClient` 未实现。

- [ ] **Step 3: 实现 HTTP helper**

在脚本中增加：

```js
function joinUrl(baseUrl, path) {
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

async function parseJsonResponse(response) {
  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      typeof data?.Message === "string"
        ? data.Message
        : `HTTP request failed with status ${response.status}`,
    );
  }

  if (!data || typeof data.Success !== "boolean" || !("Attach" in data)) {
    throw new Error("Unexpected DataResult response format");
  }

  if (!data.Success && data.Code !== "100001") {
    throw new Error(data.Message || "MES business request failed");
  }

  return data;
}

export async function login({ appApiBaseUrl, userCode, password, fetcher = fetch }) {
  const response = await fetcher(joinUrl(appApiBaseUrl, "/account/login"), {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      UserCode: userCode,
      Password: password,
    }),
  });

  const result = await parseJsonResponse(response);
  const accessToken = result.Attach?.AccessToken;

  if (!accessToken) {
    throw new Error("Login response does not include Attach.AccessToken");
  }

  return accessToken;
}

export function createMesClient({ mesApiBaseUrl, accessToken, fetcher = fetch }) {
  return {
    async postDataResult(path, body) {
      const response = await fetcher(joinUrl(mesApiBaseUrl, path), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });

      return await parseJsonResponse(response);
    },
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: PASS。

## Task 3: 构建包装 seed 数据

**Files:**
- Modify: `apps/web/scripts/seed-mes-packaging-data.mjs`
- Modify: `apps/web/scripts/seed-mes-packaging-data.test.mjs`

- [ ] **Step 1: 写数据生成测试**

追加测试：

```js
import { buildPackagingSeedData } from "./seed-mes-packaging-data.mjs";

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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: FAIL，原因是 `buildPackagingSeedData` 未实现。

- [ ] **Step 3: 实现确定性 seed 数据生成**

在脚本中增加 `padNumber`、`pickByIndex` 和 `buildPackagingSeedData`。关键字段必须与现有页面 service payload 一致：

```js
function padNumber(value, length = 3) {
  return String(value).padStart(length, "0");
}

function pickByIndex(records, index) {
  return records[(index - 1) % records.length];
}

export function buildPackagingSeedData({ recordCount, materials }) {
  if (materials.length === 0) {
    throw new Error("No materials returned from MES; cannot create kit or relation seed data");
  }

  const packagingTypes = [];
  const packagingLevels = [];
  const packagingSpecs = [];
  const packagingRules = [];
  const packagingKits = [];
  const materialPackagingRelations = [];

  for (let index = 1; index <= recordCount; index += 1) {
    const suffix = padNumber(index);
    const material = pickByIndex(materials, index);
    const typeCode = `SEED_PKG_TYPE_${suffix}`;
    const levelCode = `SEED_PKG_LEVEL_${suffix}`;
    const specCode = `SEED_PKG_SPEC_${suffix}`;
    const ruleCode = `SEED_PKG_RULE_${suffix}`;

    packagingTypes.push({
      TypeCode: typeCode,
      TypeName: `Seed Packaging Type ${suffix}`,
      IsRecyclable: index % 3 !== 0,
      Description: `Seed packaging type ${suffix}`,
      Remark: "seed data",
    });

    packagingLevels.push({
      LevelCode: levelCode,
      LevelName: `Seed Level ${suffix}`,
      ParentLevelCode: index === 1 ? null : `SEED_PKG_LEVEL_${padNumber(index - 1)}`,
      ParentLevelName: index === 1 ? null : `Seed Level ${padNumber(index - 1)}`,
      Description: `Seed packaging level ${suffix}`,
      Remark: "seed data",
    });

    packagingSpecs.push({
      SpecCode: specCode,
      SpecName: `Seed Spec ${suffix}`,
      PackagingTypeCode: typeCode,
      PackagingTypeName: `Seed Packaging Type ${suffix}`,
      PackagingLevelCode: levelCode,
      PackagingLevelName: `Seed Level ${suffix}`,
      BarcodeRuleCode: `SEED_BAR_${suffix}`,
      BarcodeRuleName: `Seed Barcode ${suffix}`,
      Length: 30 + index,
      Width: 20 + (index % 10),
      Height: 10 + (index % 8),
      Volume: Number((((30 + index) * (20 + (index % 10)) * (10 + (index % 8))) / 1000000).toFixed(6)),
      MaxWeight: 10 + index,
      GrossWeight: 8 + index,
      TareWeight: 2,
      StandardCapacity: 10 + (index % 20),
      StackLimit: 2 + (index % 8),
      Unit: material.Unit || "pcs",
      IsEnabled: true,
      Remark: "seed data",
    });

    packagingRules.push({
      RuleCode: ruleCode,
      RuleName: `Seed Packaging Rule ${suffix}`,
      IsEnabled: true,
      IsDefault: index === 1,
      Details: [
        {
          PackagingLevelCode: levelCode,
          PackagingLevelName: `Seed Level ${suffix}`,
          LevelSequence: index,
          SpecCode: specCode,
          SpecName: `Seed Spec ${suffix}`,
          StandardQuantity: 5 + index,
          MaxQuantity: 8 + index,
          PackagingMethod: index % 2 === 0 ? "auto" : "manual",
          Unit: material.Unit || "pcs",
          PackagingTypeName: `Seed Packaging Type ${suffix}`,
        },
      ],
      Remark: "seed data",
    });

    packagingKits.push({
      KitCode: `SEED_PKG_KIT_${suffix}`,
      KitName: `Seed Packaging Kit ${suffix}`,
      MainMaterialCode: material.MaterialCode,
      MainMaterialName: material.MaterialName,
      Unit: material.Unit || "pcs",
      IsVirtualMain: false,
      Children: [
        {
          Code: material.MaterialCode,
          Name: material.MaterialName,
          Quantity: 1,
          Unit: material.Unit || "pcs",
        },
      ],
      Remark: "seed data",
    });

    materialPackagingRelations.push({
      MaterialCode: material.MaterialCode,
      MaterialName: material.MaterialName,
      PackagingRuleCode: ruleCode,
      PackagingRuleName: `Seed Packaging Rule ${suffix}`,
      Details: [
        {
          LevelSequence: index,
          PackagingLevelCode: levelCode,
          PackagingLevelName: `Seed Level ${suffix}`,
          SpecCode: specCode,
          SpecName: `Seed Spec ${suffix}`,
          Quantity: 5 + index,
          Unit: material.Unit || "pcs",
          PackagingTypeName: `Seed Packaging Type ${suffix}`,
          BoxLabelPrintTemplate: "",
          PackingListPrintTemplate: "",
        },
      ],
      Remark: "seed data",
    });
  }

  return {
    packagingTypes,
    packagingLevels,
    packagingSpecs,
    packagingRules,
    packagingKits,
    materialPackagingRelations,
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: PASS。

## Task 4: 实现查询已有记录与只补缺写入

**Files:**
- Modify: `apps/web/scripts/seed-mes-packaging-data.mjs`
- Modify: `apps/web/scripts/seed-mes-packaging-data.test.mjs`

- [ ] **Step 1: 写幂等补缺测试**

追加测试：

```js
import { ensureRecords } from "./seed-mes-packaging-data.mjs";

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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: FAIL，原因是 `ensureRecords` 未实现。

- [ ] **Step 3: 实现 `ensureRecords`**

在脚本中增加：

```js
export async function ensureRecords({
  client,
  label,
  queryPath,
  createPath,
  codeField,
  records,
}) {
  let existing = 0;
  let created = 0;

  for (const record of records) {
    const code = record[codeField];
    const queryResult = await client.postDataResult(queryPath, {
      [codeField]: `$${code}`,
      IsPaged: true,
      PageIndex: 1,
      PageSize: 1,
    });
    const attach = Array.isArray(queryResult.Attach) ? queryResult.Attach : [];

    if (attach.length > 0) {
      existing += 1;
      continue;
    }

    await client.postDataResult(createPath, record);
    created += 1;
  }

  console.info(`${label}: ${created} created, ${existing} existing`);

  return { existing, created };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: PASS。

## Task 5: 编排六页写入流程

**Files:**
- Modify: `apps/web/scripts/seed-mes-packaging-data.mjs`
- Modify: `apps/web/scripts/seed-mes-packaging-data.test.mjs`

- [ ] **Step 1: 写流程顺序测试**

追加测试：

```js
import { seedMesPackagingData } from "./seed-mes-packaging-data.mjs";

describe("seedMesPackagingData", () => {
  it("queries materials and writes packaging data in dependency order", async () => {
    const paths = [];
    const client = {
      async postDataResult(path, body) {
        paths.push(path);

        if (path === "/Material/GetMaterialAutoQueryDatas") {
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
      "/Material/GetMaterialAutoQueryDatas",
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
```

- [ ] **Step 2: 运行测试确认失败**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: FAIL，原因是 `seedMesPackagingData` 未实现。

- [ ] **Step 3: 实现六页编排**

在脚本中增加：

```js
async function queryMaterials(client, recordCount) {
  const result = await client.postDataResult("/Material/GetMaterialAutoQueryDatas", {
    IsPaged: true,
    PageIndex: 1,
    PageSize: recordCount,
  });

  return Array.isArray(result.Attach) ? result.Attach : [];
}

export async function seedMesPackagingData({ client, recordCount }) {
  const materials = await queryMaterials(client, recordCount);
  const data = buildPackagingSeedData({ recordCount, materials });

  return {
    packagingTypes: await ensureRecords({
      client,
      label: "packaging types",
      queryPath: "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
      createPath: "/PackagingTypeApi/StorePackagingTypeData",
      codeField: "TypeCode",
      records: data.packagingTypes,
    }),
    packagingLevels: await ensureRecords({
      client,
      label: "packaging levels",
      queryPath: "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
      createPath: "/PackagingLevelApi/StorePackagingLevelData",
      codeField: "LevelCode",
      records: data.packagingLevels,
    }),
    packagingSpecs: await ensureRecords({
      client,
      label: "packaging specs",
      queryPath: "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas",
      createPath: "/PackagingSpecApi/StorePackagingSpecData",
      codeField: "SpecCode",
      records: data.packagingSpecs,
    }),
    packagingRules: await ensureRecords({
      client,
      label: "packaging rules",
      queryPath: "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas",
      createPath: "/PackagingRuleApi/StorePackagingRuleData",
      codeField: "RuleCode",
      records: data.packagingRules,
    }),
    packagingKits: await ensureRecords({
      client,
      label: "packaging kits",
      queryPath: "/PackagingKitApi/GetPackagingKitAutoQueryDatas",
      createPath: "/PackagingKitApi/StorePackagingKitData",
      codeField: "KitCode",
      records: data.packagingKits,
    }),
    materialPackagingRelations: await ensureRecords({
      client,
      label: "material packaging relations",
      queryPath:
        "/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas",
      createPath: "/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData",
      codeField: "PackagingRuleCode",
      records: data.materialPackagingRelations,
    }),
  };
}
```

- [ ] **Step 4: 连接 `main`**

将 `main` 改为：

```js
export async function main() {
  const config = readSeedConfig();
  const accessToken = await login({
    appApiBaseUrl: config.appApiBaseUrl,
    userCode: config.userCode,
    password: config.password,
  });
  const client = createMesClient({
    mesApiBaseUrl: config.mesApiBaseUrl,
    accessToken,
  });
  const summary = await seedMesPackagingData({
    client,
    recordCount: config.recordCount,
  });

  console.info("MES packaging seed data completed");
  console.info(JSON.stringify(summary, null, 2));
}
```

- [ ] **Step 5: 运行测试确认通过**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: PASS。

## Task 6: 注册命令和环境说明

**Files:**
- Modify: `apps/web/package.json`
- Modify: `apps/web/.env.example`

- [ ] **Step 1: 添加 package script**

在 `apps/web/package.json` 的 `scripts` 中新增：

```json
"seed:mes-packaging": "node scripts/seed-mes-packaging-data.mjs"
```

保持现有脚本不变，新增脚本位置建议放在 `typecheck` 后面。

- [ ] **Step 2: 更新 `.env.example`**

在 `apps/web/.env.example` 中追加：

```env
# MES 包装真实后端种子数据写入脚本配置。只在手动运行 seed 脚本时使用。
MES_SEED_APP_API_BASE_URL=http://127.0.0.1:8080
MES_SEED_API_BASE_URL=http://127.0.0.1:8282
MES_SEED_USER_CODE=DemoAdmin
MES_SEED_PASSWORD=Icpt1357!!
MES_SEED_RECORD_COUNT=40
```

- [ ] **Step 3: 运行脚本测试**

Run:

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
```

Expected: PASS。

- [ ] **Step 4: 运行类型检查**

Run:

```bash
pnpm --filter @repo/web typecheck
```

Expected: PASS。

- [ ] **Step 5: 运行 lint**

Run:

```bash
pnpm --filter @repo/web lint
```

Expected: PASS。

## Task 7: 真实环境执行与报告

**Files:**
- Optional Create: `docs/test-reports/2026-06-03/mes-packaging-seed-data-report.md`

- [ ] **Step 1: 配置本地环境变量**

在执行 shell 中设置真实环境变量，不提交 `.env.local`：

```bash
export MES_SEED_APP_API_BASE_URL="http://<app-api-host>"
export MES_SEED_API_BASE_URL="http://<mes-api-host>"
export MES_SEED_USER_CODE="<user-code>"
export MES_SEED_PASSWORD="<password>"
export MES_SEED_RECORD_COUNT="20"
```

如果希望与 mock 默认保持一致且未设置 `VITE_MOCK_RECORD_COUNT`，将 `MES_SEED_RECORD_COUNT` 设为 `40` 或不设置。

- [ ] **Step 2: 执行真实写入**

Run:

```bash
pnpm --filter @repo/web seed:mes-packaging
```

Expected:

- 登录成功。
- 脚本输出六类数据的 `created` 和 `existing` 数量。
- 重复运行时 `created` 变为 `0`，`existing` 等于目标数量。

- [ ] **Step 3: 页面验收**

启动真实后端模式：

```bash
VITE_ENABLE_API_MOCKING=false pnpm --filter @repo/web dev
```

在浏览器中依次访问六页并验收：

- 包装类型列表存在 `SEED_PKG_TYPE_001`。
- 包装层级列表存在 `SEED_PKG_LEVEL_001`。
- 包装规格列表存在 `SEED_PKG_SPEC_001`，且类型和层级字段可展示。
- 包装规则列表存在 `SEED_PKG_RULE_001`，且明细可展示。
- 包装套件列表存在 `SEED_PKG_KIT_001`，且主物料来自真实物料。
- 物料包装关系列表存在引用 `SEED_PKG_RULE_001` 的关系数据。

- [ ] **Step 4: 写执行报告**

如执行真实写入，创建 `docs/test-reports/2026-06-03/mes-packaging-seed-data-report.md`，记录：

```markdown
# MES 包装种子数据写入报告

日期：2026-06-03

## 环境

- App API：<脱敏后的 host>
- MES API：<脱敏后的 host>
- 目标数量：<record count>

## 执行结果

| 数据域 | Created | Existing |
| --- | ---: | ---: |
| 包装类型 | 0 | 0 |
| 包装层级 | 0 | 0 |
| 包装规格 | 0 | 0 |
| 包装规则 | 0 | 0 |
| 包装套件 | 0 | 0 |
| 物料包装关系 | 0 | 0 |

## 页面验收

- 包装类型：
- 包装层级：
- 包装规格：
- 包装规则：
- 包装套件：
- 物料包装关系：

## 问题

- 无。
```

实际填写时将 `0` 替换为脚本输出的真实数量；如存在问题，在“问题”下记录具体接口、错误消息和影响页面。

## 最终验证

实现完成后至少运行：

```bash
pnpm --filter @repo/web exec vitest run scripts/seed-mes-packaging-data.test.mjs
pnpm --filter @repo/web typecheck
pnpm --filter @repo/web lint
```

真实写入只在用户提供后端地址和账号密码后执行：

```bash
pnpm --filter @repo/web seed:mes-packaging
```

## Assumptions

- 真实 MES 包装接口路径与当前 `apps/web/src/features/mes/packaging/*/*-service.ts` 中的路径一致。
- `/account/login` 返回 `DataResult<AuthTokenResponse>`，其中 access token 位于 `Attach.AccessToken`。
- 当前登录账号有包装类型、包装层级、包装规格、包装规则、包装套件、物料包装关系的新增权限。
- `/Material/GetMaterialAutoQueryDatas` 能返回至少 1 条真实物料。
- 后端接受本计划中的新增 payload 字段，并由 token 自动补齐公司、工厂、创建人和审计字段。
