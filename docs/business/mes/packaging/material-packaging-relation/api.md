# 物料包装关系维护 API 接口文档

---

## 目录

- [1. 需求背景](#1-需求背景)
- [2. 接口约定（通用）](#2-接口约定通用)
- [3. 本次需求接口清单](#3-本次需求接口清单)
- [4. 接口详细说明](#4-接口详细说明)
    - [4.1 物料包装关系管理](#41-物料包装关系管理)
    - [4.1.1 查询物料包装关系](#411-查询物料包装关系)
    - [4.1.2 新增物料包装关系](#412-新增物料包装关系)
    - [4.1.3 修改物料包装关系](#413-修改物料包装关系)
    - [4.1.4 删除物料包装关系](#414-删除物料包装关系)
    - [4.1.5 批量删除物料包装关系](#415-批量删除物料包装关系)

---

## 1. 需求背景

| 项目         | 内容 |
| ------------ | ---- |
| **需求名称** | 物料包装关系维护 |
| **需求描述** | 提供物料包装关系的增删改查功能，支持维护物料编码、名称、包装规则编码、名称及包装关系明细，以物料编码和包装规则编码作为唯一标识。 |
| **涉及模块** | 基础数据中心 — 物料包装关系管理 |
| **后端开发** | （待填写） |
| **前端开发** | （待填写） |
| **文档版本** | v1.1 |
| **更新日期** | 2026-05-27 |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容 |
| ---- | ---------- | ------ | -------- |
| v1.0 | 2026-05-26 | -      | 初始版本，包含物料包装关系接口 |
| v1.1 | 2026-05-27 | -      | 请求体移除 CompanyCode 和 FactoryCode，改由 token 传递用户上下文 |

---

## 2. 接口约定（通用）

涉及接口均符合[通用接口规范](/docs/api/common-api-spec.md)。前端通过 `Authorization: Bearer {token}` 传递用户身份，后端从 token 中解析公司与工厂上下文；请求体不传 `CompanyCode` 和 `FactoryCode`。

---

## 3. 本次需求接口清单

| 序号 | 接口名称             | HTTP方法 | URL                                                                        | 说明                     |
| ---- | -------------------- | -------- | -------------------------------------------------------------------------- | ------------------------ |
| 1 | 查询物料包装关系     | POST     | `/MaterialPackagingRelationApi/GetMaterialPackagingRelationAutoQueryDatas` | 分页查询物料包装关系列表 |
| 2 | 新增物料包装关系     | POST     | `/MaterialPackagingRelationApi/StoreMaterialPackagingRelationData`         | 新增物料包装关系         |
| 3 | 修改物料包装关系     | POST     | `/MaterialPackagingRelationApi/UpdateMaterialPackagingRelationData`        | 修改物料包装关系信息     |
| 4 | 删除物料包装关系     | POST     | `/MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData`        | 删除单条物料包装关系     |
| 5 | 批量删除物料包装关系 | POST     | `/MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas`  | 批量删除物料包装关系     |

---

## 4. 接口详细说明

### 4.1 物料包装关系管理

> 控制器：`MaterialPackagingRelationApi`

物料包装关系用于维护物料与包装规则之间的关联关系，包括关联的包装关系明细（层级+规格+数量+包装类型+标签打印模板等）。每条记录以物料编码和包装规则编码作为唯一标识，同一物料编码下不允许重复的包装规则编码。

---

#### 4.1.1 查询物料包装关系

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
  "PageIndex": 1
}
```

---

#### 4.1.2 新增物料包装关系

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

#### 4.1.3 修改物料包装关系

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

#### 4.1.4 删除物料包装关系

| 项目     | 说明                                                                     |
| -------- | ------------------------------------------------------------------------ |
| **URL**  | `POST /MaterialPackagingRelationApi/RemoveMaterialPackagingRelationData` |
| **认证** | 需要                                                                     |

**入参 — MaterialPackagingRelationDto**

> 将查询接口返回的业务 DTO 对象直接传入，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。删除主表数据时，关联的包装关系明细一并删除。

```json
{
  "Id": 1,
  "MaterialCode": "MAT001",
  "MaterialName": "成品物料A",
  "PackagingRuleCode": "RL001",
  "PackagingRuleName": "默认包装规则",
  "Details": []
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

#### 4.1.5 批量删除物料包装关系

| 项目     | 说明                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| **URL**  | `POST /MaterialPackagingRelationApi/RemoveBatchMaterialPackagingRelationDatas` |
| **认证** | 需要                                                                           |

**入参 — List&lt;MaterialPackagingRelationDto&gt;**

> 每项传业务 DTO 对象，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

```json
[
  {
    "Id": 1,
    "MaterialCode": "MAT001",
    "MaterialName": "成品物料A",
    "PackagingRuleCode": "RL001",
    "PackagingRuleName": "默认包装规则"
},
  {
    "Id": 2,
    "MaterialCode": "MAT002",
    "MaterialName": "成品物料B",
    "PackagingRuleCode": "RL002",
    "PackagingRuleName": "备用包装规则"
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
