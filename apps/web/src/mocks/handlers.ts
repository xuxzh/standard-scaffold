import { delay, http, HttpResponse } from "msw";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";
import type {
  PackagingKitListQuery,
  PackagingKitMaterialListQuery,
} from "@/features/mes/packaging/packaging-kit/packaging-kit-contract";
import type {
  PackagingLevelApiDto,
  PackagingLevelListQuery,
} from "@/features/mes/packaging/packaging-level/packaging-level-contract";
import type {
  PackagingRuleApiDto,
  PackagingRuleListQuery,
} from "@/features/mes/packaging/packaging-rule/packaging-rule-contract";
import type {
  PackagingSpecApiDto,
  PackagingSpecListQuery,
} from "@/features/mes/packaging/packaging-spec/packaging-spec-contract";
import type {
  PackagingTypeApiDto,
  PackagingTypeListQuery,
} from "@/features/mes/packaging/packaging-type/packaging-contract";
import {
  createPackagingLevelMockStore,
  type CreatePackagingLevelPayload,
  type UpdatePackagingLevelPayload,
} from "@/mocks/data/packaging-level-store";
import {
  createPackagingKitMockStore,
  type CreatePackagingKitPayload,
  type UpdatePackagingKitPayload,
} from "@/mocks/data/packaging-kit-store";
import {
  createPackagingRuleMockStore,
  type CreatePackagingRulePayload,
  type PackagingRuleConfigQueryPayload,
  type UpdatePackagingRulePayload,
} from "@/mocks/data/packaging-rule-store";
import {
  createPackagingTypeMockStore,
  type CreatePackagingTypePayload,
  type UpdatePackagingTypePayload,
} from "@/mocks/data/packaging-type-store";
import {
  createPackagingSpecMockStore,
  type CreatePackagingSpecPayload,
  type UpdatePackagingSpecPayload,
} from "@/mocks/data/packaging-spec-store";
import {
  createMaterialPackagingRelationMockStore,
  type CreateMaterialPackagingRelationPayload,
  type UpdateMaterialPackagingRelationPayload,
} from "@/mocks/data/material-packaging-relation-store";
import {
  createMockLoginResponse,
  createMockRefreshResponse,
} from "@/mocks/data/auth-session";
import { createDataResult } from "@/mocks/data/mock-store-utils";

const packagingTypeStore = createPackagingTypeMockStore();
const packagingLevelStore = createPackagingLevelMockStore();

const packagingKitStore = createPackagingKitMockStore();

const packagingSpecStore = createPackagingSpecMockStore();

const packagingRuleStore = createPackagingRuleMockStore();

const materialPackagingRelationStore =
  createMaterialPackagingRelationMockStore();

