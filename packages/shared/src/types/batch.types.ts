export interface IBatch {
  _id: string;
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate?: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateBatchRequest {
  name: string;
  code: string;
  description?: string;
  startDate: string;
  endDate?: string;
}

export interface IUpdateBatchRequest {
  name?: string;
  code?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}
