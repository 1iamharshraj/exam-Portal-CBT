import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, MinusCircle, ArrowLeft, Clock } from 'lucide-react';
import type { ITest, IQuestion, ITestAttempt } from '@exam-portal/shared';
import { QuestionStatus } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';
import { MathRenderer } from '@/components/common/math-renderer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type QuestionResult = 'correct' | 'incorrect' | 'unanswered';

interface INumericalAnswer {
  value: number;
  tolerance: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds into "Xm Ys" */
function formatTimeSpent(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

/** Determine whether a student's response to a question is correct, incorrect, or unanswered */
function getQuestionResult(
  question: IQuestion,
  response: ITestAttempt['responses'][number] | undefined,
): QuestionResult {
  if (
    !response ||
    response.status === QuestionStatus.NOT_VISITED ||
    response.status === QuestionStatus.NOT_ANSWERED
  ) {
    return 'unanswered';
  }

  const { questionType, correctAnswer, options } = question;

  if (questionType === 'NUMERICAL') {
    const numerical = correctAnswer as INumericalAnswer;
    if (response.numericalAnswer === undefined || response.numericalAnswer === null) {
      return 'unanswered';
    }
    return Math.abs(response.numericalAnswer - numerical.value) <= numerical.tolerance
      ? 'correct'
      : 'incorrect';
  }

  // MCQ_SINGLE or MCQ_MULTIPLE
  const selected = response.selectedOptions || [];
  if (selected.length === 0) return 'unanswered';

  const correctOptionIds = options
    .filter((o) => o.isCorrect)
    .map((o) => (o as any)._id?.toString() || o.id);

  if (selected.length !== correctOptionIds.length) return 'incorrect';

  const allMatch = correctOptionIds.every((id) => selected.includes(id));
  return allMatch ? 'correct' : 'incorrect';
}

/** Compute marks awarded for a single question */
function getMarksAwarded(
  result: QuestionResult,
  markingScheme: { correct: number; incorrect: number; unanswered: number },
): number {
  switch (result) {
    case 'correct':
      return markingScheme.correct;
    case 'incorrect':
      return markingScheme.incorrect;
    case 'unanswered':
      return markingScheme.unanswered;
  }
}

// Palette color mapping for question result
const RESULT_PALETTE: Record<QuestionResult, string> = {
  correct: 'bg-green-500 text-white',
  incorrect: 'bg-red-500 text-white',
  unanswered: 'bg-gray-200 text-gray-600',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  MEDIUM: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  HARD: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const QUESTION_TYPE_LABELS: Record<string, string> = {
  MCQ_SINGLE: 'MCQ Single',
  MCQ_MULTIPLE: 'MCQ Multiple',
  NUMERICAL: 'Numerical',
  ASSERTION_REASON: 'Assertion & Reason',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SolutionReviewPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<ITestAttempt | null>(null);
  const [test, setTest] = useState<ITest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (!attemptId) return;
    const fetchResult = async () => {
      try {
        const data = await testAttemptService.getResult(attemptId);
        setAttempt(data);
        setTest((data as any).testId as ITest);
      } catch {
        toast.error('Failed to load solution review');
        navigate('/student/results');
      } finally {
        setIsLoading(false);
      }
    };
    fetchResult();
  }, [attemptId, navigate]);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const getSectionQuestions = useCallback(
    (sectionIdx: number): IQuestion[] => {
      if (!test) return [];
      const section = test.sections[sectionIdx];
      if (!section) return [];
      return (section.questionIds || []) as unknown as IQuestion[];
    },
    [test],
  );

  const getResponse = useCallback(
    (questionId: string, sectionIdx: number) => {
      if (!attempt) return undefined;
      return attempt.responses.find(
        (r) => r.questionId === questionId && r.sectionIndex === sectionIdx,
      );
    },
    [attempt],
  );

  const getQuestionId = (q: IQuestion | string): string =>
    typeof q === 'string' ? q : q._id;

  // -----------------------------------------------------------------------
  // Navigation
  // -----------------------------------------------------------------------

  const navigateToQuestion = (sectionIdx: number, questionIdx: number) => {
    setActiveSectionIdx(sectionIdx);
    setActiveQuestionIdx(questionIdx);
  };

  // -----------------------------------------------------------------------
  // Render guards
  // -----------------------------------------------------------------------

  if (isLoading || !attempt || !test) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading solution review...
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Computed stats
  // -----------------------------------------------------------------------

  const percentage =
    test.totalMarks > 0
      ? Math.round(((attempt.totalScore || 0) / test.totalMarks) * 100)
      : 0;

  const totalCorrect =
    attempt.sectionScores?.reduce((s, ss) => s + ss.correct, 0) || 0;
  const totalIncorrect =
    attempt.sectionScores?.reduce((s, ss) => s + ss.incorrect, 0) || 0;
  const totalUnanswered =
    attempt.sectionScores?.reduce((s, ss) => s + ss.unanswered, 0) || 0;

  // Current section data
  const section = test.sections[activeSectionIdx];
  const sectionQuestions = getSectionQuestions(activeSectionIdx);
  const currentQuestion = sectionQuestions[activeQuestionIdx];
  const isPopulated =
    typeof currentQuestion !== 'string' && currentQuestion?.questionText;
  const currentQId = isPopulated ? currentQuestion._id : undefined;
  const currentResponse = currentQId
    ? getResponse(currentQId, activeSectionIdx)
    : undefined;
  const currentResult = isPopulated
    ? getQuestionResult(currentQuestion as IQuestion, currentResponse)
    : 'unanswered';
  const currentMarks = isPopulated && section
    ? getMarksAwarded(currentResult, section.markingScheme)
    : 0;

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* ----------------------------------------------------------------- */}
      {/* Top summary bar                                                    */}
      {/* ----------------------------------------------------------------- */}
      <div className="border-b bg-card shrink-0">
        {/* Row 1: Title + score */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => navigate('/student/results')}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-0">
              <h2 className="text-base font-heading font-semibold truncate">
                {test.title} — Solution Review
              </h2>
              <p className="text-xs text-muted-foreground">
                {test.examType.replace(/_/g, ' ')} · Submitted{' '}
                {attempt.submittedAt
                  ? new Date(attempt.submittedAt).toLocaleString('en-IN')
                  : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {/* Score */}
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold">
                {attempt.totalScore ?? 0}/{test.totalMarks}
              </p>
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  percentage >= 60
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : percentage >= 40
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                )}
              >
                {percentage}%
              </Badge>
            </div>

            {/* Stats pills */}
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                <strong className="text-green-600">{totalCorrect}</strong>
              </span>
              <span className="flex items-center gap-1">
                <XCircle className="h-3.5 w-3.5 text-red-500" />
                <strong className="text-red-600">{totalIncorrect}</strong>
              </span>
              <span className="flex items-center gap-1">
                <MinusCircle className="h-3.5 w-3.5 text-gray-400" />
                <strong className="text-gray-500">{totalUnanswered}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Row 2: Section-wise score breakdown */}
        {attempt.sectionScores && attempt.sectionScores.length > 1 && (
          <div className="flex items-center gap-4 px-4 pb-2 text-xs text-muted-foreground overflow-x-auto">
            {attempt.sectionScores.map((ss, i) => {
              const sec = test.sections[ss.sectionIndex];
              if (!sec) return null;
              return (
                <span key={i} className="whitespace-nowrap">
                  {sec.name}:{' '}
                  <strong className="text-foreground">
                    {ss.score}/{sec.totalMarks}
                  </strong>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Section tabs                                                       */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex border-b bg-card/50 shrink-0">
        {test.sections.map((s, i) => (
          <button
            key={i}
            onClick={() => navigateToQuestion(i, 0)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
              i === activeSectionIdx
                ? 'border-primary text-primary bg-primary/5'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Main content area: Question panel + Question palette sidebar       */}
      {/* ----------------------------------------------------------------- */}
      <div className="flex flex-1 min-h-0">
        {/* Question content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isPopulated ? (
            <div className="max-w-3xl mx-auto space-y-6">
              {/* Question header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {activeQuestionIdx + 1} of {sectionQuestions.length}
                  </span>

                  {/* Status indicator */}
                  {currentResult === 'correct' && (
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Correct
                    </Badge>
                  )}
                  {currentResult === 'incorrect' && (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 gap-1">
                      <XCircle className="h-3 w-3" />
                      Incorrect
                    </Badge>
                  )}
                  {currentResult === 'unanswered' && (
                    <Badge variant="secondary" className="gap-1">
                      <MinusCircle className="h-3 w-3" />
                      Unanswered
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {/* Time spent */}
                  {currentResponse?.timeSpent !== undefined &&
                    currentResponse.timeSpent > 0 && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeSpent(currentResponse.timeSpent)}
                      </span>
                    )}

                  {/* Marks awarded */}
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs font-semibold',
                      currentMarks > 0 && 'border-green-300 text-green-700',
                      currentMarks < 0 && 'border-red-300 text-red-700',
                      currentMarks === 0 && 'text-muted-foreground',
                    )}
                  >
                    {currentMarks > 0 ? `+${currentMarks}` : currentMarks}
                  </Badge>

                  {/* Type badge */}
                  <Badge variant="secondary" className="text-xs">
                    {QUESTION_TYPE_LABELS[
                      (currentQuestion as IQuestion).questionType
                    ] || (currentQuestion as IQuestion).questionType}
                  </Badge>

                  {/* Difficulty badge */}
                  <Badge
                    className={cn(
                      'text-xs',
                      DIFFICULTY_COLORS[
                        (currentQuestion as IQuestion).difficultyLevel
                      ] || 'bg-muted text-muted-foreground',
                    )}
                  >
                    {(currentQuestion as IQuestion).difficultyLevel
                      ?.charAt(0)
                      .toUpperCase() +
                      (currentQuestion as IQuestion).difficultyLevel
                        ?.slice(1)
                        .toLowerCase()}
                  </Badge>
                </div>
              </div>

              {/* Question text */}
              <div className="rounded-lg border bg-card p-5">
                <MathRenderer
                  html={(currentQuestion as IQuestion).questionText}
                  className="text-base leading-relaxed"
                />
              </div>

              {/* MCQ Options */}
              {((currentQuestion as IQuestion).questionType === 'MCQ_SINGLE' ||
                (currentQuestion as IQuestion).questionType ===
                  'MCQ_MULTIPLE') && (
                <div className="space-y-3">
                  {((currentQuestion as IQuestion).options || []).map(
                    (opt, optIdx) => {
                      const optId =
                        (opt as any)._id?.toString() || opt.id;
                      const isCorrectOption = opt.isCorrect;
                      const isSelected = (
                        currentResponse?.selectedOptions || []
                      ).includes(optId);

                      // Determine option styling
                      let optionStyle = '';
                      let iconEl = null;

                      if (isCorrectOption) {
                        // Correct answer — always highlight green
                        optionStyle =
                          'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30';
                        iconEl = (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                        );
                      } else if (isSelected && !isCorrectOption) {
                        // Wrong selection — red
                        optionStyle =
                          'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30';
                        iconEl = (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
                        );
                      } else {
                        // Unselected, not correct — neutral
                        optionStyle = 'border-muted';
                        iconEl = (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/20 shrink-0" />
                        );
                      }

                      return (
                        <div
                          key={optIdx}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-4',
                            optionStyle,
                          )}
                        >
                          {iconEl}
                          <span className="text-sm flex items-baseline gap-1">
                            <strong className="mr-1">
                              {String.fromCharCode(65 + optIdx)}.
                            </strong>
                            <MathRenderer
                              html={opt.text}
                              className="inline"
                            />
                          </span>
                          {isSelected && (
                            <Badge
                              variant="outline"
                              className="ml-auto text-[10px] shrink-0"
                            >
                              Your answer
                            </Badge>
                          )}
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              {/* Numerical answer comparison */}
              {(currentQuestion as IQuestion).questionType === 'NUMERICAL' && (
                <div className="rounded-lg border bg-card p-5 space-y-4">
                  <h4 className="text-sm font-semibold">Numerical Answer</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Student's answer */}
                    <div
                      className={cn(
                        'rounded-md border p-4',
                        currentResult === 'correct'
                          ? 'border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                          : currentResult === 'incorrect'
                            ? 'border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30'
                            : 'border-muted bg-muted/50',
                      )}
                    >
                      <p className="text-xs text-muted-foreground mb-1">
                        Your Answer
                      </p>
                      <p className="text-lg font-semibold">
                        {currentResponse?.numericalAnswer !== undefined &&
                        currentResponse?.numericalAnswer !== null
                          ? currentResponse.numericalAnswer
                          : '—'}
                      </p>
                    </div>

                    {/* Correct answer */}
                    <div className="rounded-md border border-green-300 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
                      <p className="text-xs text-muted-foreground mb-1">
                        Correct Answer
                      </p>
                      <p className="text-lg font-semibold text-green-700 dark:text-green-400">
                        {(
                          (currentQuestion as IQuestion)
                            .correctAnswer as INumericalAnswer
                        ).value}
                      </p>
                      {(
                        (currentQuestion as IQuestion)
                          .correctAnswer as INumericalAnswer
                      ).tolerance > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Tolerance: &plusmn;
                          {
                            (
                              (currentQuestion as IQuestion)
                                .correctAnswer as INumericalAnswer
                            ).tolerance
                          }
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Explanation / Solution */}
              {(currentQuestion as IQuestion).explanation && (
                <div className="rounded-lg border border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/20 p-5 space-y-2">
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    Solution / Explanation
                  </h4>
                  <MathRenderer
                    html={(currentQuestion as IQuestion).explanation!}
                    className="text-sm leading-relaxed text-foreground"
                  />
                </div>
              )}

              {/* Navigation buttons */}
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    activeSectionIdx === 0 && activeQuestionIdx === 0
                  }
                  onClick={() => {
                    if (activeQuestionIdx > 0) {
                      setActiveQuestionIdx(activeQuestionIdx - 1);
                    } else if (activeSectionIdx > 0) {
                      const prevSectionQuestions = getSectionQuestions(
                        activeSectionIdx - 1,
                      );
                      setActiveSectionIdx(activeSectionIdx - 1);
                      setActiveQuestionIdx(
                        Math.max(0, prevSectionQuestions.length - 1),
                      );
                    }
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={
                    activeSectionIdx === test.sections.length - 1 &&
                    activeQuestionIdx === sectionQuestions.length - 1
                  }
                  onClick={() => {
                    if (activeQuestionIdx < sectionQuestions.length - 1) {
                      setActiveQuestionIdx(activeQuestionIdx + 1);
                    } else if (
                      activeSectionIdx <
                      test.sections.length - 1
                    ) {
                      setActiveSectionIdx(activeSectionIdx + 1);
                      setActiveQuestionIdx(0);
                    }
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-12">
              Question data unavailable
            </div>
          )}
        </div>

        {/* ------------------------------------------------------------- */}
        {/* Right sidebar: Question palette                                */}
        {/* ------------------------------------------------------------- */}
        <div className="w-64 border-l bg-card flex flex-col shrink-0 hidden md:flex">
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {section.name} — Question Palette
            </p>
            {/* Legend */}
            <div className="grid grid-cols-1 gap-1 text-[10px]">
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-green-500" /> Correct
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-red-500" /> Incorrect
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded bg-gray-200" /> Unanswered
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {sectionQuestions.map((q, qIdx) => {
                const qIsPopulated =
                  typeof q !== 'string' && q.questionText;
                const qId = getQuestionId(q as IQuestion | string);
                const response = getResponse(qId, activeSectionIdx);
                const result = qIsPopulated
                  ? getQuestionResult(q as IQuestion, response)
                  : 'unanswered';
                const isCurrent = qIdx === activeQuestionIdx;

                return (
                  <button
                    key={qIdx}
                    onClick={() => navigateToQuestion(activeSectionIdx, qIdx)}
                    className={cn(
                      'h-9 w-9 rounded text-xs font-medium transition-all',
                      RESULT_PALETTE[result],
                      isCurrent && 'ring-2 ring-offset-1 ring-blue-500',
                    )}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section summary in sidebar */}
          {attempt.sectionScores && (
            <div className="p-3 border-t text-xs text-muted-foreground space-y-1">
              {(() => {
                const ss = attempt.sectionScores.find(
                  (s) => s.sectionIndex === activeSectionIdx,
                );
                if (!ss) return null;
                return (
                  <>
                    <p>
                      Score:{' '}
                      <strong className="text-foreground">
                        {ss.score}/{section.totalMarks}
                      </strong>
                    </p>
                    <p>
                      Correct:{' '}
                      <strong className="text-green-600">{ss.correct}</strong>
                    </p>
                    <p>
                      Incorrect:{' '}
                      <strong className="text-red-600">{ss.incorrect}</strong>
                    </p>
                    <p>
                      Unanswered:{' '}
                      <strong>{ss.unanswered}</strong>
                    </p>
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
