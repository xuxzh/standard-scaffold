/**
 * 查询操作符枚举 - 覆盖Prisma常用查询场景，可按需扩展
 */
export enum XzQueryOperator {
  // 基础匹配
  EQ = 'eq', // 等于
  NE = 'ne', // 不等于
  // 字符串匹配
  CONTAINS = 'contains', // 包含（模糊）
  STARTS_WITH = 'startsWith', // 开头匹配
  ENDS_WITH = 'endsWith', // 结尾匹配
  // 数值/日期范围
  GT = 'gt', // 大于
  GTE = 'gte', // 大于等于
  LT = 'lt', // 小于
  LTE = 'lte', // 小于等于
  // 数组匹配
  IN = 'in', // 在数组中
  NOT_IN = 'notIn', // 不在数组中
  // 空值判断
  IS_NULL = 'isNull', // 为空
  IS_NOT_NULL = 'isNotNull', // 不为空
}

/**
 * 排序配置 - 支持多字段排序
 */
export interface XzSortConfig {
  /** 排序字段（如 "createTime", "id"） */
  field: string;
  /** 排序方向 */
  order: 'asc' | 'desc';
}

/**
 * 单个原子查询条件
 */
export interface XzQueryCondition {
  /** 查询字段 */
  field: string;
  /** 查询操作符 */
  operator: XzQueryOperator;
  /** 查询值（根据操作符适配类型） */
  value?: string | number | boolean | Date | string[] | number[];
}

/**
 * 复合查询条件（支持嵌套AND/OR，递归结构）
 * 要么是原子条件，要么是复合条件（AND/OR）
 */
export type XzCompositeQuery =
  | XzQueryCondition
  | {
      /** 组合方式 */
      logic: 'AND' | 'OR';
      /** 子条件（可以是原子条件或嵌套复合条件） */
      conditions: XzCompositeQuery[];
    };

/**
 * 分页配置（独立抽离）
 */
export interface XzPaginationConfig {
  /** 当前页码（默认1） */
  pageNum: number;
  /** 每页条数（默认10） */
  pageSize: number;
}

/**
 * 最终的通用查询模型（无兼容限制）
 * 结构分层：分页 + 排序 + 查询条件，语义清晰
 */
export interface XzUniversalQuery {
  /** 分页配置（必传，可使用默认值） */
  pagination: XzPaginationConfig;
  /** 排序配置（可选，支持多字段排序） */
  sorts?: XzSortConfig[];
  /** 高级查询条件（可选，支持嵌套复合查询） */
  query?: XzCompositeQuery;
}
