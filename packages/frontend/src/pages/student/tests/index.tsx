import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, FileText, Play, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import type { ITest, ITestAttempt } from '@exam-portal/shared';
import { AttemptStatus } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { testAttemptService } from '@/services/test-attempt.service';

export function StudentTestsPage() {
  const navigate = useNavigate();
  const [availableTests, setAvailableTests] = useState<ITest[]>([]);
  const [attempts, setAttempts] = useState<ITestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [tests, myAttempts] = await Promise.all([
          testAttemptService.getAvailableTests(),
          testAttemptService.getMyAttempts(),
        ]);
        setAvailableTests(tests);
        setAttempts(myAttempts);
      } catch {
        toast.error('Failed to load tests');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleStartTest = async (testId: string) => {
    try {
      const attempt = await testAttemptService.startTest(testId);
      navigate(`/student/exam/${attempt._id}`);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to start test';
      toast.error(message);
    }
  };

  const handleResumeTest = (attemptId: string) => {
    navigate(`/student/exam/${attemptId}`);
  };

  const inProgressAttempts = attempts.filter(
    (a) => a.status === AttemptStatus.IN_PROGRESS,
  );
  const completedAttempts = attempts.filter(
    (a) =>
      a.status === AttemptStatus.SUBMITTED ||
      a.status === AttemptStatus.TIMED_OUT,
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading tests...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-heading font-semibold">My Tests</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Take tests, review results, and track your progress.
        </p>
      </div>

      {/* In-progress tests */}
      {inProgressAttempts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-amber-600 flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            In Progress
          </h3>
          {inProgressAttempts.map((attempt) => {
            const test = attempt.testId as unknown as ITest;
            return (
              <Card key={attempt._id} className="border-amber-200 bg-amber-50/50 dark:bg-amber-950/10">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test?.title || 'Unknown Test'}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Started {new Date(attempt.startedAt).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleResumeTest(attempt._id)}>
                    <Play className="h-4 w-4 mr-1" />
                    Resume
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          <Separator />
        </div>
      )}

      {/* Available Tests */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium flex items-center gap-1.5">
          <FileText className="h-4 w-4" />
          Available Tests ({availableTests.length})
        </h3>
        {availableTests.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No tests available at the moment.
          </p>
        ) : (
          availableTests.map((test) => {
            const totalQuestions = test.sections.reduce(
              (sum, s) => sum + s.questionCount,
              0,
            );
            return (
              <Card key={test._id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{test.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {test.examType.replace('_', ' ')}
                        </Badge>
                      </div>
                      {test.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {test.description}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.totalTimeMinutes} min
                        </span>
                        <span>{totalQuestions} questions</span>
                        <span>{test.totalMarks} marks</span>
                        <span>{test.sections.length} sections</span>
                      </div>
                    </div>
                    <Button size="sm" onClick={() => handleStartTest(test._id)}>
                      <Play className="h-4 w-4 mr-1" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Completed Tests */}
      {completedAttempts.length > 0 && (
        <div className="space-y-3">
          <Separator />
          <h3 className="text-sm font-medium flex items-center gap-1.5">
            <CheckCircle className="h-4 w-4" />
            Completed ({completedAttempts.length})
          </h3>
          {completedAttempts.map((attempt) => {
            const test = attempt.testId as unknown as ITest;
            return (
              <Card key={attempt._id} className="opacity-80">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium">{test?.title || 'Unknown Test'}</p>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span>
                        Submitted {attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleString('en-IN') : '—'}
                      </span>
                      {attempt.totalScore !== undefined && (
                        <span className="font-medium text-foreground">
                          Score: {attempt.totalScore}/{test?.totalMarks || '?'}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={attempt.status === AttemptStatus.TIMED_OUT ? 'destructive' : 'secondary'}>
                    {attempt.status === AttemptStatus.TIMED_OUT ? 'Timed Out' : 'Submitted'}
                  </Badge>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
