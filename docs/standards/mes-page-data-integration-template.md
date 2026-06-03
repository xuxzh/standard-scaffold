# MES 新页面数据接入模板

本文档定义 MES 模块新页面的标准数据接入模式，基于包装六页的成熟实践沉淀。

## 架构概览

```
contract → service → queries → page 组件
   ↑                      ↑
   │                      │
   DTO/类型定义           React Query hooks
   PascalCase             (camelCase)
```

**Mock 模式** vs **真实模式**：
- 页面组件完全无感知，只消费 query hook 和 page record
- 切换通过 `apps/web/.env.local` 中的环境变量完成：
  - `VITE_ENABLE_API_MOCKING=true` → MSW 拦截
  - `VITE_ENABLE_API_MOCKING=false` + `VITE_MES_API_BASE_URL=<url>` → 真实 MES
- mock 数据统一放在 `apps/web/src/mocks/data/<domain>-store.ts`
- MSW handler 只接 service 中声明的路径

## 第一步：维护 `*-contract.ts`

文件位置：`apps/web/src/features/mes/<module>/*-contract.ts`

### 必须定义的类型

```typescript
// 1. API DTO（PascalCase，与后端 wire format 对齐）
export type YourApiDto = {
  Id: number;
  YourField: string;
  // ...
  CompanyCode?: string;
  FactoryCode?: string;
  CreationTime?: string | null;
  LastModificationTime?: string | null;
};

// 2. 页面 Record（camelCase，用于组件消费）
export type YourRecord = {
  id: number;
  yourField: string;
  // ...
  creationTime?: string | null;
  lastModificationTime?: string | null;
};

// 3. 筛选条件
export type YourFilters = {
  fieldName: string; // 文本筛选用 string
  boolField: "all" | "true" | "false"; // 三态布尔
};

// 4. 列表查询参数（PascalCase，直接发送给后端）
export type YourListQuery = {
  FieldName?: string;
  BoolField?: boolean;
  IsPaged: true;
  PageIndex: number;
  PageSize: number;
};

// 5. 表单类型（string 字段，用于表单绑定）
export type YourFormValues = {
  fieldName: string;
  boolField: boolean;
};

// 6. 创建输入 = 表单值
export type CreateYourInput = YourFormValues;

// 7. 更新输入 = 表单值 + id
export type UpdateYourInput = YourFormValues & { id: number };
```

### 必须导出的常量和函数

```typescript
// 分页大小常量
export const yourPageSize = 20;

// 默认筛选条件
export const yourDefaultFilters: YourFilters = {
  fieldName: "",
  boolField: "all",
};

// DTO → Record 映射（处理 null → "" 归一化）
export function mapYourDtoToRecord(dto: YourApiDto): YourRecord {
  return {
    id: dto.Id,
    yourField: dto.YourField,
    nullableField: dto.NullableField ?? "",
    creationTime: dto.CreationTime,
    lastModificationTime: dto.LastModificationTime,
  };
}
```

### 如有表单字符串字段需要解析为数字

```typescript
export function parseYourInteger(value: string) {
  return Number.parseInt(value, 10);
}
```

## 第二步：维护 `*-service.ts`

文件位置：`apps/web/src/features/mes/<module>/*-service.ts`

### 路径常量

```typescript
import { getMesClient } from "@/lib/api/mes-client";

const YOUR_QUERY_PATH = "/YourApi/GetYourAutoQueryDatas";
const YOUR_CREATE_PATH = "/YourApi/StoreYourData";
const YOUR_UPDATE_PATH = "/YourApi/UpdateYourData";
const YOUR_DELETE_PATH = "/YourApi/RemoveYourData";
const YOUR_BATCH_DELETE_PATH = "/YourApi/RemoveBatchYourDatas";
```

### 查询参数类型

```typescript
import type { ApiQueryParams } from "@/lib/api/http-client";

export type YourQueryDto = ApiQueryParams & {
  FieldName?: string;
  BoolField?: boolean;
};
```

### CRUD 函数

