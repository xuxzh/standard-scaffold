# 包装层级维护 API 接口文档

---

## 目录

- [1. 需求背景](#1-需求背景)
- [2. 接口约定（通用）](#2-接口约定通用)
- [3. 本次需求接口清单](#3-本次需求接口清单)
- [4. 接口详细说明](#4-接口详细说明)
  - [4.1 包装层级管理](#41-包装层级管理)
  - [4.1.1 查询包装层级](#411-查询包装层级)
  - [4.1.2 查看包装层级关系图](#412-查看包装层级关系图)
  - [4.1.3 新增包装层级](#413-新增包装层级)
  - [4.1.4 修改包装层级](#414-修改包装层级)
  - [4.1.5 删除包装层级](#415-删除包装层级)
  - [4.1.6 批量删除包装层级](#416-批量删除包装层级)
- [5. 包装层级对接注意事项](#5-包装层级对接注意事项)

---

## 1. 需求背景

| 项目         | 内容                                                                                                                        |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| **需求名称** | 包装层级维护                                                                                                                |
| **需求描述** | 提供包装层级的增删改查功能，支持层级关系图展示，层级序号从 1 开始递增，内层层级只能是序号比自己小的层级，构建嵌套包装关系。 |
| **涉及模块** | 基础数据中心 — 包装层级管理                                                                                                 |
| **后端开发** | （待填写）                                                                                                                  |
| **前端开发** | （待填写）                                                                                                                  |
| **文档版本** | v1.1                                                                                                                        |
| **更新日期** | 2026-05-27                                                                                                                  |

### 变更记录

| 版本 | 日期       | 修改人 | 修改内容                                                         |
| ---- | ---------- | ------ | ---------------------------------------------------------------- |
| v1.0 | 2026-05-25 | -      | 初始版本，包含包装层级接口                                       |
| v1.1 | 2026-05-27 | -      | 请求体移除 CompanyCode 和 FactoryCode，改由 token 传递用户上下文 |

---

## 2. 接口约定（通用）

涉及接口均符合[通用接口规范](/docs/api/common-api-spec.md)。前端通过 `Authorization: Bearer {token}` 传递用户身份，后端从 token 中解析公司与工厂上下文；请求体不传 `CompanyCode` 和 `FactoryCode`。

---

## 3. 本次需求接口清单

| 序号 | 接口名称           | HTTP方法 | URL                                                  | 说明                           |
| ---- | ------------------ | -------- | ---------------------------------------------------- | ------------------------------ |
| 1    | 查询包装层级       | POST     | `/PackagingLevelApi/GetPackagingLevelAutoQueryDatas` | 分页查询包装层级列表           |
| 2    | 查看包装层级关系图 | POST     | `/PackagingLevelApi/GetPackagingLevelTree`           | 返回树形嵌套结构，展示层级关系 |
| 3    | 新增包装层级       | POST     | `/PackagingLevelApi/StorePackagingLevelData`         | 新增包装层级                   |
| 4    | 修改包装层级       | POST     | `/PackagingLevelApi/UpdatePackagingLevelData`        | 修改包装层级信息               |
| 5    | 删除包装层级       | POST     | `/PackagingLevelApi/RemovePackagingLevelData`        | 删除单条包装层级               |
| 6    | 批量删除包装层级   | POST     | `/PackagingLevelApi/RemoveBatchPackagingLevelDatas`  | 批量删除包装层级               |

---

## 4. 接口详细说明

### 4.1 包装层级管理

> 控制器：`PackagingLevelApi`

#### 4.1.1 查询包装层级

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
| ParentLevelCode | string? | 否   | 内层层级编码        |
| IsPaged         | bool    | 否   | 是否分页，默认 true |
| PageSize        | int     | 否   | 每页条数，默认 10   |
| PageIndex       | int     | 否   | 页码，从 1 开始     |

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
| ParentLevelCode          | string? | 内层层级编码，层级序号为1时为空 |
| ParentLevelName          | string? | 内层层级名称                    |
| Description              | string? | 描述                            |
| _(通用字段省略，见 2.3)_ |         |                                 |

**请求示例**

```json
{
  "IsPaged": true,
  "PageSize": 10,
  "PageIndex": 1
}
```

---

#### 4.1.2 查看包装层级关系图

| 项目     | 说明                                                                                                             |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/GetPackagingLevelTree`                                                                  |
| **认证** | 需要                                                                                                             |
| **说明** | 返回树形嵌套结构，按层级序号从小到大构建父子关系。无内层的为根节点（第一层），子节点嵌套在 Children 中，递归展开 |

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
| ParentLevelCode | string?                     | 内层层级编码                               |
| ParentLevelName | string?                     | 内层层级名称                               |
| Description     | string?                     | 描述                                       |
| Children        | List<PackagingLevelTreeDto> | 子节点列表（递归结构），无子节点时为空数组 |

**业务规则**

- 层级序号从 1 开始，越大表示包装越外层
- 序号为 1 的层级为根节点，无内层层级
- 内层层级只能是序号比自己小的层级
- 同级可存在多条数据（如序号2同时有"小盒"和"塑料袋"）
- 关系图按层级序号从小到大排列，Children 同理

---

#### 4.1.3 新增包装层级

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
| ParentLevelCode | string? | 否   | 内层层级编码，序号为1时不可填 |
| ParentLevelName | string? | 否   | 内层层级名称                  |
| Description     | string? | 否   | 描述                          |
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
| LevelSequence = 1 且填写了 ParentLevelCode | 层级序号为1的层级不能设置内层层级        |
| ParentLevelCode 填写的编码不存在           | 内层层级编码「xxx」不存在                |
| 内层层级的序号 >= 当前层级序号             | 内层层级的序号(x)必须小于当前层级序号(y) |

---

#### 4.1.4 修改包装层级

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

#### 4.1.5 删除包装层级

| 项目     | 说明                                               |
| -------- | -------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/RemovePackagingLevelData` |
| **认证** | 需要                                               |

**入参 — PackagingLevelDto**

> 将查询接口返回的业务 DTO 对象直接传入，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

```json
{
  "Id": 1,
  "LevelCode": "LV001",
  "LevelSequence": 1,
  "LevelName": "单品",
  "ParentLevelCode": null,
  "ParentLevelName": null,
  "Description": "最小包装单元"
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

#### 4.1.6 批量删除包装层级

| 项目     | 说明                                                     |
| -------- | -------------------------------------------------------- |
| **URL**  | `POST /PackagingLevelApi/RemoveBatchPackagingLevelDatas` |
| **认证** | 需要                                                     |

**入参 — List<PackagingLevelDto>**

> 每项传业务 DTO 对象，不要只传 Id。`CompanyCode` 和 `FactoryCode` 由后端根据 token 上下文解析，前端不传。

```json
[
  {
    "Id": 2,
    "LevelCode": "LV002",
    "LevelName": "小盒",
    "LevelSequence": 2
  },
  {
    "Id": 3,
    "LevelCode": "LV003",
    "LevelName": "中箱",
    "LevelSequence": 3
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

---

## 5. 包装层级对接注意事项

1. **包装层级关系图**
   - 关系图接口 `/PackagingLevelApi/GetPackagingLevelTree` 返回递归嵌套的树形结构
   - 每个节点包含 `Children` 数组，无子节点时为空数组 `[]`
   - 前端可直接渲染为树形组件
   - 树的第一层是序号最小的层级（通常为 1），Children 按序号升序排列

2. **包装层级校验**
   - 新增/修改层级时，后端会校验层级序号和父子关系
   - 校验失败时 `Success` 返回 `false`，`Message` 包含具体错误原因
   - 前端应在提交前做基础校验（序号 >= 1、序号 1 不设内层）
