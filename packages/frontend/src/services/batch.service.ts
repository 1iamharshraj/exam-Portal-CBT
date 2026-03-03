import api from '@/lib/api';
import type { IBatch, ICreateBatchRequest, IUpdateBatchRequest } from '@exam-portal/shared';

export interface BatchesResponse {
  data: (IBatch & { studentCount: number })[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface BatchFilters {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const batchService = {
  getAll: async (filters: BatchFilters = {}): Promise<BatchesResponse> => {
    const params = new URLSearchParams();
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const { data } = await api.get(`/batches?${params.toString()}`);
    return data.data;
  },

  getById: async (id: string): Promise<IBatch> => {
    const { data } = await api.get(`/batches/${id}`);
    return data.data;
  },

  create: async (batchData: ICreateBatchRequest): Promise<IBatch> => {
    const { data } = await api.post('/batches', batchData);
    return data.data;
  },

  update: async (id: string, batchData: IUpdateBatchRequest): Promise<IBatch> => {
    const { data } = await api.patch(`/batches/${id}`, batchData);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/batches/${id}`);
  },

  bulkUpdateStatus: async (ids: string[], isActive: boolean): Promise<{ modifiedCount: number }> => {
    const { data } = await api.patch('/batches/bulk-status', { ids, isActive });
    return data.data;
  },

  bulkDelete: async (ids: string[]): Promise<{ deletedCount: number }> => {
    const { data } = await api.delete('/batches/bulk-delete', { data: { ids } });
    return data.data;
  },

  getCodes: async (): Promise<string[]> => {
    const { data } = await api.get('/batches/codes');
    return data.data;
  },
};
