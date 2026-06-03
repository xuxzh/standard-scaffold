# 包装规则维护 API 接口文档

---

## 目录

- [1. 需求背景](#1-需求背景)
- [2. 接口约定（通用）](#2-接口约定通用)
- [3. 本次需求接口清单](#3-本次需求接口清单)
- [4. 接口详细说明](#4-接口详细说明)
    - [4.1 包装规则管理](#41-包装规则管理)
    - [4.1.1 查询包装规则](#411-查询包装规则)
    - [4.1.2 新增包装规则](#412-新增包装规则)
    - [4.1.3 修改包装规则](#413-修改包装规则)
    - [4.1.4 删除包装规则](#414-删除包装规则)
    - [4.1.5 批量删除包装规则](#415-批量删除包装规则)
    - [4.1.6 查询包装规则配置](#416-查询包装规则配置)
    - [4.1.7 保存包装规则配置](#417-保存包装规则配置)

---

## 1. 需求背景

| 项目         | 内容 |
| ------------ | ---- |
| **需求名称** | 包装规则维护 |
| **需求描述** | 提供包装规则的增删改查功能，支持维护规则编码、名称、启停状态、包装关系明细，以及规则配置。 |
| **涉及模块** | 基础数据中心 — 包装规则管理 |
| **后端开发** | （待填写） |
| **前端开发** | （待填写） |
| **文档版本** | v1.1 |
| **更新日期** | 2026-05-27 |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容 |
| ---- | ---------- | ------ | -------- |
| v1.0 | 2026-05-26 | -      | 初始版本，包含包装规则接口 |
| v1.1 | 2026-05-27 | -      | 请求体移除 CompanyCode 和 FactoryCode，改由 token 传递用户上下文 |

---

## 2. 接口约定（通用）

涉及接口均符合[通用接口规范](/docs/api/common-api-spec.md)。前端通过 `Authorization: Bearer {token}` 传递用户身份，后端从 token 中解析公司与工厂上下文；请求体不传 `CompanyCode` 和 `FactoryCode`。

---

## 3. 本次需求接口清单

| 序号 | 接口名称         | HTTP方法 | URL                                                  | 说明                       |
| ---- | ---------------- | -------- | ---------------------------------------------------- | -------------------------- |
| 1 | 查询包装规则     | POST     | `/PackagingRuleApi/GetPackagingRuleAutoQueryDatas`   | 分页查询包装规则列表       |
| 2 | 新增包装规则     | POST     | `/PackagingRuleApi/StorePackagingRuleData`           | 新增包装规则（含明细校验） |
| 3 | 修改包装规则     | POST     | `/PackagingRuleApi/UpdatePackagingRuleData`          | 修改包装规则信息           |
| 4 | 删除包装规则     | POST     | `/PackagingRuleApi/RemovePackagingRuleData`          | 删除单条包装规则           |
| 5 | 批量删除包装规则 | POST     | `/PackagingRuleApi/RemoveBatchPackagingRuleDatas`    | 批量删除包装规则           |
| 6 | 查询包装规则配置 | POST     | `/PackagingRuleApi/GetPackagingRuleConfigAutoQueryDatas` | 按规则编码查询规则配置     |
| 7 | 保存包装规则配置 | POST     | `/PackagingRuleApi/StorePackagingRuleConfigData`         | 按规则编码全量覆盖配置     |

---

## 4. 接口详细说明

### 4.1 包装规则管理

> 控制器：`PackagingRuleApi`

包装规则用于定义产品包装过程中需要遵守的业务规则，包括包装关系明细（层级+规格+数量+包装方式）以及规则配置（混箱规则、标签打印规则、封箱触发规则、异常处理规则）。

---

#### 4.1.1 查询包装规则

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

#### 4.1.2 新增包装规则

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

#### 4.1.3 修改包装规则

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

#### 4.1.4 删除包装规则

| 项目     | 说明                                             |
| -------- | ------------------------------------------------ |
| **URL**  | `POST /PackagingRuleApi/RemovePackagingRuleData` |
| **认证** | 需要                                             |

**入参 — PackagingRuleDto**

```json
{
  "Id": 1,
  "RuleCode": "RL001"
}
```

> **注意**：删除时需传入业务 PackagingRuleDto 对象，至少包含 Id、RuleCode。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。删除规则主表数据时，关联的包装关系明细也会一并删除。

**出参 — OpResult**

```json
{
  "Success": true,
  "Code": "",
  "Message": "[MOM] 删除数据成功！"
}
```

---

#### 4.1.5 批量删除包装规则

| 项目     | 说明                                                   |
| -------- | ------------------------------------------------------ |
| **URL**  | `POST /PackagingRuleApi/RemoveBatchPackagingRuleDatas` |
| **认证** | 需要                                                   |

**入参 — List&lt;PackagingRuleDto&gt;**

```json
[
  {
    "Id": 1,
    "RuleCode": "RL001"
},
  {
    "Id": 2,
    "RuleCode": "RL002"
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

#### 4.1.6 查询包装规则配置

| 项目     | 说明                                                      |
| -------- | --------------------------------------------------------- |
| **URL**  | `POST /PackagingRuleApi/GetPackagingRuleConfigAutoQueryDatas` |
| **认证** | 需要                                                      |

**入参 — PackagingRuleConfigQueryDto**

| 字段        | 类型   | 必填 | 说明                |
| ----------- | ------ | ---- | ------------------- |
| RuleCode    | string | 是   | 规则编码            |
| IsPaged     | bool   | 否   | 是否分页，默认 true |
| PageSize    | int    | 否   | 每页条数，默认 10   |
| PageIndex   | int    | 否   | 页码，从 1 开始     |

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

#### 4.1.7 保存包装规则配置

| 项目     | 说明                                              |
| -------- | ------------------------------------------------- |
| **URL**  | `POST /PackagingRuleApi/StorePackagingRuleConfigData` |
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
  }
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
