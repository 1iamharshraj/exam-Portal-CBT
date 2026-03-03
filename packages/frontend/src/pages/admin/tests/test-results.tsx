import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, TrendingUp, Award, BarChart3 } from 'lucide-react';
import { toast } from 'sonner';
import type { ITest, ITestAttempt } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { testService } from '@/services/test.service';
import { testAttemptService } from '@/services/test-attempt.service';

export function TestResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<ITest | null>(null);
  const [results, setResults] = useState<ITestAttempt[]>([]);
  const [analytics, setAnalytics] = useState<{
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
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetch = async () => {
      try {
        const [testData, resultsData, analyticsData] = await Promise.all([
          testService.getById(id),
          testAttemptService.getTestResults(id),
          testAttemptService.getTestAnalytics(id),
        ]);
        setTest(testData);
        setResults(resultsData);
        setAnalytics(analyticsData);
      } catch {
        toast.error('Failed to load results');
      } finally {
        setIsLoading(false);
      }
    };
    fetch();
  }, [id]);

  if (isLoading || !test) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading results...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="text-lg font-heading font-semibold">{test.title} — Results</h2>
          <p className="text-sm text-muted-foreground">
            {test.examType.replace('_', ' ')} · {test.totalMarks} marks
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      {analytics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.totalAttempts}</p>
                <p className="text-xs text-muted-foreground">Attempts</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.avgScore ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Avg Score</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <Award className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.maxScore ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Highest</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{analytics.minScore ?? '—'}</p>
                <p className="text-xs text-muted-foreground">Lowest</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Score Distribution */}
      {analytics?.distribution && analytics.totalAttempts > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {analytics.distribution.map((bucket, i) => {
                const maxCount = Math.max(...analytics.distribution!.map((d) => d.count), 1);
                const height = (bucket.count / maxCount) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-muted-foreground">{bucket.count}</span>
                    <div
                      className={cn(
                        'w-full rounded-t transition-all',
                        i < 4 ? 'bg-red-400' : i < 7 ? 'bg-amber-400' : 'bg-green-400',
                      )}
                      style={{ height: `${Math.max(2, height)}%` }}
                    />
                    <span className="text-[9px] text-muted-foreground">{bucket.range}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section Averages */}
      {analytics?.sectionAverages && analytics.sectionAverages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Section-wise Averages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.sectionAverages.map((sa) => {
                const section = test.sections[sa.sectionIndex];
                if (!section) return null;
                const pct = section.totalMarks > 0
                  ? Math.round((sa.avgScore / section.totalMarks) * 100)
                  : 0;
                return (
                  <div key={sa.sectionIndex} className="flex items-center gap-4">
                    <div className="w-28 shrink-0">
                      <p className="text-sm font-medium">{section.name}</p>
                    </div>
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full',
                          pct >= 60 ? 'bg-green-500' : pct >= 40 ? 'bg-amber-500' : 'bg-red-500',
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium w-16 text-right">
                      {Math.round(sa.avgScore)}/{section.totalMarks}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No submissions yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Rank</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Percentage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((r, i) => {
                  const student = r.studentId as any;
                  const pct = test.totalMarks > 0
                    ? Math.round(((r.totalScore || 0) / test.totalMarks) * 100)
                    : 0;
                  return (
                    <TableRow key={r._id}>
                      <TableCell className="font-medium">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">
                            {student?.firstName} {student?.lastName}
                          </p>
                          <p className="text-xs text-muted-foreground">{student?.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{r.totalScore ?? '—'}/{test.totalMarks}</TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            pct >= 60 ? 'bg-green-100 text-green-700' : pct >= 40 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700',
                          )}
                        >
                          {pct}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={r.status === 'TIMED_OUT' ? 'destructive' : 'secondary'} className="text-xs">
                          {r.status === 'TIMED_OUT' ? 'Timed Out' : 'Submitted'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {r.submittedAt ? new Date(r.submittedAt).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                        }) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
