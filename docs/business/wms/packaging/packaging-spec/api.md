# 包装规格维护 API 接口文档

---

## 目录

- [1. 需求背景](#1-需求背景)
- [2. 接口约定（通用）](#2-接口约定通用)
- [3. 本次需求接口清单](#3-本次需求接口清单)
- [4. 接口详细说明](#4-接口详细说明)
    - [4.1 包装规格管理](#41-包装规格管理)
    - [4.1.1 查询包装规格](#411-查询包装规格)
    - [4.1.2 新增包装规格](#412-新增包装规格)
    - [4.1.3 修改包装规格](#413-修改包装规格)
    - [4.1.4 删除包装规格](#414-删除包装规格)
    - [4.1.5 批量删除包装规格](#415-批量删除包装规格)

---

## 1. 需求背景

| 项目         | 内容 |
| ------------ | ---- |
| **需求名称** | 包装规格维护 |
| **需求描述** | 提供包装规格的增删改查功能，支持维护规格编码、名称、关联包装类型和层级、条码规则、尺寸重量、容量堆叠等信息。 |
| **涉及模块** | 基础数据中心 — 包装规格管理 |
| **后端开发** | （待填写） |
| **前端开发** | （待填写） |
| **文档版本** | v1.1 |
| **更新日期** | 2026-05-27 |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容 |
| ---- | ---------- | ------ | -------- |
| v1.0 | 2026-05-25 | -      | 初始版本，包含包装规格接口 |
| v1.1 | 2026-05-27 | -      | 请求体移除 CompanyCode 和 FactoryCode，改由 token 传递用户上下文 |

---

## 2. 接口约定（通用）

涉及接口均符合[通用接口规范](/docs/api/common-api-spec.md)。前端通过 `Authorization: Bearer {token}` 传递用户身份，后端从 token 中解析公司与工厂上下文；请求体不传 `CompanyCode` 和 `FactoryCode`。

---

## 3. 本次需求接口清单

| 序号 | 接口名称         | HTTP方法 | URL                                                | 说明                 |
| ---- | ---------------- | -------- | -------------------------------------------------- | -------------------- |
| 1 | 查询包装规格     | POST     | `/PackagingSpecApi/GetPackagingSpecAutoQueryDatas` | 分页查询包装规格列表 |
| 2 | 新增包装规格     | POST     | `/PackagingSpecApi/StorePackagingSpecData`         | 新增包装规格         |
| 3 | 修改包装规格     | POST     | `/PackagingSpecApi/UpdatePackagingSpecData`        | 修改包装规格信息     |
| 4 | 删除包装规格     | POST     | `/PackagingSpecApi/RemovePackagingSpecData`        | 删除单条包装规格     |
| 5 | 批量删除包装规格 | POST     | `/PackagingSpecApi/RemoveBatchPackagingSpecDatas`  | 批量删除包装规格     |

---

## 4. 接口详细说明

### 4.1 包装规格管理

> 控制器：`PackagingSpecApi`

#### 4.1.1 查询包装规格

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
  "PageIndex": 1
}
```

---

#### 4.1.2 新增包装规格

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

#### 4.1.3 修改包装规格

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

#### 4.1.4 删除包装规格

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingSpecApi/RemovePackagingSpecData` |
| **认证** | 需要                                             |

**入参 — PackagingSpecDto**

> 将查询接口返回的业务 DTO 对象直接传入，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

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
  "Unit": "个"
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

#### 4.1.5 批量删除包装规格

| 项目     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| **URL**  | `POST /PackagingSpecApi/RemoveBatchPackagingSpecDatas` |
| **认证** | 需要                                                   |

**入参 — List<PackagingSpecDto>**

> 每项传业务 DTO 对象，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

```json
[
  {
    "Id": 1,
    "SpecCode": "PS001",
    "SpecName": "标准纸箱规格",
    "PackagingTypeCode": "PT001",
    "PackagingTypeName": "纸箱包装"
},
  {
    "Id": 2,
    "SpecCode": "PS002",
    "SpecName": "大号塑料箱规格",
    "PackagingTypeCode": "PT002",
    "PackagingTypeName": "塑料箱"
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
