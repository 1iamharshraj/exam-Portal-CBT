export enum QuestionType {
  MCQ_SINGLE = 'MCQ_SINGLE',
  MCQ_MULTIPLE = 'MCQ_MULTIPLE',
  NUMERICAL = 'NUMERICAL',
  ASSERTION_REASON = 'ASSERTION_REASON',
}

export enum DifficultyLevel {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
}

export interface IOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

export interface INumericalAnswer {
  value: number;
  tolerance: number;
}

export interface IQuestion {
  _id: string;
  questionText: string;
  questionType: QuestionType;
  options: IOption[];
  correctAnswer: string[] | INumericalAnswer;
  subject: string;
  topic: string;
  subtopic?: string;
  difficultyLevel: DifficultyLevel;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  tags: string[];
  createdBy: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateQuestionRequest {
  questionText: string;
  questionType: QuestionType;
  options: Omit<IOption, 'id'>[];
  correctAnswer: string[] | INumericalAnswer;
  subject: string;
  topic: string;
  subtopic?: string;
  difficultyLevel: DifficultyLevel;
  marks: number;
  negativeMarks: number;
  explanation?: string;
  tags?: string[];
}

export interface IUpdateQuestionRequest {
  questionText?: string;
  questionType?: QuestionType;
  options?: Omit<IOption, 'id'>[];
  correctAnswer?: string[] | INumericalAnswer;
  subject?: string;
  topic?: string;
  subtopic?: string;
  difficultyLevel?: DifficultyLevel;
  marks?: number;
  negativeMarks?: number;
  explanation?: string;
  tags?: string[];
  isActive?: boolean;
}

export const SUBJECTS = ['Physics', 'Chemistry', 'Mathematics', 'Botany', 'Zoology'] as const;

export const SUBJECT_TOPICS: Record<string, string[]> = {
  Physics: [
    'Mechanics', 'Thermodynamics', 'Waves & Oscillations', 'Optics',
    'Electrostatics', 'Current Electricity', 'Magnetism', 'EMI & AC',
    'Modern Physics', 'Semiconductor', 'Units & Measurements',
  ],
  Chemistry: [
    'Physical Chemistry', 'Organic Chemistry', 'Inorganic Chemistry',
    'Chemical Bonding', 'Thermochemistry', 'Electrochemistry',
    'Chemical Kinetics', 'Coordination Chemistry', 'Polymers',
  ],
  Mathematics: [
    'Algebra', 'Trigonometry', 'Coordinate Geometry', 'Calculus',
    'Vectors & 3D', 'Probability & Statistics', 'Sets & Relations',
    'Matrices & Determinants', 'Sequences & Series', 'Complex Numbers',
  ],
  Botany: [
    'Cell Biology', 'Plant Anatomy', 'Plant Physiology', 'Genetics',
    'Ecology', 'Plant Kingdom', 'Morphology of Plants',
  ],
  Zoology: [
    'Human Physiology', 'Animal Kingdom', 'Reproduction', 'Evolution',
    'Biotechnology', 'Human Health & Disease', 'Biomolecules',
  ],
};
