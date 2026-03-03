export enum ExamType {
  JEE_MAIN = 'JEE_MAIN',
  JEE_ADVANCED = 'JEE_ADVANCED',
  NEET = 'NEET',
  CUSTOM = 'CUSTOM',
}

export enum TestStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
}

export interface IMarkingScheme {
  correct: number;
  incorrect: number;
  unanswered: number;
  partialMarking?: boolean;
}

export interface ITestSection {
  name: string;
  subject: string;
  questionCount: number;
  totalMarks: number;
  timeLimit?: number;
  markingScheme: IMarkingScheme;
  questionIds: string[];
}

export interface ITest {
  _id: string;
  title: string;
  description?: string;
  examType: ExamType;
  sections: ITestSection[];
  totalTimeMinutes: number;
  hasSectionTimeLimit: boolean;
  totalMarks: number;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  startTime?: string;
  endTime?: string;
  status: TestStatus;
  assignedBatches: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateTestRequest {
  title: string;
  description?: string;
  examType: ExamType;
  sections: ITestSection[];
  totalTimeMinutes: number;
  hasSectionTimeLimit: boolean;
  randomizeQuestions: boolean;
  randomizeOptions: boolean;
  startTime?: string;
  endTime?: string;
  assignedBatches?: string[];
}

export interface IUpdateTestRequest {
  title?: string;
  description?: string;
  sections?: ITestSection[];
  totalTimeMinutes?: number;
  hasSectionTimeLimit?: boolean;
  randomizeQuestions?: boolean;
  randomizeOptions?: boolean;
  startTime?: string;
  endTime?: string;
  status?: TestStatus;
  assignedBatches?: string[];
}

// Preset configurations
export const EXAM_PRESETS: Record<
  string,
  {
    label: string;
    totalTime: number;
    sections: Array<{
      name: string;
      subject: string;
      questionCount: number;
      markingScheme: IMarkingScheme;
    }>;
  }
> = {
  [ExamType.JEE_MAIN]: {
    label: 'JEE Main',
    totalTime: 180,
    sections: [
      { name: 'Physics', subject: 'Physics', questionCount: 25, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
      { name: 'Chemistry', subject: 'Chemistry', questionCount: 25, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
      { name: 'Mathematics', subject: 'Mathematics', questionCount: 25, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
    ],
  },
  [ExamType.NEET]: {
    label: 'NEET',
    totalTime: 180,
    sections: [
      { name: 'Physics', subject: 'Physics', questionCount: 45, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
      { name: 'Chemistry', subject: 'Chemistry', questionCount: 45, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
      { name: 'Botany', subject: 'Botany', questionCount: 45, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
      { name: 'Zoology', subject: 'Zoology', questionCount: 45, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
    ],
  },
  [ExamType.JEE_ADVANCED]: {
    label: 'JEE Advanced',
    totalTime: 180,
    sections: [
      { name: 'Physics', subject: 'Physics', questionCount: 18, markingScheme: { correct: 4, incorrect: -2, unanswered: 0, partialMarking: true } },
      { name: 'Chemistry', subject: 'Chemistry', questionCount: 18, markingScheme: { correct: 4, incorrect: -2, unanswered: 0, partialMarking: true } },
      { name: 'Mathematics', subject: 'Mathematics', questionCount: 18, markingScheme: { correct: 4, incorrect: -2, unanswered: 0, partialMarking: true } },
    ],
  },
};
