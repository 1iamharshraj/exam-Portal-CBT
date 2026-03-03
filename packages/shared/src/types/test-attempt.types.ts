export enum AttemptStatus {
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  TIMED_OUT = 'TIMED_OUT',
}

export enum QuestionStatus {
  NOT_VISITED = 'NOT_VISITED',
  NOT_ANSWERED = 'NOT_ANSWERED',
  ANSWERED = 'ANSWERED',
  MARKED_FOR_REVIEW = 'MARKED_FOR_REVIEW',
  ANSWERED_AND_MARKED = 'ANSWERED_AND_MARKED',
}

export interface IQuestionResponse {
  questionId: string;
  sectionIndex: number;
  selectedOptions?: string[];    // for MCQ
  numericalAnswer?: number;      // for numerical
  status: QuestionStatus;
  timeSpent: number;             // seconds spent on this question
}

export interface ITestAttempt {
  _id: string;
  testId: string;
  studentId: string;
  responses: IQuestionResponse[];
  startedAt: string;
  submittedAt?: string;
  status: AttemptStatus;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  totalScore?: number;
  sectionScores?: Array<{
    sectionIndex: number;
    score: number;
    correct: number;
    incorrect: number;
    unanswered: number;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface IStartTestRequest {
  testId: string;
}

export interface ISaveResponseRequest {
  questionId: string;
  sectionIndex: number;
  selectedOptions?: string[];
  numericalAnswer?: number;
  status: QuestionStatus;
  timeSpent: number;
}

export interface ISubmitTestRequest {
  attemptId: string;
}
