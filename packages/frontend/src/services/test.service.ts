import api from '@/lib/api';
import type { ITest, ICreateTestRequest, IUpdateTestRequest } from '@exam-portal/shared';

export interface TestsResponse {
  data: ITest[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TestFilters {
  status?: string;
  examType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const testService = {
  getAll: async (filters: TestFilters = {}): Promise<TestsResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '') params.set(key, String(val));
    });
    const { data } = await api.get(`/tests?${params.toString()}`);
    return data.data;
  },

  getById: async (id: string): Promise<ITest> => {
    const { data } = await api.get(`/tests/${id}`);
    return data.data;
  },

  create: async (test: ICreateTestRequest): Promise<ITest> => {
    const { data } = await api.post('/tests', test);
    return data.data;
  },

  update: async (id: string, test: IUpdateTestRequest): Promise<ITest> => {
    const { data } = await api.patch(`/tests/${id}`, test);
    return data.data;
  },

  publish: async (id: string): Promise<ITest> => {
    const { data } = await api.patch(`/tests/${id}/publish`);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/tests/${id}`);
  },

  updateSectionQuestions: async (
    testId: string,
    sectionIndex: number,
    questionIds: string[],
  ): Promise<ITest> => {
    const { data } = await api.patch(
      `/tests/${testId}/sections/${sectionIndex}/questions`,
      { questionIds },
    );
    return data.data;
  },

  autoPickQuestions: async (
    testId: string,
    sectionIndex: number,
    filters: { subject?: string; topic?: string; difficultyLevel?: string; count: number },
  ): Promise<ITest> => {
    const { data } = await api.post(
      `/tests/${testId}/sections/${sectionIndex}/auto-pick`,
      filters,
    );
    return data.data;
  },
};
