# 包装套包维护 API 接口文档

---

## 目录

- [1. 需求背景](#1-需求背景)
- [2. 接口约定（通用）](#2-接口约定通用)
- [3. 本次需求接口清单](#3-本次需求接口清单)
- [4. 接口详细说明](#4-接口详细说明)
    - [4.1 包装套包管理](#41-包装套包管理)
    - [4.1.1 查询包装套包](#411-查询包装套包)
    - [4.1.2 新增包装套包](#412-新增包装套包)
    - [4.1.3 批量新增包装套包](#413-批量新增包装套包)
    - [4.1.4 修改包装套包](#414-修改包装套包)
    - [4.1.5 批量修改包装套包](#415-批量修改包装套包)
    - [4.1.6 删除包装套包](#416-删除包装套包)
    - [4.1.7 批量删除包装套包](#417-批量删除包装套包)

---

## 1. 需求背景

| 项目         | 内容 |
| ------------ | ---- |
| **需求名称** | 包装套包维护 |
| **需求描述** | 提供包装套包的增删改查功能，支持维护套包编码、名称、主件物料、子件列表等信息，子件列表以 JSON 数组存储。 |
| **涉及模块** | 基础数据中心 — 包装套包管理 |
| **后端开发** | （待填写） |
| **前端开发** | （待填写） |
| **文档版本** | v1.1 |
| **更新日期** | 2026-05-27 |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容 |
| ---- | ---------- | ------ | -------- |
| v1.0 | 2026-05-26 | -      | 初始版本，包含包装套包接口 |
| v1.1 | 2026-05-27 | -      | 请求体移除 CompanyCode 和 FactoryCode，改由 token 传递用户上下文 |

---

## 2. 接口约定（通用）

涉及接口均符合[通用接口规范](/docs/api/common-api-spec.md)。前端通过 `Authorization: Bearer {token}` 传递用户身份，后端从 token 中解析公司与工厂上下文；请求体不传 `CompanyCode` 和 `FactoryCode`。

---

## 3. 本次需求接口清单

| 序号 | 接口名称         | HTTP方法 | URL                                              | 说明                 |
| ---- | ---------------- | -------- | ------------------------------------------------ | -------------------- |
| 1 | 查询包装套包     | POST     | `/PackagingKitApi/GetPackagingKitAutoQueryDatas` | 分页查询包装套包列表 |
| 2 | 新增包装套包     | POST     | `/PackagingKitApi/StorePackagingKitData`         | 新增包装套包         |
| 3 | 批量新增包装套包 | POST     | `/PackagingKitApi/StoreBatchPackagingKitDatas`   | 批量新增包装套包     |
| 4 | 修改包装套包     | POST     | `/PackagingKitApi/UpdatePackagingKitData`        | 修改包装套包信息     |
| 5 | 批量修改包装套包 | POST     | `/PackagingKitApi/UpdateBatchPackagingKitDatas`  | 批量修改包装套包     |
| 6 | 删除包装套包     | POST     | `/PackagingKitApi/RemovePackagingKitData`        | 删除单条包装套包     |
| 7 | 批量删除包装套包 | POST     | `/PackagingKitApi/RemoveBatchPackagingKitDatas`  | 批量删除包装套包     |

---

## 4. 接口详细说明

### 4.1 包装套包管理

> 控制器：`PackagingKitApi`

#### 4.1.1 查询包装套包

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
  "PageIndex": 1
}
```

---

#### 4.1.2 新增包装套包

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

#### 4.1.3 批量新增包装套包

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
    ]
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
    ]
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

#### 4.1.4 修改包装套包

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

#### 4.1.5 批量修改包装套包

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

#### 4.1.6 删除包装套包

| 项目     | 说明                                           |
| -------- | ---------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/RemovePackagingKitData` |
| **认证** | 需要                                           |

**入参 — PackagingKitDto**

> 将查询接口返回的业务 DTO 对象直接传入，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

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
  "Children": []
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

#### 4.1.7 批量删除包装套包

| 项目     | 说明                                                 |
| -------- | ---------------------------------------------------- |
| **URL**  | `POST /PackagingKitApi/RemoveBatchPackagingKitDatas` |
| **认证** | 需要                                                 |

**入参 — List\<PackagingKitDto\>**

> 每项传业务 DTO 对象，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

```json
[
  {
    "Id": 1,
    "KitCode": "PK001",
    "KitName": "标准套包A",
    "MainMaterialCode": "MAT001",
    "MainMaterialName": "成品物料A"
},
  {
    "Id": 2,
    "KitCode": "PK002",
    "KitName": "标准套包B",
    "MainMaterialCode": "MAT002",
    "MainMaterialName": "成品物料B"
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
