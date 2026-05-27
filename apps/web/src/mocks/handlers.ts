import { http, HttpResponse } from "msw";
import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";
import type {
  PackagingTypeApiDto,
  PackagingTypeListQuery,
} from "@/features/wms/packaging/packaging-type/packaging-contract";
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

export const handlers = [
  http.get("/dashboard/stats", () => HttpResponse.json(dashboardStatsResponse)),
  http.post("/account/login", async ({ request }) => {
    const response = createMockLoginResponse(await request.json());

    return HttpResponse.json(response.data, { status: response.status });
  }),
  http.post("/account/refresh", async ({ request }) => {
    const response = createMockRefreshResponse(await request.json());

    return HttpResponse.json(response.data, { status: response.status });
  }),
  http.post("/PackagingTypeApi/GetPackagingTypeAutoQueryDatas", async ({ request }) =>
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
  http.post("/PackagingTypeApi/RemoveBatchPackagingTypeDatas", async ({ request }) =>
    HttpResponse.json(
      packagingTypeStore.removeBatch(
        (await request.json()) as Array<Pick<PackagingTypeApiDto, "Id">>,
      ),
    ),
  ),
];
