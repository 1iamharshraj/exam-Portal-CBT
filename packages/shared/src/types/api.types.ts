export interface IApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message: string;
}

export interface IApiError {
  statusCode: number;
  message: string;
  errors?: { field: string; message: string }[];
}

export interface IPaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
