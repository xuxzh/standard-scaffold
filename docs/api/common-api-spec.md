# 通用(CRUD)接口规范

| 项目             | 说明                                                           |
| ---------------- | -------------------------------------------------------------- |
| **Base URL**     | `http://{host}:8282`（生产）/ `https://localhost:7298`（开发） |
| **接口风格**     | 统一 `POST`                                                    |
| **路由规则**     | `/{controllerName}/{interfaceName}`                            |
| **Content-Type** | `application/json`                                             |
| **认证方式**     | 请求头 `Authorization: Bearer {token}`，token 承载用户和公司/工厂上下文 |
| **字段命名**     | 大驼峰 PascalCase，大小写敏感                                  |
| **Swagger**      | 启动后访问根路径 `/`                                           |

## 2.1 通用响应结构 — DataResult<T>

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 获取数据成功！",
  "Attach": { ... },
  "SkipCount": 0,
  "TotalCount": 100,
  "Record": 20
}
```

| 字段       | 类型    | 说明                                                              |
| ---------- | ------- | ----------------------------------------------------------------- |
| Success    | bool    | 操作是否成功。查询无数据时返回 false，且必须设置 Code=100001      |
| Code       | string? | 业务状态码，仅在查询无数据时返回 "100001"（前端据此不弹错误提示） |
| Message    | string  | 操作信息描述                                                      |
| Attach     | T       | 业务数据。查询列表时为数组，单条查询时为对象，无数据时为 null     |
| SkipCount  | int     | 跳过的数据条数，用于前端分页计算                                  |
| TotalCount | int     | 满足条件的总数据量                                                |
| Record     | int     | 当前返回的数据条数                                                |

## 2.2 通用查询参数

| 字段      | 类型 | 说明                          |
| --------- | ---- | ----------------------------- |
| IsPaged   | bool | 是否启用分页，前端默认 true   |
| PageSize  | int  | 每页条数，默认 10，最大 10000 |
| PageIndex | int  | 页码，从 1 开始               |

> **查询规则**（适用于所有 string 类型的查询字段）：
>
> 1. **模糊查询**（默认）：直接传值，如 {"TypeName": "纸箱"}，模糊匹配包含"纸箱"的数据
> 2. **精确查询**：值前加 \$ 前缀，如 {"TypeCode": "$PT001"} 只匹配 PT001，不匹配 PT0011
> 3. **多值匹配**：多个值用 [] 连接，如 {"TypeCode": "PT001[]PT002[]PT003"}，查询 TypeCode 为 PT001 或 PT002 或 PT003 的数据
> 4. **时间范围查询**：字段名以 Range 结尾且类型为 DateTime[] 时，传入两个元素的数组，第一个为开始时间，第二个为结束时间，如 {"CreationTimeRange": ["2026-01-01", "2026-05-25"]}

> **租户上下文**：前端不在查询、新增、编辑、删除请求体中传递 `CompanyCode` 和 `FactoryCode`。后端应从 `Authorization` token 中解析当前用户所属公司与工厂，并在服务端完成数据隔离、默认赋值和权限校验。

## 2.3 通用数据字段

以下字段是通用数据对象字段，可出现在响应 DTO 中。其中 `CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文维护，前端不作为请求参数主动传递。

| 字段                     | 类型    | 说明                 |
| ------------------------ | ------- | -------------------- |
| Id                       | int     | 数据主键             |
| CompanyCode              | string  | 公司编码             |
| FactoryCode              | string  | 工厂编码             |
| CreatorUserId            | int     | 创建人 ID            |
| CreatorUserName          | string  | 创建人用户名         |
| CreatorUserRealName      | string  | 创建人真实姓名       |
| CreationTime             | string  | 创建时间（ISO 8601） |
| LastModifierUserId       | int?    | 最后修改人 ID        |
| LastModifierUserName     | string? | 最后修改人用户名     |
| LastModifierUserRealName | string? | 最后修改人真实姓名   |
| LastModificationTime     | string? | 最后修改时间         |
| Remark                   | string  | 备注                 |

## 2.4 标准 CRUD 接口模式

