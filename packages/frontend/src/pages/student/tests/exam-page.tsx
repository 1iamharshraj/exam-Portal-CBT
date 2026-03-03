import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import type { ITest, IQuestion, ITestAttempt } from '@exam-portal/shared';
import { QuestionStatus, AttemptStatus } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';

// NTA-style colors
const STATUS_COLORS: Record<string, string> = {
  [QuestionStatus.NOT_VISITED]: 'bg-gray-200 text-gray-600',
  [QuestionStatus.NOT_ANSWERED]: 'bg-red-500 text-white',
  [QuestionStatus.ANSWERED]: 'bg-green-500 text-white',
  [QuestionStatus.MARKED_FOR_REVIEW]: 'bg-purple-500 text-white',
  [QuestionStatus.ANSWERED_AND_MARKED]: 'bg-purple-500 text-white ring-2 ring-green-500',
};

export function ExamPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<ITestAttempt | null>(null);
  const [test, setTest] = useState<ITest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [activeQuestionIdx, setActiveQuestionIdx] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [numericalInput, setNumericalInput] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const questionTimerRef = useRef(0);

  const fetchAttempt = useCallback(async () => {
    if (!attemptId) return;
    setIsLoading(true);
    try {
      const data = await testAttemptService.getAttempt(attemptId);
      setAttempt(data);
      const testData = (data as any).testId as ITest;
      setTest(testData);
      setActiveSectionIdx(data.currentSectionIndex || 0);
      setActiveQuestionIdx(data.currentQuestionIndex || 0);

      // Calculate time remaining
      const elapsed = (Date.now() - new Date(data.startedAt).getTime()) / 1000;
      const totalSeconds = testData.totalTimeMinutes * 60;
      setTimeLeft(Math.max(0, totalSeconds - elapsed));
    } catch {
      toast.error('Failed to load exam');
      navigate('/student/tests');
    } finally {
      setIsLoading(false);
    }
  }, [attemptId, navigate]);

  useEffect(() => {
    fetchAttempt();
  }, [fetchAttempt]);

  // Countdown timer
  useEffect(() => {
    if (!attempt || attempt.status !== AttemptStatus.IN_PROGRESS) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleSubmit(true);
          return 0;
        }
        return prev - 1;
      });
      questionTimerRef.current += 1;
    }, 1000);
    return () => clearInterval(interval);
  }, [attempt?.status]);

  // Load current question's response when navigating
  useEffect(() => {
    if (!attempt || !test) return;
    const section = test.sections[activeSectionIdx];
    if (!section) return;
    const questions = section.questionIds as unknown as IQuestion[];
    const q = questions[activeQuestionIdx];
    if (!q) return;

    const qId = typeof q === 'string' ? q : q._id;
    const response = attempt.responses.find(
      (r) => r.questionId === qId && r.sectionIndex === activeSectionIdx,
    );

    setSelectedOptions(response?.selectedOptions || []);
    setNumericalInput(
      response?.numericalAnswer !== undefined ? String(response.numericalAnswer) : '',
    );
    questionTimerRef.current = response?.timeSpent || 0;
  }, [activeSectionIdx, activeQuestionIdx, attempt, test]);

  if (isLoading || !test || !attempt) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background z-50">
        <p className="text-muted-foreground">Loading exam...</p>
      </div>
    );
  }

  if (attempt.status !== AttemptStatus.IN_PROGRESS) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50 gap-4">
        <p className="text-lg font-medium">Test has been submitted</p>
        {attempt.totalScore !== undefined && (
          <p className="text-2xl font-bold">
            Score: {attempt.totalScore}/{test.totalMarks}
          </p>
        )}
        <Button onClick={() => navigate('/student/tests')}>Back to Tests</Button>
      </div>
    );
  }

  const section = test.sections[activeSectionIdx];
  const sectionQuestions = (section?.questionIds || []) as unknown as IQuestion[];
  const currentQuestion = sectionQuestions[activeQuestionIdx];
  const currentQId = typeof currentQuestion === 'string' ? currentQuestion : currentQuestion?._id;

  const currentResponse = attempt.responses.find(
    (r) => r.questionId === currentQId && r.sectionIndex === activeSectionIdx,
  );

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return h > 0
      ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
      : `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const saveCurrentResponse = async (status: QuestionStatus) => {
    if (!attemptId || !currentQId) return;
    setIsSaving(true);
    try {
      const data = await testAttemptService.saveResponse(attemptId, {
        questionId: currentQId,
        sectionIndex: activeSectionIdx,
        selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
        numericalAnswer: numericalInput ? parseFloat(numericalInput) : undefined,
        status,
        timeSpent: questionTimerRef.current,
      });
      setAttempt(data);
    } catch {
      // Silently fail for auto-save
    } finally {
      setIsSaving(false);
    }
  };

  const navigateToQuestion = async (sectionIdx: number, questionIdx: number) => {
    // Auto-save current if it was visited
    if (currentResponse?.status === QuestionStatus.NOT_VISITED) {
      const hasAnswer = selectedOptions.length > 0 || numericalInput;
      await saveCurrentResponse(
        hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED,
      );
    }

    setActiveSectionIdx(sectionIdx);
    setActiveQuestionIdx(questionIdx);
    questionTimerRef.current = 0;
  };

  const handleOptionToggle = (optionId: string) => {
    const q = currentQuestion as IQuestion;
    if (q.questionType === 'MCQ_SINGLE') {
      setSelectedOptions([optionId]);
    } else {
      setSelectedOptions((prev) =>
        prev.includes(optionId)
          ? prev.filter((o) => o !== optionId)
          : [...prev, optionId],
      );
    }
  };

  const handleSaveAndNext = async () => {
    const hasAnswer = selectedOptions.length > 0 || numericalInput;
    await saveCurrentResponse(
      hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED,
    );
    // Move to next question
    if (activeQuestionIdx < sectionQuestions.length - 1) {
      setActiveQuestionIdx((p) => p + 1);
    } else if (activeSectionIdx < test.sections.length - 1) {
      setActiveSectionIdx((p) => p + 1);
      setActiveQuestionIdx(0);
    }
    questionTimerRef.current = 0;
  };

  const handleMarkForReview = async () => {
    const hasAnswer = selectedOptions.length > 0 || numericalInput;
    await saveCurrentResponse(
      hasAnswer ? QuestionStatus.ANSWERED_AND_MARKED : QuestionStatus.MARKED_FOR_REVIEW,
    );
    if (activeQuestionIdx < sectionQuestions.length - 1) {
      setActiveQuestionIdx((p) => p + 1);
    }
    questionTimerRef.current = 0;
  };

  const handleClearResponse = () => {
    setSelectedOptions([]);
    setNumericalInput('');
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!attemptId) return;
    if (!autoSubmit) {
      const unanswered = attempt.responses.filter(
        (r) =>
          r.status === QuestionStatus.NOT_VISITED ||
          r.status === QuestionStatus.NOT_ANSWERED,
      ).length;
      if (
        !confirm(
          `Submit test? ${unanswered > 0 ? `You have ${unanswered} unanswered question(s). ` : ''}This cannot be undone.`,
        )
      )
        return;
    }

    try {
      // Save current question first
      const hasAnswer = selectedOptions.length > 0 || numericalInput;
      if (currentResponse?.status !== QuestionStatus.NOT_VISITED) {
        await saveCurrentResponse(
          hasAnswer ? QuestionStatus.ANSWERED : QuestionStatus.NOT_ANSWERED,
        );
      }
      const result = await testAttemptService.submitTest(attemptId);
      setAttempt(result);
      toast.success('Test submitted successfully!');
    } catch {
      toast.error('Failed to submit test');
    }
  };

  const isPopulated = typeof currentQuestion !== 'string' && currentQuestion?.questionText;

  return (
    <div className="fixed inset-0 flex flex-col bg-background z-50">
      {/* Top bar */}
      <div className="h-12 border-b bg-card flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <span className="font-heading font-semibold text-sm">{test.title}</span>
          <Badge variant="outline" className="text-xs">
            {test.examType.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            'font-mono text-sm font-bold px-3 py-1 rounded',
            timeLeft < 300 ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-muted',
          )}>
            {formatTime(timeLeft)}
          </div>
          <Button size="sm" variant="destructive" onClick={() => handleSubmit()}>
            Submit Test
          </Button>
        </div>
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Main question area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Section tabs */}
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

          {/* Question content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isPopulated ? (
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    Question {activeQuestionIdx + 1} of {sectionQuestions.length}
                  </span>
                  <div className="flex gap-2">
                    <Badge variant="outline" className="text-xs">
                      +{section.markingScheme.correct} / {section.markingScheme.incorrect}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {(currentQuestion as IQuestion).questionType.replace('_', ' ')}
                    </Badge>
                  </div>
                </div>

                <div
                  className="text-base leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: (currentQuestion as IQuestion).questionText }}
                />

                {/* Options for MCQ */}
                {((currentQuestion as IQuestion).questionType === 'MCQ_SINGLE' ||
                  (currentQuestion as IQuestion).questionType === 'MCQ_MULTIPLE') && (
                  <div className="space-y-3">
                    {((currentQuestion as IQuestion).options || []).map((opt, optIdx) => {
                      const optId = (opt as any)._id?.toString() || opt.text;
                      const isSelected = selectedOptions.includes(optId);
                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleOptionToggle(optId)}
                          className={cn(
                            'flex items-start gap-3 rounded-lg border p-4 cursor-pointer transition-all',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-1 ring-primary'
                              : 'hover:bg-muted/50',
                          )}
                        >
                          <div className={cn(
                            'mt-0.5 h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center',
                            isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30',
                          )}>
                            {isSelected && (
                              <div className="h-2 w-2 rounded-full bg-white" />
                            )}
                          </div>
                          <span className="text-sm">
                            <strong className="mr-2">{String.fromCharCode(65 + optIdx)}.</strong>
                            {opt.text}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Numerical input */}
                {(currentQuestion as IQuestion).questionType === 'NUMERICAL' && (
                  <div className="space-y-2 max-w-xs">
                    <label className="text-sm font-medium">Enter your answer:</label>
                    <input
                      type="number"
                      value={numericalInput}
                      onChange={(e) => setNumericalInput(e.target.value)}
                      className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                      step="any"
                      placeholder="Type numerical answer..."
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-muted-foreground py-12">
                Loading question...
              </div>
            )}
          </div>

          {/* Bottom action bar */}
          <div className="border-t bg-card p-3 flex items-center justify-between shrink-0">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearResponse}
              >
                Clear Response
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-purple-300 text-purple-700 hover:bg-purple-50"
                onClick={handleMarkForReview}
              >
                Mark for Review & Next
              </Button>
            </div>
            <div className="flex gap-2">
              {activeQuestionIdx > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigateToQuestion(activeSectionIdx, activeQuestionIdx - 1)}
                >
                  Previous
                </Button>
              )}
              <Button size="sm" onClick={handleSaveAndNext} disabled={isSaving}>
                Save & Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right sidebar — Question palette */}
        <div className="w-64 border-l bg-card flex flex-col shrink-0">
          <div className="p-3 border-b">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {section.name} — Question Palette
            </p>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-gray-200" /> Not Visited
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-red-500" /> Not Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-green-500" /> Answered
              </span>
              <span className="flex items-center gap-1">
                <span className="h-3 w-3 rounded bg-purple-500" /> Marked
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            <div className="grid grid-cols-5 gap-2">
              {sectionQuestions.map((q, qIdx) => {
                const qId = typeof q === 'string' ? q : q._id;
                const response = attempt.responses.find(
                  (r) => r.questionId === qId && r.sectionIndex === activeSectionIdx,
                );
                const status = response?.status || QuestionStatus.NOT_VISITED;
                const isCurrent = qIdx === activeQuestionIdx;

                return (
                  <button
                    key={qIdx}
                    onClick={() => navigateToQuestion(activeSectionIdx, qIdx)}
                    className={cn(
                      'h-9 w-9 rounded text-xs font-medium transition-all',
                      STATUS_COLORS[status],
                      isCurrent && 'ring-2 ring-offset-1 ring-blue-500',
                    )}
                  >
                    {qIdx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section summary */}
          <div className="p-3 border-t text-xs text-muted-foreground space-y-1">
            {(() => {
              const sectionResponses = attempt.responses.filter(
                (r) => r.sectionIndex === activeSectionIdx,
              );
              const answered = sectionResponses.filter(
                (r) =>
                  r.status === QuestionStatus.ANSWERED ||
                  r.status === QuestionStatus.ANSWERED_AND_MARKED,
              ).length;
              const marked = sectionResponses.filter(
                (r) =>
                  r.status === QuestionStatus.MARKED_FOR_REVIEW ||
                  r.status === QuestionStatus.ANSWERED_AND_MARKED,
              ).length;
              const notAnswered = sectionResponses.filter(
                (r) => r.status === QuestionStatus.NOT_ANSWERED,
              ).length;
              return (
                <>
                  <p>Answered: <strong className="text-green-600">{answered}</strong></p>
                  <p>Not Answered: <strong className="text-red-600">{notAnswered}</strong></p>
                  <p>Marked: <strong className="text-purple-600">{marked}</strong></p>
                  <p>Not Visited: <strong>{sectionResponses.length - answered - notAnswered - marked + (sectionResponses.filter(r => r.status === QuestionStatus.ANSWERED_AND_MARKED).length)}</strong></p>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