```typescript
// 列表查询
export function getYourList(
  query: YourQueryDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<YourApiDto[]>> {
  return getMesClient().postDataResult<YourApiDto[]>(
    YOUR_QUERY_PATH,
    query,
    options,
  );
}

// 创建
export function createYour(
  input: CreateYourInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<YourApiDto>> {
  return getMesClient().postDataResult<YourApiDto>(
    YOUR_CREATE_PATH,
    toCreatePayload(input),
    options,
  );
}

// 更新（使用 NeedUpdateFields 包裹）
export function updateYour(
  input: UpdateYourInput,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    YOUR_UPDATE_PATH,
    {
      NeedUpdateFields: {
        Id: input.id,
        FieldName: input.fieldName,
        // ...
      },
    },
    options,
  );
}

// 删除（剥离 CompanyCode/FactoryCode）
export function deleteYour(
  dto: YourApiDto,
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  const payload = { ...dto };
  delete payload.CompanyCode;
  delete payload.FactoryCode;
  return getMesClient().postDataResult<null>(
    YOUR_DELETE_PATH,
    payload,
    options,
  );
}

// 批量删除
export function deleteYours(
  dtos: YourApiDto[],
  options: { signal?: AbortSignal } = {},
): Promise<DataResult<null>> {
  return getMesClient().postDataResult<null>(
    YOUR_BATCH_DELETE_PATH,
    dtos.map((dto) => {
      const payload = { ...dto };
      delete payload.CompanyCode;
      delete payload.FactoryCode;
      return payload;
    }),
    options,
  );
}
```

### 重要约定

1. **统一使用 `getMesClient()`**，不要自己调用 `fetch` 或拼接 URL
2. **创建/更新时做 payload 转换**（camelCase → PascalCase），收敛在 service 层
3. **删除时剥离 `CompanyCode`/`FactoryCode`**，这些字段后端不需要
4. **MES client 禁止在页面组件中直接使用**，所有 API 调用必须通过 service

## 第三步：维护 `*-queries.ts`

文件位置：`apps/web/src/features/mes/<module>/*-queries.ts`

### Query key 约定

```typescript
// 固定前缀 ["mes", "<domain>", "<operation>"] + 查询参数
export function yourListQueryKey(
  filters: YourFilters,
  pageIndex: number,
  searchVersion = 0,
) {
  return ["mes", "your-domain", "list", filters, pageIndex, searchVersion] as const;
}
```

### 列表 Query

```typescript
export function useYourListQuery(
  filters: YourFilters,
  pageIndex: number,
  searchVersion = 0,
) {
  return useQuery({
    queryKey: yourListQueryKey(filters, pageIndex, searchVersion),
    queryFn: async ({ signal }) => {
      const result = await getYourList(
        buildYourListRequest(filters, pageIndex, yourPageSize),
        { signal },
      );
      return {
        items: result.Attach.map(mapYourDtoToRecord),
        totalCount: result.TotalCount,
      };
    },
  });
}
```

### Mutation 模板

```typescript
// 通用 pattern：onSuccess 时 invalidate 相关 query
export function useCreateYourMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: YourFormValues) => await createYour(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "your-domain", "list"],
      });
    },
  });
}

export function useUpdateYourMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (values: YourFormValues & { id: number }) =>
      await updateYour(values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "your-domain", "list"],
      });
    },
  });
}

export function useDeleteYourMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: YourApiDto) => await deleteYour(dto),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "your-domain", "list"],
      });
    },
  });
}

export function useBatchDeleteYoursMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dtos: YourApiDto[]) => await deleteYours(dtos),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["mes", "your-domain", "list"],
      });
    },
  });
}
```

## 第四步：维护 mock 数据 store

文件位置：`apps/web/src/mocks/data/<domain>-store.ts`

### Store 结构

