export type XzErrorOption = {
  field?: string;
  message: string;
  errorCode?: string;
};

export type XzHttpResponse<T = unknown> = {
  success: boolean;
  statusCode?: number;
  message: string;
  data: T;
  error?: string;
  errorCode?: string;
  errors?: XzErrorOption[];
  timestamp?: string;
};

export type XzPageData<T = unknown> = {
  records: T[];
  total: number;
  pageNum: number;
  pageSize: number;
  pages: number;
};

export type XzPageResponse<T = unknown> = XzHttpResponse<XzPageData<T>>;
