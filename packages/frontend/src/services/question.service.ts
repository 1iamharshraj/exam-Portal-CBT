import api from '@/lib/api';
import type {
  IQuestion,
  ICreateQuestionRequest,
  IUpdateQuestionRequest,
} from '@exam-portal/shared';

export interface QuestionsResponse {
  data: IQuestion[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QuestionFilters {
  subject?: string;
  topic?: string;
  questionType?: string;
  difficultyLevel?: string;
  search?: string;
  tags?: string;
  page?: number;
  limit?: number;
}

export interface QuestionStats {
  total: number;
  bySubject: Array<{ _id: string; count: number }>;
  byDifficulty: Array<{ _id: string; count: number }>;
  byType: Array<{ _id: string; count: number }>;
}

export const questionService = {
  getAll: async (filters: QuestionFilters = {}): Promise<QuestionsResponse> => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== '') params.set(key, String(val));
    });
    const { data } = await api.get(`/questions?${params.toString()}`);
    return data.data;
  },

  getById: async (id: string): Promise<IQuestion> => {
    const { data } = await api.get(`/questions/${id}`);
    return data.data;
  },

  create: async (question: ICreateQuestionRequest): Promise<IQuestion> => {
    const { data } = await api.post('/questions', question);
    return data.data;
  },

  update: async (
    id: string,
    question: IUpdateQuestionRequest,
  ): Promise<IQuestion> => {
    const { data } = await api.patch(`/questions/${id}`, question);
    return data.data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/questions/${id}`);
  },

  bulkImport: async (
    questions: ICreateQuestionRequest[],
  ): Promise<{ created: number; errors: Array<{ index: number; error: string }> }> => {
    const { data } = await api.post('/questions/bulk-import', { questions });
    return data.data;
  },

  getStats: async (): Promise<QuestionStats> => {
    const { data } = await api.get('/questions/stats');
    return data.data;
  },
};
