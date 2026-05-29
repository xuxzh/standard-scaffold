     1|import { delay, http, HttpResponse } from "msw";
     2|import { dashboardStatsResponse } from "@/features/dashboard/dashboard-contract";
     3|import type {
     4|  PackagingKitListQuery,
     5|  PackagingKitMaterialListQuery,
     6|} from "@/features/wms/packaging/packaging-kit/packaging-kit-contract";
     7|import type {
     8|  PackagingLevelApiDto,
     9|  PackagingLevelListQuery,
    10|} from "@/features/wms/packaging/packaging-level/packaging-level-contract";
    11|import type {
    12|  PackagingSpecApiDto,
    13|  PackagingSpecListQuery,
    14|} from "@/features/wms/packaging/packaging-spec/packaging-spec-contract";
    15|import type {
    16|  PackagingTypeApiDto,
    17|  PackagingTypeListQuery,
    18|} from "@/features/wms/packaging/packaging-type/packaging-contract";
    19|import {
    20|  createPackagingLevelMockStore,
    21|  type CreatePackagingLevelPayload,
    22|  type UpdatePackagingLevelPayload,
    23|} from "@/mocks/data/packaging-level-store";
    24|import {
    25|  createPackagingKitMockStore,
    26|  type CreatePackagingKitPayload,
    27|  type UpdatePackagingKitPayload,
    28|} from "@/mocks/data/packaging-kit-store";
    29|import {
    30|  createPackagingTypeMockStore,
    31|  type CreatePackagingTypePayload,
    32|  type UpdatePackagingTypePayload,
    33|} from "@/mocks/data/packaging-type-store";
    34|import {
    35|  createPackagingSpecMockStore,
    36|  type CreatePackagingSpecPayload,
    37|  type UpdatePackagingSpecPayload,
    38|} from "@/mocks/data/packaging-spec-store";
    39|import {
    40|  createMockLoginResponse,
    41|  createMockRefreshResponse,
    42|} from "@/mocks/data/auth-session";
    43|
    44|const packagingTypeStore = createPackagingTypeMockStore();
    45|const packagingLevelStore = createPackagingLevelMockStore();
    46|    47|const packagingKitStore = createPackagingKitMockStore();
    48|    49|const packagingSpecStore = createPackagingSpecMockStore();
    50|    51|
    52|export const handlers = [
    53|  http.get("/dashboard/stats", async () => {
    54|    await delay(120);
    55|
    56|    return HttpResponse.json(dashboardStatsResponse);
    57|  }),
    58|  http.post("/__mock__/reset", async ({ request }) => {
    59|    const payload = (await request.json()) as { domain?: string } | null;
    60|
    61|    if (!payload || payload.domain === "packaging-type") {
    62|      packagingTypeStore.reset();
    63|    }
    64|
    65|    if (!payload || payload.domain === "packaging-level") {
    66|      packagingLevelStore.reset();
    67|    }
    68|
    69|    70|    if (!payload || payload.domain === "packaging-kit") {
    71|      packagingKitStore.reset();
    72|    73|    if (!payload || payload.domain === "packaging-spec") {
    74|      packagingSpecStore.reset();
    75|    76|    }
    77|
    78|    return HttpResponse.json({
    79|      ok: true,
    80|    });
    81|  }),
    82|  http.post("/account/login", async ({ request }) => {
    83|    const response = createMockLoginResponse(await request.json());
    84|
    85|    return HttpResponse.json(response.data, { status: response.status });
    86|  }),
    87|  http.post("/account/refresh", async ({ request }) => {
    88|    const response = createMockRefreshResponse(await request.json());
    89|
    90|    return HttpResponse.json(response.data, { status: response.status });
    91|  }),
    92|  http.post(
    93|    "/PackagingTypeApi/GetPackagingTypeAutoQueryDatas",
    94|    async ({ request }) =>
    95|      HttpResponse.json(
    96|        packagingTypeStore.query(
    97|          (await request.json()) as Partial<PackagingTypeListQuery>,
    98|        ),
    99|      ),
   100|  ),
   101|  http.post("/PackagingTypeApi/StorePackagingTypeData", async ({ request }) =>
   102|    HttpResponse.json(
   103|      packagingTypeStore.create(
   104|        (await request.json()) as CreatePackagingTypePayload,
   105|      ),
   106|    ),
   107|  ),
   108|  http.post("/PackagingTypeApi/UpdatePackagingTypeData", async ({ request }) =>
   109|    HttpResponse.json(
   110|      packagingTypeStore.update(
   111|        (await request.json()) as UpdatePackagingTypePayload,
   112|      ),
   113|    ),
   114|  ),
   115|  http.post("/PackagingTypeApi/RemovePackagingTypeData", async ({ request }) =>
   116|    HttpResponse.json(
   117|      packagingTypeStore.remove(
   118|        (await request.json()) as Pick<PackagingTypeApiDto, "Id">,
   119|      ),
   120|    ),
   121|  ),
   122|  http.post(
   123|    "/PackagingTypeApi/RemoveBatchPackagingTypeDatas",
   124|    async ({ request }) =>
   125|      HttpResponse.json(
   126|        packagingTypeStore.removeBatch(
   127|          (await request.json()) as Array<Pick<PackagingTypeApiDto, "Id">>,
   128|        ),
   129|      ),
   130|  ),
   131|  http.post(
   132|    "/PackagingLevelApi/GetPackagingLevelAutoQueryDatas",
   133|    async ({ request }) =>
   134|      HttpResponse.json(
   135|        packagingLevelStore.query(
   136|          (await request.json()) as Partial<PackagingLevelListQuery>,
   137|        ),
   138|      ),
   139|  ),
   140|  http.post("/PackagingLevelApi/GetPackagingLevelTree", async () =>
   141|    HttpResponse.json(packagingLevelStore.tree()),
   142|  ),
   143|  http.post("/PackagingLevelApi/StorePackagingLevelData", async ({ request }) =>
   144|    HttpResponse.json(
   145|      packagingLevelStore.create(
   146|        (await request.json()) as CreatePackagingLevelPayload,
   147|      ),
   148|    ),
   149|  ),
   150|  http.post(
   151|    "/PackagingLevelApi/UpdatePackagingLevelData",
   152|    async ({ request }) =>
   153|      HttpResponse.json(
   154|        packagingLevelStore.update(
   155|          (await request.json()) as UpdatePackagingLevelPayload,
   156|        ),
   157|      ),
   158|  ),
   159|  http.post(
   160|    "/PackagingLevelApi/RemovePackagingLevelData",
   161|    async ({ request }) =>
   162|      HttpResponse.json(
   163|        packagingLevelStore.remove(
   164|          (await request.json()) as Pick<PackagingLevelApiDto, "Id">,
   165|        ),
   166|      ),
   167|  ),
   168|  http.post(
   169|    "/PackagingLevelApi/RemoveBatchPackagingLevelDatas",
   170|    async ({ request }) =>
   171|      HttpResponse.json(
   172|        packagingLevelStore.removeBatch(
   173|          (await request.json()) as Array<Pick<PackagingLevelApiDto, "Id">>,
   174|        ),
   175|      ),
   176|  ),
   177|  http.post(
   178|    "/PackagingKitApi/GetPackagingKitAutoQueryDatas",
   179|    async ({ request }) =>
   180|      HttpResponse.json(
   181|        packagingKitStore.query(
   182|          (await request.json()) as Partial<PackagingKitListQuery>,
   183|        ),
   184|      ),
   185|  ),
   186|  http.post("/Material/GetMaterialAutoQueryDatas", async ({ request }) =>
   187|    HttpResponse.json(
   188|      packagingKitStore.queryMaterials(
   189|        (await request.json()) as Partial<PackagingKitMaterialListQuery>,
   190|      ),
   191|    ),
   192|  ),
   193|  http.post("/PackagingKitApi/StorePackagingKitData", async ({ request }) =>
   194|    HttpResponse.json(
   195|      packagingKitStore.create(
   196|        (await request.json()) as CreatePackagingKitPayload,
   197|      ),
   198|    ),
   199|  ),
   200|  http.post("/PackagingKitApi/UpdatePackagingKitData", async ({ request }) =>
   201|    HttpResponse.json(
   202|      packagingKitStore.update(
   203|        (await request.json()) as UpdatePackagingKitPayload,
   204|      ),
   205|    ),
   206|  ),
   207|   208|  http.post("/PackagingKitApi/RemovePackagingKitData", async ({ request }) =>
   209|    HttpResponse.json(
   210|      packagingKitStore.remove((await request.json()) as { Id: number }),
   211|    ),
   212|  ),
   213|  http.post(
   214|    "/PackagingKitApi/RemoveBatchPackagingKitDatas",
   215|    async ({ request }) =>
   216|      HttpResponse.json(
   217|        packagingKitStore.removeBatch(
   218|          (await request.json()) as Array<{ Id: number }>,
   219|        ),
   220|      ),
   221|   222|  http.post("/PackagingSpecApi/GetPackagingSpecAutoQueryDatas", async ({ request }) =>
   223|    HttpResponse.json(
   224|      packagingSpecStore.query(
   225|        (await request.json()) as Partial<PackagingSpecListQuery>,
   226|      ),
   227|    ),
   228|  ),
   229|  http.post("/PackagingSpecApi/StorePackagingSpecData", async ({ request }) =>
   230|    HttpResponse.json(
   231|      packagingSpecStore.create(
   232|        (await request.json()) as CreatePackagingSpecPayload,
   233|      ),
   234|    ),
   235|  ),
   236|  http.post("/PackagingSpecApi/UpdatePackagingSpecData", async ({ request }) =>
   237|    HttpResponse.json(
   238|      packagingSpecStore.update(
   239|        (await request.json()) as UpdatePackagingSpecPayload,
   240|      ),
   241|    ),
   242|  ),
   243|  http.post("/PackagingSpecApi/RemovePackagingSpecData", async ({ request }) =>
   244|    HttpResponse.json(
   245|      packagingSpecStore.remove(
   246|        (await request.json()) as Pick<PackagingSpecApiDto, "Id">,
   247|      ),
   248|    ),
   249|  ),
   250|  http.post("/PackagingSpecApi/RemoveBatchPackagingSpecDatas", async ({ request }) =>
   251|    HttpResponse.json(
   252|      packagingSpecStore.removeBatch(
   253|        (await request.json()) as Array<Pick<PackagingSpecApiDto, "Id">>,
   254|      ),
   255|    ),
   256|   257|  ),
   258|];
   259|