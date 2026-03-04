import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ClipboardList, TrendingUp, Award } from 'lucide-react';
import { toast } from 'sonner';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { testAttemptService } from '@/services/test-attempt.service';
import type { ITest, ITestAttempt } from '@exam-portal/shared';
import { AttemptStatus } from '@exam-portal/shared';

interface DashboardData {
  availableTests: ITest[];
  attempts: ITestAttempt[];
}

export function StudentDashboard() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>({ availableTests: [], attempts: [] });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [availableTests, attempts] = await Promise.all([
          testAttemptService.getAvailableTests(),
          testAttemptService.getMyAttempts(),
        ]);
        setData({ availableTests, attempts });
      } catch {
        // Load gracefully
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const completedAttempts = data.attempts.filter(
    (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.TIMED_OUT,
  );
  const inProgressAttempts = data.attempts.filter(
    (a) => a.status === AttemptStatus.IN_PROGRESS,
  );

  const testsTaken = completedAttempts.length;
  const avgScore =
    completedAttempts.length > 0
      ? Math.round(
          completedAttempts.reduce((sum, a) => sum + (a.totalScore ?? 0), 0) /
            completedAttempts.length,
        )
      : 0;
  const bestScore =
    completedAttempts.length > 0
      ? Math.max(...completedAttempts.map((a) => a.totalScore ?? 0))
      : 0;

  const handleStartTest = async (testId: string) => {
    try {
      const attempt = await testAttemptService.startTest(testId);
      navigate(`/student/exam/${attempt._id}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to start test');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-semibold">
          Welcome, {user?.firstName}!
        </h1>
        <p className="text-muted-foreground mt-1">
          Here&apos;s your performance overview and upcoming tests.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={ClipboardList}
          label="Tests Taken"
          value={isLoading ? '...' : String(testsTaken)}
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Score"
          value={isLoading ? '...' : String(avgScore)}
          accentColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          icon={Award}
          label="Best Score"
          value={isLoading ? '...' : String(bestScore)}
          accentColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          icon={Clock}
          label="Available"
          value={isLoading ? '...' : String(data.availableTests.length)}
          accentColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* In-progress attempts */}
      {inProgressAttempts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resume Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {inProgressAttempts.map((attempt) => (
                <div key={attempt._id} className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 p-4">
                  <div>
                    <p className="font-medium">Test in progress</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Started {new Date(attempt.startedAt).toLocaleString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/student/exam/${attempt._id}`)}>
                    Resume
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : data.availableTests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tests available right now
            </p>
          ) : (
            <div className="space-y-3">
              {data.availableTests.slice(0, 5).map((test) => (
                <div key={test._id} className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">{test.title}</p>
                    <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {test.totalTimeMinutes} min
                      </span>
                      <span>{test.totalMarks} marks</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {test.examType}
                      </Badge>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => handleStartTest(test._id)}>
                    Start Test
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : completedAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No completed tests yet
            </p>
          ) : (
            <div className="space-y-3">
              {completedAttempts.slice(0, 5).map((attempt) => (
                <div
                  key={attempt._id}
                  className="flex items-center justify-between rounded-lg border p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => navigate(`/student/results/${attempt._id}`)}
                >
                  <div>
                    <p className="text-sm font-medium">
                      {attempt.submittedAt
                        ? new Date(attempt.submittedAt).toLocaleDateString()
                        : 'Completed'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Score: {attempt.totalScore ?? 0}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      attempt.status === AttemptStatus.TIMED_OUT
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    }
                  >
                    {attempt.status === AttemptStatus.TIMED_OUT ? 'Timed Out' : 'Submitted'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
