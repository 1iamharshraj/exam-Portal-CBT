import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Printer, ArrowLeft } from 'lucide-react';
import type { ITest, IQuestion, ITestAttempt, IQuestionResponse } from '@exam-portal/shared';
import { QuestionStatus, DifficultyLevel } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';

// ---------------------------------------------------------------------------
// Types for populated data
// ---------------------------------------------------------------------------

interface PopulatedStudent {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  batch?: string;
  phone?: string;
}

interface SubjectTopicStats {
  subject: string;
  topic: string;
  total: number;
  correct: number;
  incorrect: number;
}

interface DifficultyStats {
  total: number;
  attempted: number;
  correct: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDuration(startIso: string, endIso: string): string {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  if (!start || !end || end <= start) return '--';
  const totalSeconds = Math.round((end - start) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function formatDate(iso: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  if (!iso) return '--';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function percentageColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 60) return 'text-blue-600';
  if (pct >= 40) return 'text-amber-600';
  return 'text-red-600';
}

function percentageBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-50 border-emerald-200';
  if (pct >= 60) return 'bg-blue-50 border-blue-200';
  if (pct >= 40) return 'bg-amber-50 border-amber-200';
  return 'bg-red-50 border-red-200';
}

function gradeFromPercentage(pct: number): string {
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 70) return 'B+';
  if (pct >= 60) return 'B';
  if (pct >= 50) return 'C';
  if (pct >= 40) return 'D';
  return 'F';
}

function difficultyLabel(level: DifficultyLevel): string {
  switch (level) {
    case DifficultyLevel.EASY:
      return 'Easy';
    case DifficultyLevel.MEDIUM:
      return 'Medium';
    case DifficultyLevel.HARD:
      return 'Hard';
    default:
      return String(level);
  }
}

// ---------------------------------------------------------------------------
// Print styles (injected once)
// ---------------------------------------------------------------------------

const PRINT_STYLE_ID = 'report-card-print-styles';