```typescript
import { buildRecords, cloneRecords, createDataResult, includesText, padNumber, paginateRecords } from "@/mocks/data/mock-store-utils";
import { getMockRecordCount } from "@/mocks/config";

// 1. 定义 seed 数据（真实业务语义，至少 3 条）
const yourSeedRecords: YourApiDto[] = [
  {
    Id: 1,
    FieldCode: "SEED_001",
    FieldName: "种子数据一",
    // ...
  },
  // ...
];

// 2. 生成器函数
function createYourRecord(index: number): YourApiDto {
  return {
    Id: index,
    FieldCode: `GEN_${padNumber(index)}`,
    FieldName: `Generated ${padNumber(index)}`,
    // 使用 index % n 产生变化，覆盖筛选场景
    BoolField: index % 2 === 0,
    // ...
  };
}

// 3. 导出 mock 数据
export const yourMockRecords = buildRecords(
  yourSeedRecords,
  getMockRecordCount(),
  createYourRecord,
);

// 4. Store 工厂
export function createYourMockStore(
  initialRecords: YourApiDto[] = yourMockRecords,
) {
  const seedRecords = cloneRecords(initialRecords);
  let records = cloneRecords(seedRecords);
  let nextId = Math.max(...records.map((r) => r.Id), 0) + 1;

  function reset() {
    records = cloneRecords(seedRecords);
    nextId = Math.max(...records.map((r) => r.Id), 0) + 1;
  }

  return {
    query(query: Partial<YourListQuery>) {
      // 按字段筛选 → 分页 → 返回 DataResult
      const filtered = records.filter(/* ... */);
      const paged = paginateRecords(filtered, query);
      return createDataResult(paged, filtered.length, "[MES] 获取数据成功！");
    },
    create(payload: CreateYourPayload) {
      const record: YourApiDto = { Id: nextId, ...payload };
      nextId++;
      records = [record, ...records];
      return createDataResult(record, 1, "[MES] 获取数据成功！");
    },
    update(payload: UpdateYourPayload) {
      records = records.map((r) =>
        r.Id === payload.NeedUpdateFields.Id ? { ...r, ...payload.NeedUpdateFields, LastModificationTime: new Date().toISOString() } : r
      );
      return createDataResult(null, 0, "[MES] 获取数据成功！");
    },
    remove(dto: Pick<YourApiDto, "Id">) {
      records = records.filter((r) => r.Id !== dto.Id);
      return createDataResult(null, 0, "[MES] 获取数据成功！");
    },
    removeBatch(dtos: Array<Pick<YourApiDto, "Id">>) {
      const ids = new Set(dtos.map((d) => d.Id));
      records = records.filter((r) => !ids.has(r.Id));
      return createDataResult(null, 0, "[MES] 获取数据成功！");
    },
    reset,
  };
}
```

### Mock 数据要求

- seed 数据使用真实业务语义
- 生成数据覆盖分页（至少 40 条）、筛选和批量操作场景
- 创建/更新时自动生成时间戳
- 提供 `reset()` 方法供 E2E 测试重置

## 第五步：注册 MSW handler

文件位置：`apps/web/src/mocks/handlers.ts`

```typescript
import { createYourMockStore, type CreateYourPayload, type UpdateYourPayload } from "@/mocks/data/your-store";

const yourStore = createYourMockStore();

// 在 handlers 数组中添加：
http.post("/YourApi/GetYourAutoQueryDatas", async ({ request }) =>
  HttpResponse.json(yourStore.query((await request.json()) as Partial<YourListQuery>)),
),
http.post("/YourApi/StoreYourData", async ({ request }) =>
  HttpResponse.json(yourStore.create((await request.json()) as CreateYourPayload)),
),
http.post("/YourApi/UpdateYourData", async ({ request }) =>
  HttpResponse.json(yourStore.update((await request.json()) as UpdateYourPayload)),
),
http.post("/YourApi/RemoveYourData", async ({ request }) =>
  HttpResponse.json(yourStore.remove((await request.json()) as Pick<YourApiDto, "Id">)),
),
http.post("/YourApi/RemoveBatchYourDatas", async ({ request }) =>
  HttpResponse.json(yourStore.removeBatch((await request.json()) as Array<Pick<YourApiDto, "Id">>)),
),
```

## 验收标准

1. **页面组件零修改切换**：mock 与真实模式切换仅需改 `.env.local`，页面代码不修改
2. **类型安全**：`pnpm --filter @repo/web typecheck` 通过
3. **单元测试**：`pnpm --filter @repo/web test` 通过
4. **分层清晰**：
   - 页面不直接调用 `fetch` 或拼接 URL
   - 后端差异统一收敛在 contract/service 层
   - Query key 管理收敛在 queries 层
5. **Mock 数据覆盖**：分页、筛选、CRUD、批量删除均在 mock 中可验证
6. **MES API 路径正确**：使用 MES client（非 WMS client），路径前缀与后端一致
