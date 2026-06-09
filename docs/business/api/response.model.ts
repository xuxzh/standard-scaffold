/**
 * 通用分页请求入参（列表查询时的分页条件）
 */
export interface XzPageQuery {
  /** 当前页码（默认第1页，前端可默认传1） */
  pageNum: number;
  /** 每页显示条数（默认每页10条，可根据业务调整默认值） */
  pageSize: number;
  /** 可选：排序字段（如 "createTime"） */
  sortField?: string;
  /** 可选：排序方向（升序/降序） */
  sortOrder?: 'asc' | 'desc';
}

/**
 * 类型安全的分页查询入参。
 * TFilter：业务筛选字段，例如包装类型的 typeCode/typeName/isRecyclable。
 */
export type XzPagedRequest<TFilter extends object = object> = XzPageQuery & TFilter;

/**
 * 通用分页数据载体（承载分页的核心数据，作为响应体的 data 字段值）
 */
export interface XzPageData<T = unknown> {
  /** 当前页的业务数据列表 */
  records: T[];
  /** 总记录数（用于计算总页数） */
  total: number;
  /** 当前页码（和请求入参的 pageNum 对应） */
  pageNum: number;
  /** 每页显示条数（和请求入参的 pageSize 对应） */
  pageSize: number;
  /** 总页数（可选，可由 total / pageSize 计算得出，后端可返回简化前端计算） */
  pages?: number;
}

// 先引入你已定义（或优化后）的 XzHttpResponse 接口
export interface XzHttpResponse<T = unknown> {
  /** 请求是否成功 */
  success: boolean;
  /** 状态码 */
  statusCode?: number;
  /** 消息 */
  message: string;
  /** 核心业务数据 */
  data: T;
  /** http错误类型名称:Bad Request  */
  error?: string;
  /** 自定义错误码（可选，用于前端逻辑处理）如:INVALID_EMAIL */
  errorCode?: string;
  /** 详细错误列表（如验证错误） */
  errors?: XzErrorOption[];
  /** 请求时间戳（ISO 字符串，避免 JSON 序列化后的 Date 类型歧义） */
  timestamp?: string;
}

/**
 * 完整的分页响应模型（组合通用响应和分页数据载体）
 * T：泛型，对应分页列表中每条业务数据的类型
 */
export type XzPageResponse<T = unknown> = XzHttpResponse<XzPageData<T>>;

/**
 * 错误选项（用于详细错误列表）
 */
/**
 * 详细错误项结构（用于验证错误、多字段错误等场景）
 */
export interface XzErrorOption {
  /** 错误关联的字段（如表单字段名） */
  field?: string;
  /** 具体字段的错误信息 */
  message: string;
  /** 字段错误码（可选） */
  errorCode?: string;
}
