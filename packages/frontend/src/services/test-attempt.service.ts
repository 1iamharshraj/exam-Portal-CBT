import api from '@/lib/api';
import type { ITest, ITestAttempt, QuestionStatus } from '@exam-portal/shared';

export const testAttemptService = {
  getAvailableTests: async (): Promise<ITest[]> => {
    const { data } = await api.get('/test-attempts/available-tests');
    return data.data;
  },

  getMyAttempts: async (): Promise<ITestAttempt[]> => {
    const { data } = await api.get('/test-attempts/my-attempts');
    return data.data;
  },

  startTest: async (testId: string): Promise<ITestAttempt> => {
    const { data } = await api.post('/test-attempts/start', { testId });
    return data.data;
  },

  getAttempt: async (attemptId: string): Promise<ITestAttempt> => {
    const { data } = await api.get(`/test-attempts/${attemptId}`);
    return data.data;
  },

  saveResponse: async (
    attemptId: string,
    response: {
      questionId: string;
      sectionIndex: number;
      selectedOptions?: string[];
      numericalAnswer?: number;
      status: QuestionStatus;
      timeSpent: number;
    },
  ): Promise<ITestAttempt> => {
    const { data } = await api.patch(
      `/test-attempts/${attemptId}/response`,
      response,
    );
    return data.data;
  },

  updateNavigation: async (
    attemptId: string,
    sectionIndex: number,
    questionIndex: number,
  ): Promise<ITestAttempt> => {
    const { data } = await api.patch(
      `/test-attempts/${attemptId}/navigate`,
      { sectionIndex, questionIndex },
    );
    return data.data;
  },

  submitTest: async (attemptId: string): Promise<ITestAttempt> => {
    const { data } = await api.post(
      `/test-attempts/${attemptId}/submit`,
    );
    return data.data;
  },
};
