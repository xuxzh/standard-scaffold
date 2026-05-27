# 包装模块 — 后端 API 接口文档

> 面向前端开发团队的接口对接文档

---

## 目录

- [1. 需求背景](#1-需求背景)
- [2. 接口约定（通用）](#2-接口约定通用)
- [3. 本次需求接口清单](#3-本次需求接口清单)
- [4. 接口详细说明](#4-接口详细说明)
  - [4.1 包装类型管理](#41-包装类型管理)
    - [4.1.1 查询包装类型](#411-查询包装类型)
    - [4.1.2 新增包装类型](#412-新增包装类型)
    - [4.1.3 修改包装类型](#413-修改包装类型)
    - [4.1.4 删除包装类型](#414-删除包装类型)
    - [4.1.5 批量删除包装类型](#415-批量删除包装类型)
  - [4.2 包装层级管理](#42-包装层级管理)
    - [4.2.1 查询包装层级](#421-查询包装层级)
    - [4.2.2 查看包装层级关系图](#422-查看包装层级关系图)
    - [4.2.3 新增包装层级](#423-新增包装层级)
    - [4.2.4 修改包装层级](#424-修改包装层级)
    - [4.2.5 删除包装层级](#425-删除包装层级)
    - [4.2.6 批量删除包装层级](#426-批量删除包装层级)
  - [4.3 包装规格管理](#43-包装规格管理)
    - [4.3.1 查询包装规格](#431-查询包装规格)
    - [4.3.2 新增包装规格](#432-新增包装规格)
    - [4.3.3 修改包装规格](#433-修改包装规格)
    - [4.3.4 删除包装规格](#434-删除包装规格)
    - [4.3.5 批量删除包装规格](#435-批量删除包装规格)
  - [4.4 包装套包管理](#44-包装套包管理)
    - [4.4.1 查询包装套包](#441-查询包装套包)
    - [4.4.2 新增包装套包](#442-新增包装套包)
    - [4.4.3 批量新增包装套包](#443-批量新增包装套包)
    - [4.4.4 修改包装套包](#444-修改包装套包)
    - [4.4.5 批量修改包装套包](#445-批量修改包装套包)
    - [4.4.6 删除包装套包](#446-删除包装套包)
    - [4.4.7 批量删除包装套包](#447-批量删除包装套包)
  - [4.5 包装规则管理](#45-包装规则管理)
    - [4.5.1 查询包装规则](#451-查询包装规则)
    - [4.5.2 新增包装规则](#452-新增包装规则)
    - [4.5.3 修改包装规则](#453-修改包装规则)
    - [4.5.4 删除包装规则](#454-删除包装规则)
    - [4.5.5 批量删除包装规则](#455-批量删除包装规则)
    - [4.5.6 查询包装规则配置](#456-查询包装规则配置)
    - [4.5.7 保存包装规则配置](#457-保存包装规则配置)
  - [4.6 物料包装关系管理](#46-物料包装关系管理)
    - [4.6.1 查询物料包装关系](#461-查询物料包装关系)
    - [4.6.2 新增物料包装关系](#462-新增物料包装关系)
    - [4.6.3 修改物料包装关系](#463-修改物料包装关系)
    - [4.6.4 删除物料包装关系](#464-删除物料包装关系)
    - [4.6.5 批量删除物料包装关系](#465-批量删除物料包装关系)
- [5. 前端对接注意事项](#5-前端对接注意事项)

---

## 1. 需求背景

| 项目         | 内容                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **需求名称** | 包装模块维护（包装类型 + 包装层级 + 包装规格 + 包装套包 + 包装规则）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **需求描述** | 1. 包装类型：提供包装类型的增删改查功能，支持维护包装类型编码、名称、是否为循环包装、描述等信息<br>2. 包装层级：提供包装层级的增删改查功能，支持层级关系图展示，层级序号从1开始递增，上级层级只能是序号比自己小的层级，构建嵌套包装关系<br>3. 包装规格：提供包装规格的增删改查功能，支持维护规格编码、名称、关联包装类型和层级、条码规则、尺寸重量、容量堆叠等信息<br>4. 包装套包：提供包装套包的增删改查功能，支持维护套包编码、名称、主件物料、子件列表等信息，子件列表以 JSON 数组存储<br>5. 包装规则：提供包装规则的增删改查功能，支持维护规则编码、名称、启停状态、包装关系明细（层级+规格+数量+包装方式），以及规则配置（混箱规则、标签打印规则、封箱触发规则、异常处理规则）<br>6. 物料包装关系：提供物料包装关系的增删改查功能，支持维护物料编码、名称、包装规则编码、名称及包装关系明细（层级+规格+数量+单位+包装类型+标签模板），以物料编码和包装规则编码作为唯一标识 |
| **涉及模块** | 基础数据中心 — 包装类型管理 / 包装层级管理 / 包装规格管理 / 包装套包管理 / 包装规则管理 / 物料包装关系管理                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **后端开发** | （待填写）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **前端开发** | （待填写）                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| **文档版本** | v1.5                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| **更新日期** | 2026-05-26                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容                                                                              |
| ---- | ---------- | ------ | ------------------------------------------------------------------------------------- |
| v1.0 | 2026-05-25 | -      | 初始版本，包含包装类型 + 包装层级                                                     |
| v1.1 | 2026-05-25 | -      | 新增包装规格管理                                                                      |
| v1.2 | 2026-05-26 | -      | 新增包装套包管理                                                                      |
| v1.3 | 2026-05-26 | -      | 新增包装规则管理                                                                      |
| v1.4 | 2026-05-26 | -      | 包装规格新增 Unit 字段；包装规则明细新增 Unit、PackagingTypeName 字段（后端自动填充） |
| v1.5 | 2026-05-26 | -      | 新增物料包装关系管理                                                                  |

---

## 2. 接口约定（通用）

| 项目             | 说明                                                           |
| ---------------- | -------------------------------------------------------------- |
| **Base URL**     | `http://{host}:8282`（生产）/ `https://localhost:7298`（开发） |
| **接口风格**     | 统一 `POST`                                                    |
| **路由规则**     | `/{Controller名去掉Controller后缀}/{方法名去掉Async后缀}`      |
| **Content-Type** | `application/json`                                             |
| **认证方式**     | 请求头 `Authorization: Bearer {token}`                         |
| **字段命名**     | 大驼峰 PascalCase，大小写敏感                                  |
| **Swagger**      | 启动后访问根路径 `/`                                           |

### 2.1 通用响应结构

项目中有两种响应结构：

**DataResult&lt;T&gt;** — 用于查询接口，包含分页和数据：

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

**OpResult** — 用于新增、修改、删除等写操作，结构更精简：

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

| 字段    | 类型    | 说明         |
| ------- | ------- | ------------ |
| Success | bool    | 操作是否成功 |
| Code    | string? | 业务状态码   |
| Message | string  | 操作信息描述 |

### 2.2 通用查询参数

| 字段        | 类型   | 说明                          |
| ----------- | ------ | ----------------------------- |
| IsPaged     | bool   | 是否启用分页，前端默认 true   |
| PageSize    | int    | 每页条数，默认 10，最大 10000 |
| PageIndex   | int    | 页码，从 1 开始               |
| CompanyCode | string | 公司编码（精确查询）          |
| FactoryCode | string | 工厂编码（精确查询）          |

> **查询规则**（适用于所有 string 类型的查询字段）：
>
> 1. **模糊查询**（默认）：直接传值，如 {"TypeName": "纸箱"}，模糊匹配包含"纸箱"的数据
> 2. **精确查询**：值前加 \$ 前缀，如 {"TypeCode": "$PT001"} 只匹配 PT001，不匹配 PT0011
> 3. **多值匹配**：多个值用 [] 连接，如 {"TypeCode": "PT001[]PT002[]PT003"}，后端按 [] 分割后做 Contains 匹配
> 4. **时间范围查询**：字段名以 Range 结尾且类型为 DateTime[] 时，传入两个元素的数组，第一个为开始时间，第二个为结束时间

### 2.3 通用数据字段

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

### 2.4 标准 CRUD 接口模式

| 操作     | 方法名模式                  | 入参                                  | 出参                            |
| -------- | --------------------------- | ------------------------------------- | ------------------------------- |
| 批量查询 | `Get{Entity}AutoQueryDatas` | `{Entity}QueryDto`                    | `DataResult<List<{Entity}Dto>>` |
| 新增     | `Store{Entity}Data`         | `{Entity}Dto`                         | `OpResult`                      |
| 批量新增 | `StoreBatch{Entity}Datas`   | `List<{Entity}Dto>`                   | `OpResult`                      |
| 更新     | `Update{Entity}Data`        | `{Entity}Dto`（含 NeedUpdateFields）  | `OpResult`                      |
| 批量更新 | `UpdateBatch{Entity}Datas`  | `List<{Entity}Dto>`                   | `OpResult`                      |
| 删除     | `Remove{Entity}Data`        | `{Entity}Dto`（传完整对象）           | `OpResult`                      |
| 批量删除 | `RemoveBatch{Entity}Datas`  | `List<{Entity}Dto>`（每项传完整对象） | `OpResult`                      |

> URL 拼接规则: /{Controller名去掉Controller后缀}/{方法名去掉Async后缀}

---

## 3. 本次需求接口清单

### 3.1 包装类型

| 序号 | 接口名称         | HTTP方法 | URL                                                | 说明                 |
| ---- | ---------------- | -------- | -------------------------------------------------- | -------------------- |
| 1    | 查询包装类型     | POST     | `/PackagingTypeApi/GetPackagingTypeAutoQueryDatas` | 分页查询包装类型列表 |
| 2    | 新增包装类型     | POST     | `/PackagingTypeApi/StorePackagingTypeData`         | 新增包装类型         |
| 3    | 修改包装类型     | POST     | `/PackagingTypeApi/UpdatePackagingTypeData`        | 修改包装类型信息     |
| 4    | 删除包装类型     | POST     | `/PackagingTypeApi/RemovePackagingTypeData`        | 删除单条包装类型     |
| 5    | 批量删除包装类型 | POST     | `/PackagingTypeApi/RemoveBatchPackagingTypeDatas`  | 批量删除包装类型     |

### 3.2 包装层级

| 序号 | 接口名称           | HTTP方法 | URL                                                  | 说明                           |
| ---- | ------------------ | -------- | ---------------------------------------------------- | ------------------------------ |
| 6    | 查询包装层级       | POST     | `/PackagingLevelApi/GetPackagingLevelAutoQueryDatas` | 分页查询包装层级列表           |
| 7    | 查看包装层级关系图 | POST     | `/PackagingLevelApi/GetPackagingLevelTree`           | 返回树形嵌套结构，展示层级关系 |
| 8    | 新增包装层级       | POST     | `/PackagingLevelApi/StorePackagingLevelData`         | 新增包装层级                   |
| 9    | 修改包装层级       | POST     | `/PackagingLevelApi/UpdatePackagingLevelData`        | 修改包装层级信息               |
| 10   | 删除包装层级       | POST     | `/PackagingLevelApi/RemovePackagingLevelData`        | 删除单条包装层级               |
| 11   | 批量删除包装层级   | POST     | `/PackagingLevelApi/RemoveBatchPackagingLevelDatas`  | 批量删除包装层级               |

### 3.3 包装规格

| 序号 | 接口名称         | HTTP方法 | URL                                                | 说明                 |
| ---- | ---------------- | -------- | -------------------------------------------------- | -------------------- |
| 12   | 查询包装规格     | POST     | `/PackagingSpecApi/GetPackagingSpecAutoQueryDatas` | 分页查询包装规格列表 |
| 13   | 新增包装规格     | POST     | `/PackagingSpecApi/StorePackagingSpecData`         | 新增包装规格         |
| 14   | 修改包装规格     | POST     | `/PackagingSpecApi/UpdatePackagingSpecData`        | 修改包装规格信息     |
| 15   | 删除包装规格     | POST     | `/PackagingSpecApi/RemovePackagingSpecData`        | 删除单条包装规格     |
| 16   | 批量删除包装规格 | POST     | `/PackagingSpecApi/RemoveBatchPackagingSpecDatas`  | 批量删除包装规格     |

### 3.4 包装套包

| 序号 | 接口名称         | HTTP方法 | URL                                              | 说明                 |
| ---- | ---------------- | -------- | ------------------------------------------------ | -------------------- |
| 17   | 查询包装套包     | POST     | `/PackagingKitApi/GetPackagingKitAutoQueryDatas` | 分页查询包装套包列表 |
| 18   | 新增包装套包     | POST     | `/PackagingKitApi/StorePackagingKitData`         | 新增包装套包         |
| 19   | 批量新增包装套包 | POST     | `/PackagingKitApi/StoreBatchPackagingKitDatas`   | 批量新增包装套包     |
| 20   | 修改包装套包     | POST     | `/PackagingKitApi/UpdatePackagingKitData`        | 修改包装套包信息     |
| 21   | 批量修改包装套包 | POST     | `/PackagingKitApi/UpdateBatchPackagingKitDatas`  | 批量修改包装套包     |
| 22   | 删除包装套包     | POST     | `/PackagingKitApi/RemovePackagingKitData`        | 删除单条包装套包     |
| 23   | 批量删除包装套包 | POST     | `/PackagingKitApi/RemoveBatchPackagingKitDatas`  | 批量删除包装套包     |

### 3.5 包装规则

| 序号 | 接口名称         | HTTP方法 | URL                                                  | 说明                       |
| ---- | ---------------- | -------- | ---------------------------------------------------- | -------------------------- |
| 24   | 查询包装规则     | POST     | `/PackagingRuleApi/GetPackagingRuleAutoQueryDatas`   | 分页查询包装规则列表       |
| 25   | 新增包装规则     | POST     | `/PackagingRuleApi/StorePackagingRuleData`           | 新增包装规则（含明细校验） |
| 26   | 修改包装规则     | POST     | `/PackagingRuleApi/UpdatePackagingRuleData`          | 修改包装规则信息           |
| 27   | 删除包装规则     | POST     | `/PackagingRuleApi/RemovePackagingRuleData`          | 删除单条包装规则           |
| 28   | 批量删除包装规则 | POST     | `/PackagingRuleApi/RemoveBatchPackagingRuleDatas`    | 批量删除包装规则           |
| 29   | 查询包装规则配置 | POST     | `/PackagingRuleApi/GetPackagingRuleConfigByRuleCode` | 按规则编码查询规则配置     |
| 30   | 保存包装规则配置 | POST     | `/PackagingRuleApi/StorePackagingRuleConfig`         | 按规则编码全量覆盖配置     |

### 3.6 物料包装关系

| 序号 | 接口名称             | HTTP方法 | URL                                                                        | 说明                     |
| ---- | -------------------- | -------- | -------------------------------------------------------------------------- | ------------------------ |
| 31   | 查询物料包装关系     | POST     | `/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas` | 分页查询物料包装关系列表 |
| 32   | 新增物料包装关系     | POST     | `/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData`         | 新增物料包装关系         |
| 33   | 修改物料包装关系     | POST     | `/MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData`        | 修改物料包装关系信息     |
| 34   | 删除物料包装关系     | POST     | `/MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData`        | 删除单条物料包装关系     |
| 35   | 批量删除物料包装关系 | POST     | `/MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas`  | 批量删除物料包装关系     |

---

## 4. 接口详细说明

### 4.1 包装类型管理

> 控制器：`PackagingTypeApiController`

#### 4.1.1 查询包装类型

| 项目     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| **URL**  | `POST /PackagingTypeApi/GetPackagingTypeAutoQueryDatas` |
| **认证** | 需要                                                    |

**入参 — PackagingTypeQueryDto**

| 字段         | 类型    | 必填 | 说明                |
| ------------ | ------- | ---- | ------------------- |
| TypeCode     | string? | 否   | 类型编码            |
| TypeName     | string? | 否   | 类型名称            |
| IsRecyclable | bool?   | 否   | 是否为循环包装      |
| Description  | string? | 否   | 描述                |
| IsPaged      | bool    | 否   | 是否分页，默认 true |
| PageSize     | int     | 否   | 每页条数，默认 10   |
| PageIndex    | int     | 否   | 页码，从 1 开始     |
| CompanyCode  | string  | 是   | 公司编码            |
| FactoryCode  | string  | 是   | 工厂编码            |

**出参 — DataResult<List<PackagingTypeDto>>**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "TypeCode": "PT001",
      "TypeName": "纸箱包装",
      "IsRecyclable": false,
      "Description": "标准纸箱包装类型",
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserId": 1,
      "CreatorUserName": "admin",
      "CreatorUserRealName": "管理员",
      "CreationTime": "2026-05-25T10:00:00",
      "LastModifierUserId": null,
      "LastModifierUserName": null,
      "LastModifierUserRealName": null,
      "LastModificationTime": null,
      "Remark": ""
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

| 字段                     | 类型   | 说明           |
| ------------------------ | ------ | -------------- |
| Id                       | int    | 数据主键       |
| TypeCode                 | string | 类型编码       |
| TypeName                 | string | 类型名称       |
| IsRecyclable             | bool   | 是否为循环包装 |
| Description              | string | 描述           |
| _(通用字段省略，见 2.3)_ |        |                |

**请求示例**

```json
{
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1,
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

---

#### 4.1.2 新增包装类型

| 项目     | 说明                                            |
| -------- | ----------------------------------------------- |
| **URL**  | `POST /PackagingTypeApi/StorePackagingTypeData` |
| **认证** | 需要                                            |

**入参 — PackagingTypeDto**

| 字段         | 类型    | 必填 | 说明           |
| ------------ | ------- | ---- | -------------- |
| TypeCode     | string  | 是   | 类型编码       |
| TypeName     | string  | 是   | 类型名称       |
| IsRecyclable | bool    | 是   | 是否为循环包装 |
| Description  | string? | 否   | 描述           |
| CompanyCode  | string  | 是   | 公司编码       |
| FactoryCode  | string  | 是   | 工厂编码       |
| Remark       | string? | 否   | 备注           |

**请求示例**

```json
{
  "TypeCode": "PT001",
  "TypeName": "纸箱包装",
  "IsRecyclable": false,
  "Description": "标准纸箱包装类型",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": ""
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

---

#### 4.1.3 修改包装类型

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingTypeApi/UpdatePackagingTypeData` |
| **认证** | 需要                                             |

**入参 — PackagingTypeDto**

```json
{
  "NeedUpdateFields": {
    "Id": 1,
    "TypeName": "循环塑料箱",
    "IsRecyclable": true,
    "Description": "可循环使用的塑料包装箱"
  }
}
```

> NeedUpdateFields：仅传入需要修改的字段 + Id

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 修改数据成功！"
}
```

---

#### 4.1.4 删除包装类型

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingTypeApi/RemovePackagingTypeData` |
| **认证** | 需要                                             |

**入参 — PackagingTypeDto**

> 将查询接口返回的完整 DTO 对象直接传入，不要只传 Id。

```json
{
  "Id": 1,
  "TypeCode": "PT001",
  "TypeName": "纸箱包装",
  "IsRecyclable": false,
  "Description": "标准纸箱包装类型",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.1.5 批量删除包装类型

| 项目     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| **URL**  | `POST /PackagingTypeApi/RemoveBatchPackagingTypeDatas` |
| **认证** | 需要                                                   |

**入参 — List<PackagingTypeDto>**

> 每项传完整对象，不要只传 Id

```json
[
  {
    "Id": 1,
    "TypeCode": "PT001",
    "TypeName": "纸箱包装",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "Id": 2,
    "TypeCode": "PT002",
    "TypeName": "塑料箱",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量删除数据成功！"
}
```

---

### 4.2 包装层级管理

> 控制器：`PackagingLevelApiController`

#### 4.2.1 查询包装层级

| 项目     | 说明                                                      |
| -------- | --------------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/GetPackagingLevelAutoQueryDatas` |
| **认证** | 需要                                                      |

**入参 — PackagingLevelQueryDto**

| 字段            | 类型    | 必填 | 说明                |
| --------------- | ------- | ---- | ------------------- |
| LevelCode       | string? | 否   | 层级编码            |
| LevelName       | string? | 否   | 层级名称            |
| LevelSequence   | int?    | 否   | 层级序号            |
| ParentLevelCode | string? | 否   | 上级层级编码        |
| IsPaged         | bool    | 否   | 是否分页，默认 true |
| PageSize        | int     | 否   | 每页条数，默认 10   |
| PageIndex       | int     | 否   | 页码，从 1 开始     |
| CompanyCode     | string  | 是   | 公司编码            |
| FactoryCode     | string  | 是   | 工厂编码            |

**出参 — DataResult<List<PackagingLevelDto>>**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "LevelCode": "LV001",
      "LevelSequence": 1,
      "LevelName": "单品",
      "ParentLevelCode": null,
      "ParentLevelName": null,
      "Description": "最小包装单元",
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserId": 1,
      "CreatorUserName": "admin",
      "CreatorUserRealName": "管理员",
      "CreationTime": "2026-05-25T10:00:00",
      "LastModifierUserId": null,
      "LastModifierUserName": null,
      "LastModifierUserRealName": null,
      "LastModificationTime": null,
      "Remark": ""
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

| 字段                     | 类型    | 说明                            |
| ------------------------ | ------- | ------------------------------- |
| Id                       | int     | 数据主键                        |
| LevelCode                | string  | 层级编码                        |
| LevelSequence            | int     | 层级序号，>= 1，越大表示越外层  |
| LevelName                | string  | 层级名称                        |
| ParentLevelCode          | string? | 上级层级编码，层级序号为1时为空 |
| ParentLevelName          | string? | 上级层级名称                    |
| Description              | string? | 描述                            |
| _(通用字段省略，见 2.3)_ |         |                                 |

**请求示例**

```json
{
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1,
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

---

#### 4.2.2 查看包装层级关系图

| 项目     | 说明                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/GetPackagingLevelTree`                                                                  |
| **认证** | 需要                                                                                                             |
| **说明** | 返回树形嵌套结构，按层级序号从小到大构建父子关系。无父级的为根节点（第一层），子节点嵌套在 Children 中，递归展开 |

**入参**

无业务参数，仅需认证 Token。后端自动按当前公司/工厂数据返回。

**出参 — List<PackagingLevelTreeDto>**

```json
[
  {
    "Id": 1,
    "LevelCode": "LV001",
    "LevelSequence": 1,
    "LevelName": "单品",
    "ParentLevelCode": null,
    "ParentLevelName": null,
    "Description": "最小包装单元",
    "Children": [
      {
        "Id": 2,
        "LevelCode": "LV002",
        "LevelSequence": 2,
        "LevelName": "小盒",
        "ParentLevelCode": "LV001",
        "ParentLevelName": "单品",
        "Description": "6个单品装一小盒",
        "Children": [
          {
            "Id": 3,
            "LevelCode": "LV003",
            "LevelSequence": 3,
            "LevelName": "中箱",
            "ParentLevelCode": "LV002",
            "ParentLevelName": "小盒",
            "Description": "4小盒装一中箱",
            "Children": []
          }
        ]
      },
      {
        "Id": 4,
        "LevelCode": "LV004",
        "LevelSequence": 2,
        "LevelName": "塑料袋",
        "ParentLevelCode": "LV001",
        "ParentLevelName": "单品",
        "Description": "12个单品装一塑料袋",
        "Children": []
      }
    ]
  }
]
```

| 字段            | 类型                        | 说明                                       |
| --------------- | --------------------------- | ------------------------------------------ |
| Id              | int                         | 数据主键                                   |
| LevelCode       | string                      | 层级编码                                   |
| LevelSequence   | int                         | 层级序号                                   |
| LevelName       | string                      | 层级名称                                   |
| ParentLevelCode | string?                     | 上级层级编码                               |
| ParentLevelName | string?                     | 上级层级名称                               |
| Description     | string?                     | 描述                                       |
| Children        | List<PackagingLevelTreeDto> | 子节点列表（递归结构），无子节点时为空数组 |

**业务规则**

- 层级序号从 1 开始，越大表示包装越外层
- 序号为 1 的层级为根节点，无上级层级
- 上级层级只能是序号比自己小的层级
- 同级可存在多条数据（如序号2同时有"小盒"和"塑料袋"）
- 关系图按层级序号从小到大排列，Children 同理

---

#### 4.2.3 新增包装层级

| 项目     | 说明                                              |
| -------- | ------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/StorePackagingLevelData` |
| **认证** | 需要                                              |

**入参 — PackagingLevelDto**

| 字段            | 类型    | 必填 | 说明                          |
| --------------- | ------- | ---- | ----------------------------- |
| LevelCode       | string  | 是   | 层级编码                      |
| LevelSequence   | int     | 是   | 层级序号，必须 >= 1           |
| LevelName       | string  | 是   | 层级名称                      |
| ParentLevelCode | string? | 否   | 上级层级编码，序号为1时不可填 |
| ParentLevelName | string? | 否   | 上级层级名称                  |
| Description     | string? | 否   | 描述                          |
| CompanyCode     | string  | 是   | 公司编码                      |
| FactoryCode     | string  | 是   | 工厂编码                      |
| Remark          | string? | 否   | 备注                          |

**请求示例**

```json
{
  "LevelCode": "LV002",
  "LevelSequence": 2,
  "LevelName": "小盒",
  "ParentLevelCode": "LV001",
  "ParentLevelName": "单品",
  "Description": "6个单品装一小盒",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": ""
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

**校验规则**

| 规则                                       | 错误提示                                 |
| ------------------------------------------ | ---------------------------------------- |
| LevelSequence < 1                          | 层级序号必须大于等于1                    |
| LevelSequence = 1 且填写了 ParentLevelCode | 层级序号为1的层级不能设置上级层级        |
| ParentLevelCode 填写的编码不存在           | 上级层级编码「xxx」不存在                |
| 上级层级的序号 >= 当前层级序号             | 上级层级的序号(x)必须小于当前层级序号(y) |

---

#### 4.2.4 修改包装层级

| 项目     | 说明                                               |
| -------- | -------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/UpdatePackagingLevelData` |
| **认证** | 需要                                               |

**入参 — PackagingLevelDto**

```json
{
  "NeedUpdateFields": {
    "Id": 1,
    "LevelName": "单件",
    "Description": "单个产品独立包装"
  }
}
```

> NeedUpdateFields：仅传入需要修改的字段 + Id。校验规则同新增。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 修改数据成功！"
}
```

---

#### 4.2.5 删除包装层级

| 项目     | 说明                                               |
| -------- | -------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/RemovePackagingLevelData` |
| **认证** | 需要                                               |

**入参 — PackagingLevelDto**

> 将查询接口返回的完整 DTO 对象直接传入，不要只传 Id。

```json
{
  "Id": 1,
  "LevelCode": "LV001",
  "LevelSequence": 1,
  "LevelName": "单品",
  "ParentLevelCode": null,
  "ParentLevelName": null,
  "Description": "最小包装单元",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.2.6 批量删除包装层级

| 项目     | 说明                                                     |
| -------- | -------------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/RemoveBatchPackagingLevelDatas` |
| **认证** | 需要                                                     |

**入参 — List<PackagingLevelDto>**

> 每项传完整对象，不要只传 Id

```json
[
  {
    "Id": 2,
    "LevelCode": "LV002",
    "LevelName": "小盒",
    "LevelSequence": 2,
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "Id": 3,
    "LevelCode": "LV003",
    "LevelName": "中箱",
    "LevelSequence": 3,
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量删除数据成功！"
}
```

---

### 4.3 包装规格管理

> 控制器：`PackagingSpecApiController`

#### 4.3.1 查询包装规格

| 项目     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| **URL**  | `POST /PackagingSpecApi/GetPackagingSpecAutoQueryDatas` |
| **认证** | 需要                                                    |

**入参 — PackagingSpecQueryDto**

| 字段               | 类型     | 必填 | 说明                |
| ------------------ | -------- | ---- | ------------------- |
| SpecCode           | string?  | 否   | 规格编码            |
| SpecName           | string?  | 否   | 规格名称            |
| PackagingTypeCode  | string?  | 否   | 包装类型编码        |
| PackagingTypeName  | string?  | 否   | 包装类型名称        |
| PackagingLevelCode | string?  | 否   | 包装层级编码        |
| PackagingLevelName | string?  | 否   | 包装层级名称        |
| BarcodeRuleCode    | string?  | 否   | 条码规则编码        |
| BarcodeRuleName    | string?  | 否   | 条码规则名称        |
| Length             | decimal? | 否   | 长(cm)              |
| Width              | decimal? | 否   | 宽(cm)              |
| Height             | decimal? | 否   | 高(cm)              |
| MaxWeight          | decimal? | 否   | 最大承重(kg)        |
| GrossWeight        | decimal? | 否   | 毛重(kg)            |
| TareWeight         | decimal? | 否   | 皮重(kg)            |
| Volume             | decimal? | 否   | 体积(m³)            |
| StandardCapacity   | int?     | 否   | 标准容量            |
| StackLimit         | int?     | 否   | 堆叠上限            |
| IsEnabled          | bool?    | 否   | 是否启用            |
| Unit               | string?  | 否   | 单位                |
| IsPaged            | bool     | 否   | 是否分页，默认 true |
| PageSize           | int      | 否   | 每页条数，默认 10   |
| PageIndex          | int      | 否   | 页码，从 1 开始     |
| CompanyCode        | string   | 是   | 公司编码            |
| FactoryCode        | string   | 是   | 工厂编码            |

**出参 — DataResult<List<PackagingSpecDto>>**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "SpecCode": "PS001",
      "SpecName": "标准纸箱规格",
      "PackagingTypeCode": "PT001",
      "PackagingTypeName": "纸箱包装",
      "PackagingLevelCode": "LV002",
      "PackagingLevelName": "小盒",
      "BarcodeRuleCode": "BCR001",
      "BarcodeRuleName": "标准条码规则",
      "Length": 30.5,
      "Width": 20.0,
      "Height": 15.0,
      "MaxWeight": 25.0,
      "GrossWeight": 0.5,
      "TareWeight": 0.3,
      "Volume": 0.00915,
      "StandardCapacity": 50,
      "StackLimit": 10,
      "IsEnabled": true,
      "Unit": "个",
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserId": 1,
      "CreatorUserName": "admin",
      "CreatorUserRealName": "管理员",
      "CreationTime": "2026-05-25T10:00:00",
      "LastModifierUserId": null,
      "LastModifierUserName": null,
      "LastModifierUserRealName": null,
      "LastModificationTime": null,
      "Remark": ""
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

| 字段                     | 类型    | 说明         |
| ------------------------ | ------- | ------------ |
| Id                       | int     | 数据主键     |
| SpecCode                 | string  | 规格编码     |
| SpecName                 | string  | 规格名称     |
| PackagingTypeCode        | string  | 包装类型编码 |
| PackagingTypeName        | string  | 包装类型名称 |
| PackagingLevelCode       | string  | 包装层级编码 |
| PackagingLevelName       | string  | 包装层级名称 |
| BarcodeRuleCode          | string  | 条码规则编码 |
| BarcodeRuleName          | string  | 条码规则名称 |
| Length                   | decimal | 长(cm)       |
| Width                    | decimal | 宽(cm)       |
| Height                   | decimal | 高(cm)       |
| MaxWeight                | decimal | 最大承重(kg) |
| GrossWeight              | decimal | 毛重(kg)     |
| TareWeight               | decimal | 皮重(kg)     |
| Volume                   | decimal | 体积(m³)     |
| StandardCapacity         | int     | 标准容量     |
| StackLimit               | int     | 堆叠上限     |
| IsEnabled                | bool    | 是否启用     |
| Unit                     | string  | 单位         |
| _(通用字段省略，见 2.3)_ |         |              |

**请求示例**

```json
{
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1,
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

---

#### 4.3.2 新增包装规格

| 项目     | 说明                                            |
| -------- | ----------------------------------------------- |
| **URL**  | `POST /PackagingSpecApi/StorePackagingSpecData` |
| **认证** | 需要                                            |

**入参 — PackagingSpecDto**

| 字段               | 类型    | 必填 | 说明         |
| ------------------ | ------- | ---- | ------------ |
| SpecCode           | string  | 是   | 规格编码     |
| SpecName           | string  | 是   | 规格名称     |
| PackagingTypeCode  | string  | 是   | 包装类型编码 |
| PackagingTypeName  | string  | 是   | 包装类型名称 |
| PackagingLevelCode | string  | 是   | 包装层级编码 |
| PackagingLevelName | string  | 是   | 包装层级名称 |
| BarcodeRuleCode    | string  | 是   | 条码规则编码 |
| BarcodeRuleName    | string  | 是   | 条码规则名称 |
| Length             | decimal | 是   | 长(cm)       |
| Width              | decimal | 是   | 宽(cm)       |
| Height             | decimal | 是   | 高(cm)       |
| MaxWeight          | decimal | 是   | 最大承重(kg) |
| GrossWeight        | decimal | 是   | 毛重(kg)     |
| TareWeight         | decimal | 是   | 皮重(kg)     |
| Volume             | decimal | 是   | 体积(m³)     |
| StandardCapacity   | int     | 是   | 标准容量     |
| StackLimit         | int     | 是   | 堆叠上限     |
| IsEnabled          | bool    | 是   | 是否启用     |
| Unit               | string  | 是   | 单位         |
| CompanyCode        | string  | 是   | 公司编码     |
| FactoryCode        | string  | 是   | 工厂编码     |
| Remark             | string? | 否   | 备注         |

**请求示例**

```json
{
  "SpecCode": "PS001",
  "SpecName": "标准纸箱规格",
  "PackagingTypeCode": "PT001",
  "PackagingTypeName": "纸箱包装",
  "PackagingLevelCode": "LV002",
  "PackagingLevelName": "小盒",
  "BarcodeRuleCode": "BCR001",
  "BarcodeRuleName": "标准条码规则",
  "Length": 30.5,
  "Width": 20.0,
  "Height": 15.0,
  "MaxWeight": 25.0,
  "GrossWeight": 0.5,
  "TareWeight": 0.3,
  "Volume": 0.00915,
  "StandardCapacity": 50,
  "StackLimit": 10,
  "IsEnabled": true,
  "Unit": "个",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": ""
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

---

#### 4.3.3 修改包装规格

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingSpecApi/UpdatePackagingSpecData` |
| **认证** | 需要                                             |

**入参 — PackagingSpecDto**

```json
{
  "NeedUpdateFields": {
    "Id": 1,
    "SpecName": "新版纸箱规格",
    "Length": 35.0,
    "Width": 22.0,
    "Height": 18.0,
    "Volume": 0.01386,
    "MaxWeight": 30.0
  }
}
```

> NeedUpdateFields：仅传入需要修改的字段 + Id

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 修改数据成功！"
}
```

---

#### 4.3.4 删除包装规格

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingSpecApi/RemovePackagingSpecData` |
| **认证** | 需要                                             |

**入参 — PackagingSpecDto**

> 将查询接口返回的完整 DTO 对象直接传入，不要只传 Id。

```json
{
  "Id": 1,
  "SpecCode": "PS001",
  "SpecName": "标准纸箱规格",
  "PackagingTypeCode": "PT001",
  "PackagingTypeName": "纸箱包装",
  "PackagingLevelCode": "LV002",
  "PackagingLevelName": "小盒",
  "BarcodeRuleCode": "BCR001",
  "BarcodeRuleName": "标准条码规则",
  "Length": 30.5,
  "Width": 20.0,
  "Height": 15.0,
  "MaxWeight": 25.0,
  "GrossWeight": 0.5,
  "TareWeight": 0.3,
  "Volume": 0.00915,
  "StandardCapacity": 50,
  "StackLimit": 10,
  "IsEnabled": true,
  "Unit": "个",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.3.5 批量删除包装规格

| 项目     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| **URL**  | `POST /PackagingSpecApi/RemoveBatchPackagingSpecDatas` |
| **认证** | 需要                                                   |

**入参 — List<PackagingSpecDto>**

> 每项传完整对象，不要只传 Id

```json
[
  {
    "Id": 1,
    "SpecCode": "PS001",
    "SpecName": "标准纸箱规格",
    "PackagingTypeCode": "PT001",
    "PackagingTypeName": "纸箱包装",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "Id": 2,
    "SpecCode": "PS002",
    "SpecName": "大号塑料箱规格",
    "PackagingTypeCode": "PT002",
    "PackagingTypeName": "塑料箱",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量删除数据成功！"
}
```

---

### 4.4 包装套包管理

> 控制器：`PackagingKitApiController`

#### 4.4.1 查询包装套包

| 项目     | 说明                                                  |
| -------- | ----------------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/GetPackagingKitAutoQueryDatas` |
| **认证** | 需要                                                  |

**入参 — PackagingKitQueryDto**

| 字段             | 类型    | 必填 | 说明                |
| ---------------- | ------- | ---- | ------------------- |
| KitCode          | string? | 否   | 套包编码            |
| KitName          | string? | 否   | 套包名称            |
| MainMaterialCode | string? | 否   | 主件物料编号        |
| MainMaterialName | string? | 否   | 主件物料名称        |
| Unit             | string? | 否   | 单位                |
| IsVirtualMain    | bool?   | 否   | 是否为虚拟主件      |
| IsPaged          | bool    | 否   | 是否分页，默认 true |
| PageSize         | int     | 否   | 每页条数，默认 10   |
| PageIndex        | int     | 否   | 页码，从 1 开始     |
| CompanyCode      | string  | 是   | 公司编码            |
| FactoryCode      | string  | 是   | 工厂编码            |

**出参 — DataResult<List<PackagingKitDto>>**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "KitCode": "PK001",
      "KitName": "标准套包A",
      "MainMaterialCode": "MAT001",
      "MainMaterialName": "成品物料A",
      "Unit": "套",
      "IsVirtualMain": false,
      "ChildCount": 3,
      "Children": [
        {
          "Code": "CHILD001",
          "Name": "子件A",
          "Quantity": 2,
          "Unit": "个"
        },
        {
          "Code": "CHILD002",
          "Name": "子件B",
          "Quantity": 1,
          "Unit": "个"
        },
        {
          "Code": "CHILD003",
          "Name": "子件C",
          "Quantity": 4,
          "Unit": "个"
        }
      ],
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserId": 1,
      "CreatorUserName": "admin",
      "CreatorUserRealName": "管理员",
      "CreationTime": "2026-05-26T10:00:00",
      "LastModifierUserId": null,
      "LastModifierUserName": null,
      "LastModifierUserRealName": null,
      "LastModificationTime": null,
      "Remark": ""
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

| 字段                     | 类型                         | 说明                                           |
| ------------------------ | ---------------------------- | ---------------------------------------------- |
| Id                       | int                          | 数据主键                                       |
| KitCode                  | string                       | 套包编码                                       |
| KitName                  | string                       | 套包名称                                       |
| MainMaterialCode         | string                       | 主件物料编号                                   |
| MainMaterialName         | string                       | 主件物料名称                                   |
| Unit                     | string                       | 单位                                           |
| IsVirtualMain            | bool                         | 是否为虚拟主件                                 |
| ChildCount               | int                          | 子件数（后端自动计算 = Children 列表的 Count） |
| Children                 | List\<PackagingKitChildDto\> | 子件列表，JSON 数组                            |
| _(通用字段省略，见 2.3)_ |                              |                                                |

**子件结构 — PackagingKitChildDto**

| 字段     | 类型   | 说明     |
| -------- | ------ | -------- |
| Code     | string | 子件编码 |
| Name     | string | 子件名称 |
| Quantity | int    | 数量     |
| Unit     | string | 单位     |

**请求示例**

```json
{
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1,
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

---

#### 4.4.2 新增包装套包

| 项目     | 说明                                          |
| -------- | --------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/StorePackagingKitData` |
| **认证** | 需要                                          |

**入参 — PackagingKitDto**

| 字段             | 类型                         | 必填 | 说明           |
| ---------------- | ---------------------------- | ---- | -------------- |
| KitCode          | string                       | 是   | 套包编码       |
| KitName          | string                       | 是   | 套包名称       |
| MainMaterialCode | string                       | 是   | 主件物料编号   |
| MainMaterialName | string                       | 是   | 主件物料名称   |
| Unit             | string                       | 是   | 单位           |
| IsVirtualMain    | bool                         | 是   | 是否为虚拟主件 |
| Children         | List\<PackagingKitChildDto\> | 是   | 子件列表       |
| CompanyCode      | string                       | 是   | 公司编码       |
| FactoryCode      | string                       | 是   | 工厂编码       |
| Remark           | string?                      | 否   | 备注           |

> ChildCount（子件数）由后端根据 `Children` 列表自动计算，前端无需传值。

**请求示例**

```json
{
  "KitCode": "PK001",
  "KitName": "标准套包A",
  "MainMaterialCode": "MAT001",
  "MainMaterialName": "成品物料A",
  "Unit": "套",
  "IsVirtualMain": false,
  "Children": [
    {
      "Code": "CHILD001",
      "Name": "子件A",
      "Quantity": 2,
      "Unit": "个"
    },
    {
      "Code": "CHILD002",
      "Name": "子件B",
      "Quantity": 1,
      "Unit": "个"
    }
  ],
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": ""
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

---

#### 4.4.3 批量新增包装套包

| 项目     | 说明                                                |
| -------- | --------------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/StoreBatchPackagingKitDatas` |
| **认证** | 需要                                                |

**入参 — List\<PackagingKitDto\>**

```json
[
  {
    "KitCode": "PK001",
    "KitName": "标准套包A",
    "MainMaterialCode": "MAT001",
    "MainMaterialName": "成品物料A",
    "Unit": "套",
    "IsVirtualMain": false,
    "Children": [
      { "Code": "CHILD001", "Name": "子件A", "Quantity": 2, "Unit": "个" }
    ],
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "KitCode": "PK002",
    "KitName": "标准套包B",
    "MainMaterialCode": "MAT002",
    "MainMaterialName": "成品物料B",
    "Unit": "套",
    "IsVirtualMain": true,
    "Children": [
      { "Code": "CHILD003", "Name": "子件C", "Quantity": 3, "Unit": "个" }
    ],
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量保存数据成功！"
}
```

---

#### 4.4.4 修改包装套包

| 项目     | 说明                                           |
| -------- | ---------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/UpdatePackagingKitData` |
| **认证** | 需要                                           |

**入参 — PackagingKitDto**

```json
{
  "NeedUpdateFields": {
    "Id": 1,
    "KitName": "标准套包A（修订版）",
    "Children": [
      { "Code": "CHILD001", "Name": "子件A", "Quantity": 3, "Unit": "个" },
      { "Code": "CHILD004", "Name": "子件D", "Quantity": 1, "Unit": "个" }
    ]
  }
}
```

> NeedUpdateFields：仅传入需要修改的字段 + Id。ChildCount 由后端自动重算。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 修改数据成功！"
}
```

---

#### 4.4.5 批量修改包装套包

| 项目     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/UpdateBatchPackagingKitDatas` |
| **认证** | 需要                                                 |

**入参 — List\<PackagingKitDto\>**

```json
[
  {
    "NeedUpdateFields": {
      "Id": 1,
      "KitName": "套包A-改"
    }
  },
  {
    "NeedUpdateFields": {
      "Id": 2,
      "IsVirtualMain": true
    }
  }
]
```

> 每项使用 NeedUpdateFields 格式，ChildCount 由后端自动重算。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量修改数据成功！"
}
```

---

#### 4.4.6 删除包装套包

| 项目     | 说明                                           |
| -------- | ---------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/RemovePackagingKitData` |
| **认证** | 需要                                           |

**入参 — PackagingKitDto**

> 将查询接口返回的完整 DTO 对象直接传入，不要只传 Id。

```json
{
  "Id": 1,
  "KitCode": "PK001",
  "KitName": "标准套包A",
  "MainMaterialCode": "MAT001",
  "MainMaterialName": "成品物料A",
  "Unit": "套",
  "IsVirtualMain": false,
  "ChildCount": 3,
  "Children": [],
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.4.7 批量删除包装套包

| 项目     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/RemoveBatchPackagingKitDatas` |
| **认证** | 需要                                                 |

**入参 — List\<PackagingKitDto\>**

> 每项传完整对象，不要只传 Id

```json
[
  {
    "Id": 1,
    "KitCode": "PK001",
    "KitName": "标准套包A",
    "MainMaterialCode": "MAT001",
    "MainMaterialName": "成品物料A",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "Id": 2,
    "KitCode": "PK002",
    "KitName": "标准套包B",
    "MainMaterialCode": "MAT002",
    "MainMaterialName": "成品物料B",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量删除数据成功！"
}
```

---

### 4.5 包装规则管理

> 控制器：`PackagingRuleApiController`

包装规则用于定义产品包装过程中需要遵守的业务规则，包括包装关系明细（层级+规格+数量+包装方式）以及规则配置（混箱规则、标签打印规则、封箱触发规则、异常处理规则）。

---

#### 4.5.1 查询包装规则

| 项目     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| **URL**  | `POST /PackagingRuleApi/GetPackagingRuleAutoQueryDatas` |
| **认证** | 需要                                                    |

**入参 — PackagingRuleQueryDto**

| 字段        | 类型    | 必填 | 说明                |
| ----------- | ------- | ---- | ------------------- |
| RuleCode    | string? | 否   | 规则编码            |
| RuleName    | string? | 否   | 规则名称            |
| IsEnabled   | bool?   | 否   | 是否启用            |
| IsDefault   | bool?   | 否   | 是否默认            |
| IsPaged     | bool    | 否   | 是否分页，默认 true |
| PageSize    | int     | 否   | 每页条数，默认 10   |
| PageIndex   | int     | 否   | 页码，从 1 开始     |
| CompanyCode | string  | 是   | 公司编码            |
| FactoryCode | string  | 是   | 工厂编码            |

**出参 — DataResult&lt;List&lt;PackagingRuleDto&gt;&gt;**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "RuleCode": "RL001",
      "RuleName": "默认包装规则",
      "IsEnabled": true,
      "IsDefault": true,
      "Details": [
        {
          "Id": 0,
          "PackagingLevelCode": "LV001",
          "PackagingLevelName": "内盒",
          "LevelSequence": 1,
          "SpecCode": "SP001",
          "SpecName": "标准纸箱",
          "StandardQuantity": 10,
          "MaxQuantity": 12,
          "PackagingMethod": "自动",
          "Unit": "个",
          "PackagingTypeName": "纸箱包装"
        }
      ],
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserName": "admin",
      "CreationTime": "2026-05-26T10:00:00",
      "Remark": ""
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

**PackagingRuleDto 字段说明**

| 字段        | 类型                               | 必填              | 说明             |
| ----------- | ---------------------------------- | ----------------- | ---------------- |
| Id          | int                                | 否(新增)/是(修改) | 数据主键         |
| RuleCode    | string                             | 是                | 规则编码         |
| RuleName    | string                             | 是                | 规则名称         |
| IsEnabled   | bool                               | 是                | 是否启用         |
| IsDefault   | bool                               | 是                | 是否默认         |
| Details     | List&lt;PackagingRuleDetailDto&gt; | 否                | 包装关系明细列表 |
| CompanyCode | string                             | 是                | 公司编码         |
| FactoryCode | string                             | 是                | 工厂编码         |
| Remark      | string                             | 否                | 备注             |

**PackagingRuleDetailDto 字段说明**

| 字段               | 类型   | 必填              | 说明                         |
| ------------------ | ------ | ----------------- | ---------------------------- |
| Id                 | int    | 否(新增)/是(修改) | 数据主键                     |
| PackagingLevelCode | string | 是                | 包装层级编码                 |
| PackagingLevelName | string | 否                | 包装层级名称（后端自动填充） |
| LevelSequence      | int    | 否                | 层级序号（后端自动填充）     |
| SpecCode           | string | 是                | 包装规格编码                 |
| SpecName           | string | 否                | 包装规格名称（后端自动填充） |
| StandardQuantity   | int    | 是                | 标准包装数量                 |
| MaxQuantity        | int    | 是                | 最大包装数量                 |
| PackagingMethod    | string | 是                | 包装方式                     |
| Unit               | string | 否                | 单位（后端自动填充）         |
| PackagingTypeName  | string | 否                | 包装类型名称（后端自动填充） |

> **注意**：`PackagingLevelName`、`LevelSequence`、`SpecName`、`Unit`、`PackagingTypeName` 由后端根据编码自动校验并填充，前端传空即可。若编码不存在，后端返回错误。

---

#### 4.5.2 新增包装规则

| 项目     | 说明                                            |
| -------- | ----------------------------------------------- |
| **URL**  | `POST /PackagingRuleApi/StorePackagingRuleData` |
| **认证** | 需要                                            |

**入参 — PackagingRuleDto**

```json
{
  "RuleCode": "RL001",
  "RuleName": "默认包装规则",
  "IsEnabled": true,
  "IsDefault": false,
  "Details": [
    {
      "PackagingLevelCode": "LV001",
      "SpecCode": "SP001",
      "StandardQuantity": 10,
      "MaxQuantity": 12,
      "PackagingMethod": "自动"
    }
  ],
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": ""
}
```

**校验规则**

| 校验项       | 说明                                                                |
| ------------ | ------------------------------------------------------------------- |
| 包装层级编码 | 必须在当前公司/工厂下存在，否则返回 `[MOM] 包装层级编码 xxx 不存在` |
| 包装规格编码 | 必须在当前公司/工厂下存在，否则返回 `[MOM] 包装规格编码 xxx 不存在` |

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

---

#### 4.5.3 修改包装规则

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingRuleApi/UpdatePackagingRuleData` |
| **认证** | 需要                                             |

**入参 — PackagingRuleDto**

```json
{
  "Id": 1,
  "RuleCode": "RL001",
  "RuleName": "默认包装规则(已修改)",
  "IsEnabled": true,
  "IsDefault": true,
  "Details": [
    {
      "Id": 101,
      "PackagingLevelCode": "LV001",
      "SpecCode": "SP001",
      "StandardQuantity": 20,
      "MaxQuantity": 24,
      "PackagingMethod": "手动"
    }
  ],
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": "测试备注"
}
```

> **注意**：修改时若传入 Details 列表，同样会触发层级和规格的校验与自动填充。若不传 Details（或传空数组），则仅更新规则主表字段。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 更新数据成功！"
}
```

---

#### 4.5.4 删除包装规则

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingRuleApi/RemovePackagingRuleData` |
| **认证** | 需要                                             |

**入参 — PackagingRuleDto**

```json
{
  "Id": 1,
  "RuleCode": "RL001",
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

> **注意**：删除时需传入完整的 PackagingRuleDto 对象，至少包含 Id、RuleCode、CompanyCode、FactoryCode。删除规则主表数据时，关联的包装关系明细也会一并删除。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.5.5 批量删除包装规则

| 项目     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| **URL**  | `POST /PackagingRuleApi/RemoveBatchPackagingRuleDatas` |
| **认证** | 需要                                                   |

**入参 — List&lt;PackagingRuleDto&gt;**

```json
[
  {
    "Id": 1,
    "RuleCode": "RL001",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "Id": 2,
    "RuleCode": "RL002",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量删除数据成功！"
}
```

---

#### 4.5.6 查询包装规则配置

| 项目     | 说明                                                      |
| -------- | --------------------------------------------------------- |
| **URL**  | `POST /PackagingRuleApi/GetPackagingRuleConfigByRuleCode` |
| **认证** | 需要                                                      |

**入参 — PackagingRuleConfigQueryDto**

| 字段        | 类型   | 必填 | 说明                |
| ----------- | ------ | ---- | ------------------- |
| RuleCode    | string | 是   | 规则编码            |
| IsPaged     | bool   | 否   | 是否分页，默认 true |
| PageSize    | int    | 否   | 每页条数，默认 10   |
| PageIndex   | int    | 否   | 页码，从 1 开始     |
| CompanyCode | string | 是   | 公司编码            |
| FactoryCode | string | 是   | 工厂编码            |

**出参 — DataResult&lt;List&lt;PackagingRuleConfigDto&gt;&gt;**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "RuleCode": "RL001",
      "MixingRule": {
        "ForbidDifferentProduct": true,
        "ForbidDifferentBatch": true,
        "ForbidDifferentWorkOrder": false,
        "ForbidDifferentProductionTask": false,
        "ForbidCrossQualityStatus": true
      },
      "LabelPrintRule": {
        "ReprintLimit": 3,
        "DefaultTemplate": "标准标签模板"
      },
      "SealingRule": {
        "TimeoutAlert": 30,
        "AutoSealOnWorkOrderComplete": true,
        "AutoSealOnTaskComplete": false,
        "AutoSealOnFullBox": true
      },
      "ExceptionRule": {
        "ForceClearOnCycleTool": false
      },
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserName": "admin",
      "CreationTime": "2026-05-26T10:00:00"
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

**PackagingRuleConfigDto 字段说明**

| 字段           | 类型               | 必填 | 说明           |
| -------------- | ------------------ | ---- | -------------- |
| Id             | int                | -    | 数据主键       |
| RuleCode       | string             | 是   | 关联的规则编码 |
| MixingRule     | MixingRuleDto?     | 否   | 混箱规则       |
| LabelPrintRule | LabelPrintRuleDto? | 否   | 标签打印规则   |
| SealingRule    | SealingRuleDto?    | 否   | 封箱触发规则   |
| ExceptionRule  | ExceptionRuleDto?  | 否   | 异常处理规则   |
| CompanyCode    | string             | 是   | 公司编码       |
| FactoryCode    | string             | 是   | 工厂编码       |

**MixingRuleDto（混箱规则）字段说明**

| 字段                          | 类型 | 必填 | 说明                 |
| ----------------------------- | ---- | ---- | -------------------- |
| ForbidDifferentProduct        | bool | 是   | 禁止不同产品混箱     |
| ForbidDifferentBatch          | bool | 是   | 禁止不同批次混箱     |
| ForbidDifferentWorkOrder      | bool | 是   | 禁止不同工单混箱     |
| ForbidDifferentProductionTask | bool | 是   | 禁止不同生产任务混箱 |
| ForbidCrossQualityStatus      | bool | 是   | 禁止跨质量状态混箱   |

**LabelPrintRuleDto（标签打印规则）字段说明**

| 字段            | 类型   | 必填 | 说明             |
| --------------- | ------ | ---- | ---------------- |
| ReprintLimit    | int    | 是   | 重复打印次数上限 |
| DefaultTemplate | string | 是   | 默认标签模板名称 |

**SealingRuleDto（封箱触发规则）字段说明**

| 字段                        | 类型 | 必填 | 说明                   |
| --------------------------- | ---- | ---- | ---------------------- |
| TimeoutAlert                | int  | 是   | 超时未封箱预警（分钟） |
| AutoSealOnWorkOrderComplete | bool | 是   | 工单完成自动封箱       |
| AutoSealOnTaskComplete      | bool | 是   | 任务完成自动封箱       |
| AutoSealOnFullBox           | bool | 是   | 满箱自动封箱           |

**ExceptionRuleDto（异常处理规则）字段说明**

| 字段                  | 类型 | 必填 | 说明             |
| --------------------- | ---- | ---- | ---------------- |
| ForceClearOnCycleTool | bool | 是   | 周转工具强制清空 |

---

#### 4.5.7 保存包装规则配置

| 项目     | 说明                                              |
| -------- | ------------------------------------------------- |
| **URL**  | `POST /PackagingRuleApi/StorePackagingRuleConfig` |
| **认证** | 需要                                              |

> **注意**：此接口按规则编码全量覆盖配置。若已存在该规则编码的配置，会先删除旧配置再插入新配置。

**入参 — PackagingRuleConfigDto**

```json
{
  "RuleCode": "RL001",
  "MixingRule": {
    "ForbidDifferentProduct": true,
    "ForbidDifferentBatch": true,
    "ForbidDifferentWorkOrder": false,
    "ForbidDifferentProductionTask": false,
    "ForbidCrossQualityStatus": true
  },
  "LabelPrintRule": {
    "ReprintLimit": 5,
    "DefaultTemplate": "标准标签模板V2"
  },
  "SealingRule": {
    "TimeoutAlert": 60,
    "AutoSealOnWorkOrderComplete": true,
    "AutoSealOnTaskComplete": true,
    "AutoSealOnFullBox": true
  },
  "ExceptionRule": {
    "ForceClearOnCycleTool": true
  },
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

> **注意**：四个规则子对象（MixingRule、LabelPrintRule、SealingRule、ExceptionRule）均为可选，不需要配置的规则可传 `null` 或不传。传入的子对象会完整覆盖对应配置。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

---

### 4.6 物料包装关系管理

> 控制器：`MaterialPackagingRelationApiController`

物料包装关系用于维护物料与包装规则之间的关联关系，包括关联的包装关系明细（层级+规格+数量+包装类型+标签打印模板等）。每条记录以物料编码和包装规则编码作为唯一标识，同一物料编码下不允许重复的包装规则编码。

---

#### 4.6.1 查询物料包装关系

| 项目     | 说明                                                                            |
| -------- | ------------------------------------------------------------------------------- |
| **URL**  | `POST /MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas` |
| **认证** | 需要                                                                            |

**入参 — MaterialPackagingRelationQueryDto**

| 字段              | 类型    | 必填 | 说明                |
| ----------------- | ------- | ---- | ------------------- |
| MaterialCode      | string? | 否   | 物料编码            |
| MaterialName      | string? | 否   | 物料名称            |
| PackagingRuleCode | string? | 否   | 包装规则编码        |
| PackagingRuleName | string? | 否   | 包装规则名称        |
| IsPaged           | bool    | 否   | 是否分页，默认 true |
| PageSize          | int     | 否   | 每页条数，默认 10   |
| PageIndex         | int     | 否   | 页码，从 1 开始     |
| CompanyCode       | string  | 是   | 公司编码            |
| FactoryCode       | string  | 是   | 工厂编码            |

**出参 — DataResult&lt;List&lt;MaterialPackagingRelationDto&gt;&gt;**

```json
{
  "Success": true,
  "Message": "[MOM] 获取数据成功！",
  "Attach": [
    {
      "Id": 1,
      "MaterialCode": "MAT001",
      "MaterialName": "成品物料A",
      "PackagingRuleCode": "RL001",
      "PackagingRuleName": "默认包装规则",
      "Details": [
        {
          "LevelSequence": 1,
          "PackagingLevelCode": "LV001",
          "PackagingLevelName": "内盒",
          "SpecCode": "PS001",
          "SpecName": "标准纸箱规格",
          "Quantity": 10,
          "Unit": "个",
          "PackagingTypeName": "纸箱包装",
          "BoxLabelPrintTemplate": "箱标签模板V1",
          "PackingListPrintTemplate": "装箱单模板V1"
        }
      ],
      "CompanyCode": "00000",
      "FactoryCode": "00000.00001",
      "CreatorUserId": 1,
      "CreatorUserName": "admin",
      "CreatorUserRealName": "管理员",
      "CreationTime": "2026-05-26T10:00:00",
      "LastModifierUserId": null,
      "LastModifierUserName": null,
      "LastModifierUserRealName": null,
      "LastModificationTime": null,
      "Remark": ""
    }
  ],
  "SkipCount": 0,
  "TotalCount": 1,
  "Record": 1
}
```

**MaterialPackagingRelationDto 字段说明**

| 字段                     | 类型                                           | 说明                        |
| ------------------------ | ---------------------------------------------- | --------------------------- |
| Id                       | int                                            | 数据主键                    |
| MaterialCode             | string                                         | 物料编码                    |
| MaterialName             | string                                         | 物料名称                    |
| PackagingRuleCode        | string                                         | 包装规则编码                |
| PackagingRuleName        | string                                         | 包装规则名称                |
| Details                  | List&lt;MaterialPackagingRelationDetailDto&gt; | 包装关系明细列表，JSON 数组 |
| _(通用字段省略，见 2.3)_ |                                                |                             |

**MaterialPackagingRelationDetailDto 字段说明**

| 字段                     | 类型   | 说明           |
| ------------------------ | ------ | -------------- |
| LevelSequence            | int    | 包装层级序号   |
| PackagingLevelCode       | string | 包装层级编码   |
| PackagingLevelName       | string | 包装层级名称   |
| SpecCode                 | string | 包装规格编码   |
| SpecName                 | string | 包装规格名称   |
| Quantity                 | int    | 包装数量       |
| Unit                     | string | 单位           |
| PackagingTypeName        | string | 包装类型名称   |
| BoxLabelPrintTemplate    | string | 箱标签打印模板 |
| PackingListPrintTemplate | string | 装箱单打印模板 |

> **注意**：明细中的所有字段由前端直接传入，后端不做校验和自动填充。前端需保证编码、名称等数据的准确性。

**请求示例**

```json
{
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1,
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

---

#### 4.6.2 新增物料包装关系

| 项目     | 说明                                                                    |
| -------- | ----------------------------------------------------------------------- |
| **URL**  | `POST /MaterialPackagingRelationApi/StoreMaterialPackagingRelationData` |
| **认证** | 需要                                                                    |

**入参 — MaterialPackagingRelationDto**

| 字段              | 类型                                           | 必填 | 说明             |
| ----------------- | ---------------------------------------------- | ---- | ---------------- |
| MaterialCode      | string                                         | 是   | 物料编码         |
| MaterialName      | string                                         | 是   | 物料名称         |
| PackagingRuleCode | string                                         | 是   | 包装规则编码     |
| PackagingRuleName | string                                         | 是   | 包装规则名称     |
| Details           | List&lt;MaterialPackagingRelationDetailDto&gt; | 否   | 包装关系明细列表 |
| CompanyCode       | string                                         | 是   | 公司编码         |
| FactoryCode       | string                                         | 是   | 工厂编码         |
| Remark            | string?                                        | 否   | 备注             |

**请求示例**

```json
{
  "MaterialCode": "MAT001",
  "MaterialName": "成品物料A",
  "PackagingRuleCode": "RL001",
  "PackagingRuleName": "默认包装规则",
  "Details": [
    {
      "LevelSequence": 1,
      "PackagingLevelCode": "LV001",
      "PackagingLevelName": "内盒",
      "SpecCode": "PS001",
      "SpecName": "标准纸箱规格",
      "Quantity": 10,
      "Unit": "个",
      "PackagingTypeName": "纸箱包装",
      "BoxLabelPrintTemplate": "箱标签模板V1",
      "PackingListPrintTemplate": "装箱单模板V1"
    }
  ],
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001",
  "Remark": ""
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 保存数据成功！"
}
```

> **唯一性约束**：物料编码 + 包装规则编码 组合唯一。若新增时该组合已存在，后端返回错误。

---

#### 4.6.3 修改物料包装关系

| 项目     | 说明                                                                     |
| -------- | ------------------------------------------------------------------------ |
| **URL**  | `POST /MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData` |
| **认证** | 需要                                                                     |

**入参 — MaterialPackagingRelationDto**

```json
{
  "NeedUpdateFields": {
    "Id": 1,
    "MaterialName": "成品物料A（修订）",
    "PackagingRuleName": "默认包装规则V2",
    "Details": [
      {
        "LevelSequence": 1,
        "PackagingLevelCode": "LV001",
        "PackagingLevelName": "内盒",
        "SpecCode": "PS001",
        "SpecName": "标准纸箱规格",
        "Quantity": 20,
        "Unit": "个",
        "PackagingTypeName": "纸箱包装",
        "BoxLabelPrintTemplate": "箱标签模板V2",
        "PackingListPrintTemplate": "装箱单模板V2"
      }
    ]
  }
}
```

> NeedUpdateFields：仅传入需要修改的字段 + Id。Details 传入时全量覆盖明细列表。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 修改数据成功！"
}
```

---

#### 4.6.4 删除物料包装关系

| 项目     | 说明                                                                     |
| -------- | ------------------------------------------------------------------------ |
| **URL**  | `POST /MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData` |
| **认证** | 需要                                                                     |

**入参 — MaterialPackagingRelationDto**

> 将查询接口返回的完整 DTO 对象直接传入，不要只传 Id。删除主表数据时，关联的包装关系明细一并删除。

```json
{
  "Id": 1,
  "MaterialCode": "MAT001",
  "MaterialName": "成品物料A",
  "PackagingRuleCode": "RL001",
  "PackagingRuleName": "默认包装规则",
  "Details": [],
  "CompanyCode": "00000",
  "FactoryCode": "00000.00001"
}
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.6.5 批量删除物料包装关系

| 项目     | 说明                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| **URL**  | `POST /MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas` |
| **认证** | 需要                                                                           |

**入参 — List&lt;MaterialPackagingRelationDto&gt;**

> 每项传完整对象，不要只传 Id

```json
[
  {
    "Id": 1,
    "MaterialCode": "MAT001",
    "MaterialName": "成品物料A",
    "PackagingRuleCode": "RL001",
    "PackagingRuleName": "默认包装规则",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  },
  {
    "Id": 2,
    "MaterialCode": "MAT002",
    "MaterialName": "成品物料B",
    "PackagingRuleCode": "RL002",
    "PackagingRuleName": "备用包装规则",
    "CompanyCode": "00000",
    "FactoryCode": "00000.00001"
  }
]
```

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 批量删除数据成功！"
}
```

---

## 5. 前端对接注意事项

1. **字段命名规范**
   - 所有字段统一使用大驼峰 PascalCase（如 `TypeCode`、`LevelCode`、`ParentLevelCode`），大小写敏感，传参必须严格匹配

2. **查询规则**
   - 模糊查询（默认）：直接传值，如 `{"LevelName": "小盒"}`
   - 精确查询：值前加 $ 前缀，如 `{"LevelCode": "$LV001"}`
   - 多值匹配：多个值用 `[]` 连接，如 `{"LevelCode": "LV001[]LV002[]LV003"}`

3. **无数据处理**
   - 查询无数据时，`Success` 返回 `false` 且 `Code` 为 `"100001"`
   - 前端应据此判断是"无数据"而非"请求失败"，不弹出错误提示

4. **更新接口**
   - 使用 `NeedUpdateFields` 格式，只需传入要修改的字段 + `Id`
   - 未传的字段不会被修改

5. **删除接口**
   - 删除和批量删除接口必须传完整 DTO 对象（即查询返回的对象原样传入）
   - 不要只传 Id，因为主键可能不是 Id，也可能按其他字段条件删除

6. **分页参数**
   - `PageIndex` 从 1 开始
   - `PageSize` 默认 10，最大 10000

7. **时间字段**
   - 使用 ISO 8601 格式（如 `2026-05-25T10:00:00`）
   - 前端需做格式化显示

8. **Message 前缀**
   - 所有返回的 `Message` 字段已统一添加 `[MOM]` 前缀

9. **响应结构区分**
   - 查询接口返回 `DataResult<T>`（含 `Attach`、`TotalCount` 等分页字段）
   - 新增/修改/删除接口返回 `OpResult`（仅含 `Success`、`Code`、`Message`）
   - 关系图接口直接返回 `List<PackagingLevelTreeDto>`（不含外层包装）

10. **包装层级关系图**
    - 关系图接口 `/PackagingLevelApi/GetPackagingLevelTree` 返回递归嵌套的树形结构
    - 每个节点包含 `Children` 数组，无子节点时为空数组 `[]`
    - 前端可直接渲染为树形组件（如 Ant Design Tree、Element Plus Tree）
    - 树的第一层是序号最小的层级（通常为1），Children 按序号升序排列

11. **包装层级校验**
    - 新增/修改层级时，后端会校验层级序号和父子关系
    - 校验失败时 `Success` 返回 `false`，`Message` 包含具体错误原因
    - 前端应在提交前做基础校验（序号 >= 1、序号1不设父级）
