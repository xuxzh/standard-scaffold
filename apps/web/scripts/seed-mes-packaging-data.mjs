/* global fetch, console, process */
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

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    exit(1);
  });
}
