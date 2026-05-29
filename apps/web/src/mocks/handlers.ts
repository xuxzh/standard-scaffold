import { delay, http, HttpResponse } from "msw";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";
import type {
  PackagingKitListQuery,
  PackagingKitMaterialListQuery,
} from "@/features/wms/packaging/packaging-kit/packaging-kit-contract";
import type {
  PackagingLevelApiDto,
  PackagingLevelListQuery,
} from "@/features/wms/packaging/packaging-level/packaging-level-contract";
import type {
  PackagingTypeApiDto,
  PackagingTypeListQuery,
} from "@/features/wms/packaging/packaging-type/packaging-contract";
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
  createPackagingTypeMockStore,
  type CreatePackagingTypePayload,
  type UpdatePackagingTypePayload,
} from "@/mocks/data/packaging-type-store";
import {
  createMockLoginResponse,
  createMockRefreshResponse,
} from "@/mocks/data/auth-session";

const packagingTypeStore = createPackagingTypeMockStore();
const packagingLevelStore = createPackagingLevelMockStore();
const packagingKitStore = createPackagingKitMockStore();

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
  http.post("/Material/GetMaterialAutoQueryDatas", async ({ request }) =>
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
];