function injectPrintStyles() {
  if (document.getElementById(PRINT_STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = PRINT_STYLE_ID;
  style.textContent = `
    @media print {
      /* Hide everything outside the report */
      body > *:not(#root) { display: none !important; }

      /* Hide app shell elements */
      nav, aside, header,
      [data-sidebar], [data-topbar],
      .no-print { display: none !important; }

      /* Force white background and black text */
      body, html, #root {
        background: #fff !important;
        color: #000 !important;
        margin: 0 !important;
        padding: 0 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      /* A4 page setup */
      @page {
        size: A4;
        margin: 12mm 15mm;
      }

      /* Report container fills entire page */
      .report-card-container {
        width: 100% !important;
        max-width: none !important;
        padding: 0 !important;
        margin: 0 !important;
      }

      /* Prevent page breaks inside tables and cards */
      .report-section {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Force colors for badges */
      .print-green { background-color: #dcfce7 !important; color: #166534 !important; }
      .print-red { background-color: #fee2e2 !important; color: #991b1b !important; }
      .print-amber { background-color: #fef3c7 !important; color: #92400e !important; }
      .print-blue { background-color: #dbeafe !important; color: #1e40af !important; }
      .print-emerald { background-color: #d1fae5 !important; color: #065f46 !important; }

      /* Table styling for print */
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #d1d5db; padding: 6px 10px; font-size: 11px; }
      th { background-color: #f3f4f6 !important; font-weight: 600; }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReportCardPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<ITestAttempt | null>(null);
  const [test, setTest] = useState<ITest | null>(null);
  const [student, setStudent] = useState<PopulatedStudent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Inject print styles on mount
  useEffect(() => {
    injectPrintStyles();
    return () => {
      const el = document.getElementById(PRINT_STYLE_ID);
      if (el) el.remove();
    };
  }, []);

  // Fetch result data
  useEffect(() => {
    if (!attemptId) return;
    const fetchData = async () => {
      try {
        const data = await testAttemptService.getResult(attemptId);
        setAttempt(data);
        // testId is populated with the full test object
        setTest((data as any).testId as ITest);
        // studentId is populated with the student user object
        const s = (data as any).studentId;
        if (s && typeof s === 'object' && s.firstName) {
          setStudent(s as PopulatedStudent);
        }
      } catch {
        toast.error('Failed to load result data');
        navigate('/student/results');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [attemptId, navigate]);

  // -------------------------------------------------------------------------
  // Computed data
  // -------------------------------------------------------------------------

  const computedData = useMemo(() => {
    if (!attempt || !test) return null;

    const totalScore = attempt.totalScore ?? 0;
    const totalMarks = test.totalMarks ?? 0;
    const percentage = totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0;

    const totalCorrect = attempt.sectionScores?.reduce((s, ss) => s + ss.correct, 0) ?? 0;
    const totalIncorrect = attempt.sectionScores?.reduce((s, ss) => s + ss.incorrect, 0) ?? 0;
    const totalUnanswered = attempt.sectionScores?.reduce((s, ss) => s + ss.unanswered, 0) ?? 0;
    const totalQuestions = totalCorrect + totalIncorrect + totalUnanswered;
    const totalAttempted = totalCorrect + totalIncorrect;
    const accuracy = totalAttempted > 0 ? Math.round((totalCorrect / totalAttempted) * 100) : 0;

    // Time taken
    const timeTaken =
      attempt.startedAt && attempt.submittedAt
        ? formatDuration(attempt.startedAt, attempt.submittedAt)
        : '--';

    // Build questions map for difficulty and subject/topic analysis
    const allQuestions: IQuestion[] = [];
    test.sections.forEach((section) => {
      const qList = (section.questionIds || []) as unknown as (IQuestion | string)[];
      qList.forEach((q) => {
        if (typeof q !== 'string' && q.questionText) {
          allQuestions.push(q as IQuestion);
        }
      });
    });

    // Map questionId -> IQuestion
    const questionMap = new Map<string, IQuestion>();
    allQuestions.forEach((q) => questionMap.set(q._id, q));

    // Map questionId -> response
    const responseMap = new Map<string, (typeof attempt.responses)[number]>();
    attempt.responses.forEach((r) => {
      responseMap.set(r.questionId, r);
    });

    // Determine if a response is correct.
    // We don't have `isCorrect` on the response, so we infer from score.
    // Approach: a question is "correct" if the student answered it AND
    // we count it under the section's `correct` count. Since we can't
    // reliably match individual correctness from the aggregate scores,
    // we use a heuristic: check the question's options or numerical answer
    // against the response.
    function isResponseCorrect(
      question: IQuestion,
      response: IQuestionResponse | undefined,
    ): boolean | null {
      if (
        !response ||
        (response.status !== QuestionStatus.ANSWERED &&
          response.status !== QuestionStatus.ANSWERED_AND_MARKED)
      ) {
        return null; // unanswered
      }

      // MCQ: check selected options against correct options
      if (response.selectedOptions && response.selectedOptions.length > 0) {
        const correctOptionIds = question.options
          .filter((o) => o.isCorrect)
          .map((o) => o.id);
        if (correctOptionIds.length === 0) return null; // can't determine
        const selected = new Set(response.selectedOptions);
        const correct = new Set(correctOptionIds);
        if (selected.size !== correct.size) return false;
        for (const id of selected) {
          if (!correct.has(id)) return false;
        }
        return true;
      }

      // Numerical: check value against correctAnswer
      if (response.numericalAnswer !== undefined) {
        const answer = question.correctAnswer;
        if (
          answer &&
          typeof answer === 'object' &&
          'value' in answer &&
          typeof (answer as any).value === 'number'
        ) {
          const numAnswer = answer as { value: number; tolerance: number };
          return (
            Math.abs(response.numericalAnswer - numAnswer.value) <=
            (numAnswer.tolerance ?? 0)
          );
        }
      }

      return null; // can't determine
    }

    // Difficulty analysis
    const difficultyMap: Record<string, DifficultyStats> = {
      [DifficultyLevel.EASY]: { total: 0, attempted: 0, correct: 0 },
      [DifficultyLevel.MEDIUM]: { total: 0, attempted: 0, correct: 0 },
      [DifficultyLevel.HARD]: { total: 0, attempted: 0, correct: 0 },
    };

    // Subject/Topic analysis
    const topicStatsMap = new Map<string, SubjectTopicStats>();

    allQuestions.forEach((q) => {
      const response = responseMap.get(q._id);
      const diff = q.difficultyLevel || DifficultyLevel.MEDIUM;
      const isAnswered =
        response?.status === QuestionStatus.ANSWERED ||
        response?.status === QuestionStatus.ANSWERED_AND_MARKED;
      const correct = isResponseCorrect(q, response);

      // Difficulty
      if (difficultyMap[diff]) {
        difficultyMap[diff].total += 1;
        if (isAnswered) {
          difficultyMap[diff].attempted += 1;
          if (correct === true) difficultyMap[diff].correct += 1;
        }
      }

      // Subject/Topic
      const key = `${q.subject}|||${q.topic}`;
      let stats = topicStatsMap.get(key);
      if (!stats) {
        stats = {
          subject: q.subject || 'General',
          topic: q.topic || 'General',
          total: 0,
          correct: 0,
          incorrect: 0,
        };
        topicStatsMap.set(key, stats);
      }
      stats.total += 1;
      if (isAnswered) {
        if (correct === true) {
          stats.correct += 1;
        } else if (correct === false) {
          stats.incorrect += 1;
        }
      }
    });

    const topicStats = Array.from(topicStatsMap.values()).sort((a, b) =>
      a.subject.localeCompare(b.subject) || a.topic.localeCompare(b.topic),
    );

    return {
      totalScore,
      totalMarks,
      percentage,
      totalCorrect,
      totalIncorrect,
      totalUnanswered,
      totalQuestions,
      totalAttempted,
      accuracy,
      timeTaken,
      difficultyMap,
      topicStats,
      hasPopulatedQuestions: allQuestions.length > 0,
      grade: gradeFromPercentage(percentage),
    };
  }, [attempt, test]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading report card...
      </div>
    );
  }

  if (!attempt || !test || !computedData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
        <p className="text-sm">Unable to load report data.</p>
        <Button variant="outline" size="sm" onClick={() => navigate('/student/results')}>
          Back to Results
        </Button>
      </div>
    );
  }

  const {
    totalScore,
    totalMarks,
    percentage,
    totalCorrect,
    totalIncorrect,
    totalUnanswered,
    totalQuestions,
    totalAttempted,
    accuracy,
    timeTaken,
    difficultyMap,
    topicStats,
    hasPopulatedQuestions,
    grade,
  } = computedData;

  const studentName = student
    ? `${student.firstName} ${student.lastName}`.trim()
    : 'Student';
  const studentEmail = student?.email ?? '';
  const studentBatch = student?.batch ?? '';

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="report-card-container max-w-4xl mx-auto px-4 py-6">
      {/* ---- Action Bar (hidden in print) ---- */}
      <div className="no-print flex items-center justify-between mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1.5"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <Button
          onClick={() => window.print()}
          className="gap-2"
        >
          <Printer className="h-4 w-4" />
          Print Report Card
        </Button>
      </div>

      {/* ================================================================ */}
      {/* REPORT CARD CONTENT                                               */}
      {/* ================================================================ */}
      <div className="space-y-6 print:space-y-4">

        {/* ---- Header ---- */}
        <div className="report-section border-b-2 border-gray-800 pb-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
              Exam Report Card
            </h1>
            <div className="h-1 w-24 bg-gray-800 mx-auto mt-2 rounded" />
          </div>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm mt-4">
            <div>
              <span className="font-semibold text-gray-600">Test:</span>{' '}
              <span className="font-medium text-gray-900">{test.title}</span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Exam Type:</span>{' '}
              <span className="font-medium text-gray-900">
                {test.examType.replace(/_/g, ' ')}
              </span>
            </div>
            <div>
              <span className="font-semibold text-gray-600">Student:</span>{' '}
              <span className="font-medium text-gray-900">{studentName}</span>
            </div>
            {studentBatch && (
              <div>
                <span className="font-semibold text-gray-600">Batch:</span>{' '}
                <span className="font-medium text-gray-900">{studentBatch}</span>
              </div>
            )}
            {studentEmail && (
              <div>
                <span className="font-semibold text-gray-600">Email:</span>{' '}
                <span className="font-medium text-gray-900">{studentEmail}</span>
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-600">Date:</span>{' '}
              <span className="font-medium text-gray-900">
                {formatDate(attempt.startedAt)}
              </span>
            </div>
            {attempt.submittedAt && (
              <div>
                <span className="font-semibold text-gray-600">Submitted:</span>{' '}
                <span className="font-medium text-gray-900">
                  {formatDateTime(attempt.submittedAt)}
                </span>
              </div>
            )}
            <div>
              <span className="font-semibold text-gray-600">Duration:</span>{' '}
              <span className="font-medium text-gray-900">
                {test.totalTimeMinutes} minutes
              </span>
            </div>
          </div>
        </div>

        {/* ---- Score Summary ---- */}
        <div className="report-section">
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-3 border-b border-gray-300 pb-1">
            Score Summary
          </h2>
          <div className="flex items-center gap-6">
            {/* Big percentage circle */}
            <div
              className={cn(
                'flex flex-col items-center justify-center w-32 h-32 rounded-full border-4',
                percentageBg(percentage),
              )}
            >
              <span
                className={cn(
                  'text-4xl font-bold leading-none',
                  percentageColor(percentage),
                )}
              >
                {percentage}%
              </span>
              <span className="text-xs font-semibold text-gray-500 mt-1">
                Grade: {grade}
              </span>
            </div>

            {/* Score details */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-2xl font-bold text-gray-900">{totalScore}</p>
                <p className="text-xs text-gray-500">
                  out of {totalMarks}
                </p>
                <p className="text-[10px] font-medium text-gray-400 uppercase mt-0.5">
                  Score
                </p>
              </div>
              <div className="text-center p-3 rounded-lg bg-emerald-50 border border-emerald-200 print-green">
                <p className="text-2xl font-bold text-emerald-700">{totalCorrect}</p>
                <p className="text-xs text-emerald-600">Correct</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50 border border-red-200 print-red">
                <p className="text-2xl font-bold text-red-700">{totalIncorrect}</p>
                <p className="text-xs text-red-600">Incorrect</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50 border border-gray-200">
                <p className="text-2xl font-bold text-gray-500">{totalUnanswered}</p>
                <p className="text-xs text-gray-500">Unanswered</p>
              </div>
            </div>
          </div>
        </div>

        {/* ---- Section Breakdown Table ---- */}
        {attempt.sectionScores && attempt.sectionScores.length > 0 && (
          <div className="report-section">
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-3 border-b border-gray-300 pb-1">
              Section Breakdown
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-300 font-semibold">
                    Section
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Score
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Correct
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Incorrect
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Unanswered
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody>
                {attempt.sectionScores.map((ss) => {
                  const section = test.sections[ss.sectionIndex];
                  if (!section) return null;
                  const sectionAttempted = ss.correct + ss.incorrect;
                  const sectionAccuracy =
                    sectionAttempted > 0
                      ? Math.round((ss.correct / sectionAttempted) * 100)
                      : 0;
                  return (
                    <tr key={ss.sectionIndex} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-300 font-medium">
                        {section.name}
                        {section.subject !== section.name && (
                          <span className="text-gray-400 ml-1 text-xs">
                            ({section.subject})
                          </span>
                        )}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300 font-semibold">
                        {ss.score}/{section.totalMarks}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300 text-emerald-700">
                        {ss.correct}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300 text-red-700">
                        {ss.incorrect}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300 text-gray-500">
                        {ss.unanswered}
                      </td>
                      <td
                        className={cn(
                          'text-center px-3 py-2 border border-gray-300 font-semibold',
                          percentageColor(sectionAccuracy),
                        )}
                      >
                        {sectionAccuracy}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              <tfoot>
                <tr className="bg-gray-100 font-semibold">
                  <td className="px-3 py-2 border border-gray-300">Total</td>
                  <td className="text-center px-3 py-2 border border-gray-300">
                    {totalScore}/{totalMarks}
                  </td>
                  <td className="text-center px-3 py-2 border border-gray-300 text-emerald-700">
                    {totalCorrect}
                  </td>
                  <td className="text-center px-3 py-2 border border-gray-300 text-red-700">
                    {totalIncorrect}
                  </td>
                  <td className="text-center px-3 py-2 border border-gray-300 text-gray-500">
                    {totalUnanswered}
                  </td>
                  <td
                    className={cn(
                      'text-center px-3 py-2 border border-gray-300 font-bold',
                      percentageColor(accuracy),
                    )}
                  >
                    {accuracy}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ---- Performance Stats ---- */}
        <div className="report-section">
          <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-3 border-b border-gray-300 pb-1">
            Performance Statistics
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-3 rounded-lg border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium uppercase">Time Taken</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{timeTaken}</p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium uppercase">Attempted</p>
              <p className="text-lg font-bold text-gray-900 mt-1">
                {totalAttempted}{' '}
                <span className="text-sm font-normal text-gray-400">/ {totalQuestions}</span>
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium uppercase">Accuracy</p>
              <p className={cn('text-lg font-bold mt-1', percentageColor(accuracy))}>
                {accuracy}%
              </p>
            </div>
            <div className="p-3 rounded-lg border border-gray-200 bg-white">
              <p className="text-xs text-gray-500 font-medium uppercase">Grade</p>
              <p className={cn('text-lg font-bold mt-1', percentageColor(percentage))}>
                {grade}
              </p>
            </div>
          </div>
        </div>

        {/* ---- Difficulty Analysis ---- */}
        {hasPopulatedQuestions && (
          <div className="report-section">
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-3 border-b border-gray-300 pb-1">
              Difficulty Analysis
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-300 font-semibold">
                    Difficulty
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Total
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Attempted
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Correct
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody>
                {(
                  [DifficultyLevel.EASY, DifficultyLevel.MEDIUM, DifficultyLevel.HARD] as const
                ).map((level) => {
                  const stats = difficultyMap[level];
                  if (!stats || stats.total === 0) return null;
                  const acc =
                    stats.attempted > 0
                      ? Math.round((stats.correct / stats.attempted) * 100)
                      : 0;
                  return (
                    <tr key={level} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-300 font-medium">
                        <span
                          className={cn(
                            'inline-block px-2 py-0.5 rounded text-xs font-semibold',
                            level === DifficultyLevel.EASY
                              ? 'bg-emerald-100 text-emerald-700 print-green'
                              : level === DifficultyLevel.MEDIUM
                                ? 'bg-amber-100 text-amber-700 print-amber'
                                : 'bg-red-100 text-red-700 print-red',
                          )}
                        >
                          {difficultyLabel(level)}
                        </span>
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300">
                        {stats.total}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300">
                        {stats.attempted}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300 text-emerald-700">
                        {stats.correct}
                      </td>
                      <td
                        className={cn(
                          'text-center px-3 py-2 border border-gray-300 font-semibold',
                          percentageColor(acc),
                        )}
                      >
                        {acc}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Subject / Topic Performance ---- */}
        {hasPopulatedQuestions && topicStats.length > 0 && (
          <div className="report-section">
            <h2 className="text-base font-bold text-gray-800 uppercase tracking-wide mb-3 border-b border-gray-300 pb-1">
              Subject &amp; Topic Performance
            </h2>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="text-left px-3 py-2 border border-gray-300 font-semibold">
                    Subject
                  </th>
                  <th className="text-left px-3 py-2 border border-gray-300 font-semibold">
                    Topic
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Questions
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Correct
                  </th>
                  <th className="text-center px-3 py-2 border border-gray-300 font-semibold">
                    Accuracy
                  </th>
                </tr>
              </thead>
              <tbody>
                {topicStats.map((ts, i) => {
                  const attempted = ts.correct + ts.incorrect;
                  const acc =
                    attempted > 0
                      ? Math.round((ts.correct / attempted) * 100)
                      : 0;
                  return (
                    <tr key={`${ts.subject}-${ts.topic}-${i}`} className="even:bg-gray-50">
                      <td className="px-3 py-2 border border-gray-300 font-medium">
                        {ts.subject}
                      </td>
                      <td className="px-3 py-2 border border-gray-300">
                        {ts.topic}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300">
                        {ts.total}
                      </td>
                      <td className="text-center px-3 py-2 border border-gray-300 text-emerald-700">
                        {ts.correct}
                      </td>
                      <td
                        className={cn(
                          'text-center px-3 py-2 border border-gray-300 font-semibold',
                          attempted > 0 ? percentageColor(acc) : 'text-gray-400',
                        )}
                      >
                        {attempted > 0 ? `${acc}%` : '--'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ---- Footer ---- */}
        <div className="report-section border-t-2 border-gray-800 pt-4 mt-6">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <p>
              Generated on{' '}
              {new Date().toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'long',
                year: 'numeric',
              })}
            </p>
            <p className="font-semibold text-gray-700">
              Exam Portal &mdash; Computer Based Testing Platform
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
