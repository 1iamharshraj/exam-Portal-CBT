import api from '@/lib/api';
import type { IUser, ICreateUserRequest, IUpdateUserRequest } from '@exam-portal/shared';

export interface UsersResponse {
  data: IUser[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UserFilters {
  role?: string;
  batch?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const userService = {
  getAll: async (filters: UserFilters = {}): Promise<UsersResponse> => {
    const params = new URLSearchParams();
    if (filters.role) params.set('role', filters.role);
    if (filters.batch) params.set('batch', filters.batch);
    if (filters.status) params.set('status', filters.status);
    if (filters.search) params.set('search', filters.search);
    if (filters.page) params.set('page', String(filters.page));
    if (filters.limit) params.set('limit', String(filters.limit));

    const { data } = await api.get(`/users?${params.toString()}`);
    return data.data;
  },

  getById: async (id: string): Promise<IUser> => {
    const { data } = await api.get(`/users/${id}`);
    return data.data;
  },

  create: async (userData: ICreateUserRequest): Promise<IUser> => {
    const { data } = await api.post('/users', userData);
    return data.data;
  },

  update: async (id: string, userData: IUpdateUserRequest): Promise<IUser> => {
    const { data } = await api.patch(`/users/${id}`, userData);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/users/${id}`);
  },

  bulkUpdateStatus: async (ids: string[], isActive: boolean): Promise<{ modifiedCount: number }> => {
    const { data } = await api.patch('/users/bulk-status', { ids, isActive });
    return data.data;
  },

  bulkDelete: async (ids: string[]): Promise<{ deletedCount: number }> => {
    const { data } = await api.delete('/users/bulk-delete', { data: { ids } });
    return data.data;
  },

  bulkImport: async (
    users: Array<{ email: string; firstName: string; lastName: string; role: string; phone?: string; batch?: string }>,
  ): Promise<{ created: number; errors: Array<{ email: string; error: string }> }> => {
    const { data } = await api.post('/users/bulk-import', { users });
    return data.data;
  },
};
