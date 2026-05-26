# 包装类型维护 API 接口文档

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
- [5. 前端对接注意事项](#5-前端对接注意事项)

---

## 1. 需求背景

| 项目         | 内容                                                                               |
| ------------ | ---------------------------------------------------------------------------------- |
| **需求名称** | 包装类型维护                                                                       |
| **需求描述** | 提供包装类型的增删改查功能，支持维护包装类型编码、名称、是否为循环包装、描述等信息 |
| **涉及模块** | 基础数据中心 — 包装类型管理                                                        |
| **后端开发** | （待填写）                                                                         |
| **前端开发** | （待填写）                                                                         |
| **文档版本** | v1.0                                                                               |
| **更新日期** | 2026-05-25                                                                         |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容 |
| ---- | ---------- | ------ | -------- |
| v1.0 | 2026-05-25 | -      | 初始版本 |

---

## 2. 接口约定（通用）

涉及接口均符合[通用接口规范](/docs/api/通用接口规范.md)

---

## 3. 本次需求接口清单

| 序号 | 接口名称         | HTTP方法 | URL                                                | 说明                 |
| ---- | ---------------- | -------- | -------------------------------------------------- | -------------------- |
| 1    | 查询包装类型     | POST     | `/PackagingTypeApi/GetPackagingTypeAutoQueryDatas` | 分页查询包装类型列表 |
| 2    | 新增包装类型     | POST     | `/PackagingTypeApi/StorePackagingTypeData`         | 新增包装类型         |
| 3    | 修改包装类型     | POST     | `/PackagingTypeApi/UpdatePackagingTypeData`        | 修改包装类型信息     |
| 4    | 删除包装类型     | POST     | `/PackagingTypeApi/RemovePackagingTypeData`        | 删除单条包装类型     |
| 5    | 批量删除包装类型 | POST     | `/PackagingTypeApi/RemoveBatchPackagingTypeDatas`  | 批量删除包装类型     |

---

## 4. 接口详细说明

### 4.1 包装类型管理

> 控制器：`PackagingTypeApi`

#### 4.1.1 查询包装类型

| 项目     | 说明                                                    |
| -------- | ------------------------------------------------------- |
| **URL**  | `POST /PackagingTypeApi/GetPackagingTypeAutoQueryDatas` |
| **认证** | 需要                                                    |

**入参 — PackagingTypeQueryDto**

| 字段         | 类型    | 必填 | 说明           |
| ------------ | ------- | ---- | -------------- |
| TypeCode     | string? | 否   | 类型编码       |
| TypeName     | string? | 否   | 类型名称       |
| IsRecyclable | bool?   | 否   | 是否为循环包装 |
| Description  | string? | 否   | 描述           |

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

| 字段         | 类型   | 说明           |
| ------------ | ------ | -------------- |
| Id           | int    | 数据主键       |
| TypeCode     | string | 类型编码       |
| TypeName     | string | 类型名称       |
| IsRecyclable | bool   | 是否为循环包装 |
| Description  | string | 描述           |

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
| Remark       | string? | 否   | 备注           |

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

**出参 — DataResult<PackagingTypeDto>**

Attach 返回新增的完整数据对象，含 Id

```json
{
  "Success": true,
  "Message": "[MOM] 保存数据成功！",
  "Attach": {
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
    "Remark": ""
  },
  "SkipCount": 0,
  "TotalCount": 0,
  "Record": 0
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

**出参 — DataResult**

```json
{
  "Success": true,
  "Message": "[MOM] 修改数据成功！",
  "Attach": null,
  "SkipCount": 0,
  "TotalCount": 0,
  "Record": 0
}
```

---

#### 4.1.4 删除包装类型

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingTypeApi/RemovePackagingTypeData` |
| **认证** | 需要                                             |

**入参 — PackagingTypeDto**

> 将查询接口返回的完整 DTO 对象直接传入，不要只传 Id。因为主键可能不是 Id，也可能按其他字段条件删除。

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

**出参 — DataResult**

```json
{
  "Success": true,
  "Message": "[MOM] 删除数据成功！",
  "Attach": null,
  "SkipCount": 0,
  "TotalCount": 0,
  "Record": 0
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

**出参 — DataResult**

```json
{
  "Success": true,
  "Message": "[MOM] 批量删除数据成功！",
  "Attach": null,
  "SkipCount": 0,
  "TotalCount": 0,
  "Record": 0
}
```

---