| 操作     | 方法名模式                  | 入参                                  | 出参                            |
| -------- | --------------------------- | ------------------------------------- | ------------------------------- |
| 批量查询 | `Get{Entity}AutoQueryDatas` | `{Entity}QueryDto`                    | `DataResult<List<{Entity}Dto>>` |
| 新增     | `Store{Entity}Data`         | `{Entity}Dto`                         | `DataResult<{Entity}Dto>`       |
| 批量新增 | `StoreBatch{Entity}Datas`   | `List<{Entity}Dto>`                   | `DataResult`                    |
| 更新     | `Update{Entity}Data`        | `{Entity}Dto`（含 NeedUpdateFields）  | `DataResult`                    |
| 删除     | `Remove{Entity}Data`        | `{Entity}Dto`（传完整对象）           | `DataResult`                    |
| 批量删除 | `RemoveBatch{Entity}Datas`  | `List<{Entity}Dto>`（每项传完整对象） | `DataResult`                    |

> URL 拼接规则: /{controllerName}/{interfaceName}

### 查询接口

- 模糊查询（默认）：直接传值，如 `{"TypeName": "纸箱"}`
- 精确查询：值前加 $ 前缀，如 `{"TypeCode": "$PT001"}`
- 多值匹配：多个值用 `[]` 连接，如 `{"TypeCode": "PT001[]PT002[]PT003"}`
- `PageIndex` 从 1 开始
- `PageSize` 默认 10，最大 10000

**请求示例**

```json
{
  "TypeCode": "",
  "TypeName": "",
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1
}
```

### 新增接口

- 请注意字段必填校验

**请求示例**

```json
{
  "TypeCode": "PT001",
  "TypeName": "纸箱包装",
  "IsRecyclable": false,
  "Description": "标准纸箱包装类型",
  "Remark": ""
}
```

### 批量新增

- 一般用不上，后端可能也不会开出来
- 同[新增接口](#新增接口)，不过要传入数组

```json
[
  {
    "TypeCode": "PT001",
    "TypeName": "纸箱包装",
    "IsRecyclable": false,
    "Description": "标准纸箱包装类型",
    "Remark": ""
  },
  {
    "TypeCode": "PT001",
    "TypeName": "塑料包装",
    "IsRecyclable": false,
    "Description": "标准塑料包装类型",
    "Remark": ""
  }
]
```

### 更新(编辑)接口

- 使用 `NeedUpdateFields` 格式，只需传入要修改的字段 + `Id`
- 未传的字段不会被修改

**请求示例**

```json
{
  "NeedUpdateFields": {
    "Id": 1,
    "TypeName": "循环塑料箱"
  }
}
```

### 删除接口

- 删除和批量删除接口传业务 DTO 对象，但不传 `CompanyCode` 和 `FactoryCode`
- 不要只传 Id，因为主键可能不是 Id，也可能按其他字段条件删除

**请求示例**

```json
{
  "Id": 1,
  "TypeCode": "PT001",
  "TypeName": "纸箱包装",
  "IsRecyclable": false,
  "Description": "标准纸箱包装类型"
}
```

### 批量删除接口

- 同[删除接口](#删除接口)，只是传入的是要删除数据的数组

示例：

```json
[
  {
    "Id": 1,
    "TypeCode": "PT001",
    "TypeName": "纸箱包装"
  },
  {
    "Id": 2,
    "TypeCode": "PT002",
    "TypeName": "塑料箱"
  }
]
```

## 重要注意事项

1. **字段命名规范**
   - 所有字段统一使用大驼峰 PascalCase（如 `TypeCode`、`IsRecyclable`），大小写敏感，传参必须严格匹配
2. **无数据处理**
   - 查询无数据时，`Success` 返回 `false` 且 `Code` 为 `"100001"`
   - 前端应据此判断是"无数据"而非"请求失败"，不弹出错误提示
3. **时间字段**
   - 使用 ISO 8601 格式（如 `2026-05-25T10:00:00`）
   - 前端需做格式化显示
4. **Message 前缀**
   - 所有返回的 `Message` 字段已统一添加 `[MOM]` 前缀
5. **租户字段**
   - `CompanyCode` 和 `FactoryCode` 不由前端传入，后端统一从 token 上下文解析
