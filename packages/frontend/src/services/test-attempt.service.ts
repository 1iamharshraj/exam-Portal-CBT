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

  getResult: async (attemptId: string): Promise<ITestAttempt> => {
    const { data } = await api.get(`/test-attempts/${attemptId}/result`);
    return data.data;
  },

  getTestResults: async (testId: string): Promise<ITestAttempt[]> => {
    const { data } = await api.get(`/test-attempts/results/test/${testId}`);
    return data.data;
  },

  getStudentAnalytics: async (): Promise<any> => {
    const { data } = await api.get('/test-attempts/student-analytics');
    return data.data;
  },

  getLeaderboard: async (testId: string): Promise<any> => {
    const { data } = await api.get(`/test-attempts/leaderboard/test/${testId}`);
    return data.data;
  },

  getStudentRankings: async (): Promise<any> => {
    const { data } = await api.get('/test-attempts/student-rankings');
    return data.data;
  },

  getTestAnalytics: async (testId: string): Promise<{
    totalAttempts: number;
    avgScore?: number;
    maxScore?: number;
    minScore?: number;
    distribution?: Array<{ range: string; count: number }>;
    sectionAverages?: Array<{
      sectionIndex: number;
      avgScore: number;
      avgCorrect: number;
      avgIncorrect: number;
    }>;
  }> => {
    const { data } = await api.get(`/test-attempts/analytics/test/${testId}`);
    return data.data;
  },

  getLiveTestStatus: async (testId: string): Promise<any> => {
    const { data } = await api.get(`/test-attempts/live-status/test/${testId}`);
    return data.data;
  },

  recordViolation: async (
    attemptId: string,
    body: { type: string; message: string },
  ): Promise<any> => {
    const { data } = await api.patch(
      `/test-attempts/${attemptId}/violation`,
      body,
    );
    return data.data;
  },

  forceSubmitAttempt: async (attemptId: string): Promise<any> => {
    const { data } = await api.post(
      `/test-attempts/${attemptId}/force-submit`,
    );
    return data.data;
  },
};