export const handlers = [
  http.get("/dashboard/stats", async () => {
    await delay(120);

    return HttpResponse.json(dashboardStatsResponse);
  }),
  http.post("/__mock__/reset", async ({ request }) => {
    const payload = (await request.json()) as { domain?: string } | null;

    if (!payload || payload.domain === "packaging-type") {
      packagingTypeStore.reset();
    }

    if (!payload || payload.domain === "packaging-level") {
      packagingLevelStore.reset();
    }

    if (!payload || payload.domain === "packaging-kit") {
      packagingKitStore.reset();
    }

    if (!payload || payload.domain === "packaging-spec") {
      packagingSpecStore.reset();
    }

    if (!payload || payload.domain === "packaging-rule") {
      packagingRuleStore.reset();
    }

    if (!payload || payload.domain === "material-packaging-relation") {
      materialPackagingRelationStore.reset();
    }

    return HttpResponse.json({
      ok: true,
    });
  }),
  http.post("/account/login", async ({ request }) => {
    const response = createMockLoginResponse(await request.json());

    return HttpResponse.json(response.data, { status: response.status });
  }),
  http.post("/account/refresh", async ({ request }) => {
    const response = createMockRefreshResponse(await request.json());

    return HttpResponse.json(response.data, { status: response.status });
  }),
  http.post(
    "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingTypeStore.query(
          (await request.json()) as Partial<PackagingTypeListQuery>,
        ),
      ),
  ),
  http.post("/PackagingTypeApi/StorePackagingTypeData", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.create(
        (await request.json()) as CreatePackagingTypePayload,
      ),
    ),
  ),
  http.post("/PackagingTypeApi/UpdatePackagingTypeData", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.update(
        (await request.json()) as UpdatePackagingTypePayload,
      ),
    ),
  ),
  http.post("/PackagingTypeApi/RemovePackagingTypeData", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.remove(
        (await request.json()) as Pick<PackagingTypeApiDto, "Id">,
      ),
    ),
  ),
  http.post(
    "/PackagingTypeApi/RemoveBatchPackagingTypeDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingTypeStore.removeBatch(
          (await request.json()) as Array<Pick<PackagingTypeApiDto, "Id">>,
        ),
      ),
  ),
  http.post(
    "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingLevelStore.query(
          (await request.json()) as Partial<PackagingLevelListQuery>,
        ),
      ),
  ),
  http.post("/PackagingLevelApi/GetPackagingLevelTree", async () =>
    HttpResponse.json(packagingLevelStore.tree()),
  ),
  http.post("/PackagingLevelApi/StorePackagingLevelData", async ({ request }) =>
    HttpResponse.json(
      packagingLevelStore.create(
        (await request.json()) as CreatePackagingLevelPayload,
      ),
    ),
  ),
  http.post(
    "/PackagingLevelApi/UpdatePackagingLevelData",
    async ({ request }) =>
      HttpResponse.json(
        packagingLevelStore.update(
          (await request.json()) as UpdatePackagingLevelPayload,
        ),
      ),
  ),
  http.post(
    "/PackagingLevelApi/RemovePackagingLevelData",
    async ({ request }) =>
      HttpResponse.json(
        packagingLevelStore.remove(
          (await request.json()) as Pick<PackagingLevelApiDto, "Id">,
        ),
      ),
  ),
  http.post(
    "/PackagingLevelApi/RemoveBatchPackagingLevelDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingLevelStore.removeBatch(
          (await request.json()) as Array<Pick<PackagingLevelApiDto, "Id">>,
        ),
      ),
  ),
  http.post(
    "/PackagingKitApi/GetPackagingKitAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingKitStore.query(
          (await request.json()) as Partial<PackagingKitListQuery>,
        ),
      ),
  ),
  http.post("/MaterialInfoApi/GetMaterialInfoAutoQueryDatas", async ({ request }) =>
    HttpResponse.json(
      packagingKitStore.queryMaterials(
        (await request.json()) as Partial<PackagingKitMaterialListQuery>,
      ),
    ),
  ),
  http.post("/PackagingKitApi/StorePackagingKitData", async ({ request }) =>
    HttpResponse.json(
      packagingKitStore.create(
        (await request.json()) as CreatePackagingKitPayload,
      ),
    ),
  ),
  http.post("/PackagingKitApi/UpdatePackagingKitData", async ({ request }) =>
    HttpResponse.json(
      packagingKitStore.update(
        (await request.json()) as UpdatePackagingKitPayload,
      ),
    ),
  ),

  http.post("/PackagingKitApi/RemovePackagingKitData", async ({ request }) =>
    HttpResponse.json(
      packagingKitStore.remove((await request.json()) as { Id: number }),
    ),
  ),
  http.post(
    "/PackagingKitApi/RemoveBatchPackagingKitDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingKitStore.removeBatch(
          (await request.json()) as Array<{ Id: number }>,
        ),
      ),
  ),

  http.post(
    "/PackagingSpecApi/GetPackagingSpecAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingSpecStore.query(
          (await request.json()) as Partial<PackagingSpecListQuery>,
        ),
      ),
  ),
  http.post("/PackagingSpecApi/StorePackagingSpecData", async ({ request }) =>
    HttpResponse.json(
      packagingSpecStore.create(
        (await request.json()) as CreatePackagingSpecPayload,
      ),
    ),
  ),
  http.post("/PackagingSpecApi/UpdatePackagingSpecData", async ({ request }) =>
    HttpResponse.json(
      packagingSpecStore.update(
        (await request.json()) as UpdatePackagingSpecPayload,
      ),
    ),
  ),
  http.post("/PackagingSpecApi/RemovePackagingSpecData", async ({ request }) =>
    HttpResponse.json(
      packagingSpecStore.remove(
        (await request.json()) as Pick<PackagingSpecApiDto, "Id">,
      ),
    ),
  ),
  http.post(
    "/PackagingSpecApi/RemoveBatchPackagingSpecDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingSpecStore.removeBatch(
          (await request.json()) as Array<Pick<PackagingSpecApiDto, "Id">>,
        ),
      ),
  ),
  http.post(
    "/PackagingRuleApi/GetPackagingRuleAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingRuleStore.query(
          (await request.json()) as Partial<PackagingRuleListQuery>,
        ),
      ),
  ),
  http.post("/PackagingRuleApi/StorePackagingRuleData", async ({ request }) =>
    HttpResponse.json(
      packagingRuleStore.create(
        (await request.json()) as CreatePackagingRulePayload,
      ),
    ),
  ),
  http.post("/PackagingRuleApi/UpdatePackagingRuleData", async ({ request }) =>
    HttpResponse.json(
      packagingRuleStore.update(
        (await request.json()) as UpdatePackagingRulePayload,
      ),
    ),
  ),
  http.post("/PackagingRuleApi/RemovePackagingRuleData", async ({ request }) =>
    HttpResponse.json(
      packagingRuleStore.remove(
        (await request.json()) as Pick<PackagingRuleApiDto, "Id">,
      ),
    ),
  ),
  http.post(
    "/PackagingRuleApi/RemoveBatchPackagingRuleDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingRuleStore.removeBatch(
          (await request.json()) as Array<Pick<PackagingRuleApiDto, "Id">>,
        ),
      ),
  ),
  http.post(
    "/PackagingRuleApi/GetPackagingRuleConfigAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        packagingRuleStore.getConfig(
          (await request.json()) as PackagingRuleConfigQueryPayload,
        ),
      ),
  ),
  http.post(
    "/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas",
    async ({ request }) =>
      HttpResponse.json(
        materialPackagingRelationStore.query(
          (await request.json()) as {
            MaterialCode?: string;
            MaterialName?: string;
            PackagingRuleCode?: string;
            PackagingRuleName?: string;
            IsPaged?: boolean;
            PageIndex?: number;
            PageSize?: number;
          },
        ),
      ),
  ),
  http.post(
    "/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData",
    async ({ request }) =>
      HttpResponse.json(
        materialPackagingRelationStore.create(
          (await request.json()) as CreateMaterialPackagingRelationPayload,
        ),
      ),
  ),
  http.post(
    "/MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData",
    async ({ request }) =>
      HttpResponse.json(
        materialPackagingRelationStore.update(
          (await request.json()) as UpdateMaterialPackagingRelationPayload,
        ),
      ),
  ),
  http.post(
    "/MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData",
    async ({ request }) =>
      HttpResponse.json(
        materialPackagingRelationStore.remove(
          (await request.json()) as { Id: number },
        ),
      ),
  ),
  http.post(
    "/MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas",
    async ({ request }) =>
      HttpResponse.json(
        materialPackagingRelationStore.removeBatch(
          (await request.json()) as Array<{ Id: number }>,
        ),
      ),
  ),
  http.post("/LabelApi/GetLabelRuleAutoQueryDatas", async () => {
    await delay(120);

    return HttpResponse.json({
      Attach: [
        { RuleId: "BARCODE_STD", RuleName: "Standard Barcode" },
        { RuleId: "BARCODE_QR", RuleName: "QR Code" },
        { RuleId: "BARCODE_GS1", RuleName: "GS1 Barcode" },
        { RuleId: "BARCODE_CUSTOM", RuleName: "Custom Barcode" },
        { RuleId: "BARCODE_PALLET", RuleName: "Pallet Barcode" },
      ],
      TotalCount: 5,
      PageIndex: 1,
      PageSize: 1000,
    });
  }),
  http.post("/LabelTemplateFile/findLabelTemplateFileWithSimple", async () => {
    await delay(120);

    return HttpResponse.json(
      createDataResult(
        [
          { TemplateCode: "TPL-A", TemplateName: "Standard Box Label" },
          { TemplateCode: "TPL-B", TemplateName: "Pallet Label" },
          { TemplateCode: "TPL-C", TemplateName: "Inner Box Label" },
          { TemplateCode: "TPL-PACK", TemplateName: "Packing List Label" },
          { TemplateCode: "TPL-SHIP", TemplateName: "Shipping Label" },
        ],
        5,
        "[Print] Query success",
      ),
    );
  }),
];
