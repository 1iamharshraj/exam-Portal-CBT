import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Minus, Clock } from 'lucide-react';
import { toast } from 'sonner';
import type { ITest, ITestAttempt, IQuestion } from '@exam-portal/shared';
import { QuestionStatus } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';
import { MathRenderer } from '@/components/common/math-renderer';

export function ResultPage() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const navigate = useNavigate();
  const [attempt, setAttempt] = useState<ITestAttempt | null>(null);
  const [test, setTest] = useState<ITest | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!attemptId) return;
    const fetch = async () => {
      try {
        const data = await testAttemptService.getResult(attemptId);
        setAttempt(data);
        setTest((data as any).testId as ITest);
      } catch {
        toast.error('Failed to load result');
        navigate('/student/tests');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [attemptId, navigate]);

  if (isLoading || !attempt || !test) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading result...
      </div>
    );
  }

  const percentage = test.totalMarks > 0
    ? Math.round(((attempt.totalScore || 0) / test.totalMarks) * 100)
    : 0;

  type SectionScore = NonNullable<ITestAttempt['sectionScores']>[number];
  const totalCorrect = attempt.sectionScores?.reduce((s: number, ss: SectionScore) => s + ss.correct, 0) || 0;
  const totalIncorrect = attempt.sectionScores?.reduce((s: number, ss: SectionScore) => s + ss.incorrect, 0) || 0;
  const totalUnanswered = attempt.sectionScores?.reduce((s: number, ss: SectionScore) => s + ss.unanswered, 0) || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/student/tests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-xl font-heading font-semibold">{test.title}</h2>
          <p className="text-sm text-muted-foreground">
            {test.examType.replace('_', ' ')} · Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('en-IN') : '—'}
          </p>
        </div>
      </div>

      {/* Score Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-primary">{attempt.totalScore || 0}</p>
            <p className="text-xs text-muted-foreground">out of {test.totalMarks}</p>
            <p className="text-sm font-medium mt-1">{percentage}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-green-600">{totalCorrect}</p>
            <p className="text-xs text-muted-foreground">Correct</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{totalIncorrect}</p>
            <p className="text-xs text-muted-foreground">Incorrect</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-3xl font-bold text-gray-500">{totalUnanswered}</p>
            <p className="text-xs text-muted-foreground">Unanswered</p>
          </CardContent>
        </Card>
      </div>

      {/* Section Breakdown */}
      {attempt.sectionScores && attempt.sectionScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {attempt.sectionScores.map((ss, i) => {
                const section = test.sections[ss.sectionIndex];
                if (!section) return null;
                const sectionPct = section.totalMarks > 0
                  ? Math.round((ss.score / section.totalMarks) * 100)
                  : 0;
                return (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{section.name}</p>
                        <p className="text-xs text-muted-foreground">{section.subject}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{ss.score}/{section.totalMarks}</p>
                        <p className="text-xs text-muted-foreground">{sectionPct}%</p>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          sectionPct >= 60 ? 'bg-green-500' : sectionPct >= 40 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${Math.max(0, sectionPct)}%` }}
                      />
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        {ss.correct} correct
                      </span>
                      <span className="flex items-center gap-1">
                        <XCircle className="h-3 w-3 text-red-500" />
                        {ss.incorrect} incorrect
                      </span>
                      <span className="flex items-center gap-1">
                        <Minus className="h-3 w-3" />
                        {ss.unanswered} unanswered
                      </span>
                    </div>
                    {i < attempt.sectionScores!.length - 1 && <Separator />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Question-wise Review */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Question-wise Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {test.sections.map((section, sIdx) => {
              const questions = (section.questionIds || []) as unknown as IQuestion[];
              return (
                <div key={sIdx}>
                  <h4 className="text-sm font-medium mb-2">{section.name}</h4>
                  <div className="space-y-2">
                    {questions.map((q, qIdx) => {
                      const isPopulated = typeof q !== 'string' && q.questionText;
                      const qId = typeof q === 'string' ? q : q._id;
                      const response = attempt.responses.find(
                        (r) => r.questionId === qId && r.sectionIndex === sIdx,
                      );
                      const isAnswered = response?.status === QuestionStatus.ANSWERED ||
                        response?.status === QuestionStatus.ANSWERED_AND_MARKED;

                      return (
                        <div key={qIdx} className="rounded-md border p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm flex items-baseline gap-1">
                                <span className="font-medium mr-1 shrink-0">Q{qIdx + 1}.</span>
                                {isPopulated
                                  ? <MathRenderer html={(q as IQuestion).questionText} className="line-clamp-2" />
                                  : <span>Question data unavailable</span>}
                              </div>
                              {isAnswered && response && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {response.selectedOptions?.length
                                    ? `Selected: ${response.selectedOptions.join(', ')}`
                                    : response.numericalAnswer !== undefined
                                      ? `Answer: ${response.numericalAnswer}`
                                      : ''}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {response?.timeSpent ? (
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" />
                                  {Math.round(response.timeSpent)}s
                                </span>
                              ) : null}
                              {!isAnswered ? (
                                <Badge variant="secondary" className="text-[10px]">Unanswered</Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {sIdx < test.sections.length - 1 && <Separator className="mt-4" />}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
