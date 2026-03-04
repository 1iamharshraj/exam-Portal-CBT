import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  TrendingUp,
  TrendingDown,
  Target,
  Award,
  BookOpen,
  Clock,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OverallStats {
  testsTaken: number;
  overallAccuracy: number;
  bestScore: number;
  averageScore: number;
}

interface TrendPoint {
  testName: string;
  scorePercent: number;
  date: string;
}

interface SubjectPerformance {
  subject: string;
  totalQuestions: number;
  correct: number;
  accuracy: number;
}

interface TopicPerformance {
  subject: string;
  topic: string;
  totalQuestions: number;
  correct: number;
  accuracy: number;
  avgTimeSeconds: number;
}

interface DifficultyBreakdown {
  easy: { total: number; correct: number; accuracy: number };
  medium: { total: number; correct: number; accuracy: number };
  hard: { total: number; correct: number; accuracy: number };
}

interface AnalyticsData {
  overall: OverallStats;
  recentTrend: TrendPoint[];
  subjectPerformance: SubjectPerformance[];
  topicPerformance: TopicPerformance[];
  difficulty: DifficultyBreakdown;
  weakTopics: TopicPerformance[];
  strongTopics: TopicPerformance[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 75) return 'text-green-600 dark:text-green-400';
  if (accuracy >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-red-600 dark:text-red-400';
}

function getAccuracyBgColor(accuracy: number): string {
  if (accuracy >= 75) return 'bg-green-500';
  if (accuracy >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

/**
 * Normalize raw API response into the AnalyticsData shape.
 * Handles cases where the backend returns a different shape or partial data.
 */
function normalizeAnalytics(raw: any): AnalyticsData {
  const overall: OverallStats = {
    testsTaken: raw?.overall?.testsTaken ?? raw?.testsTaken ?? 0,
    overallAccuracy: raw?.overall?.overallAccuracy ?? raw?.overallAccuracy ?? 0,
    bestScore: raw?.overall?.bestScore ?? raw?.bestScore ?? 0,
    averageScore: raw?.overall?.averageScore ?? raw?.averageScore ?? 0,
  };

  const recentTrend: TrendPoint[] = (raw?.recentTrend ?? raw?.trend ?? []).map(
    (p: any, i: number) => ({
      testName: p.testName ?? p.name ?? `Test ${i + 1}`,
      scorePercent: p.scorePercent ?? p.score ?? 0,
      date: p.date ?? '',
    }),
  );

  const subjectPerformance: SubjectPerformance[] = (
    raw?.subjectPerformance ??
    raw?.subjects ??
    []
  ).map((s: any) => ({
    subject: s.subject ?? s.name ?? 'Unknown',
    totalQuestions: s.totalQuestions ?? s.total ?? 0,
    correct: s.correct ?? 0,
    accuracy: s.accuracy ?? (s.totalQuestions > 0 ? Math.round((s.correct / s.totalQuestions) * 100) : 0),
  }));

  const topicPerformance: TopicPerformance[] = (
    raw?.topicPerformance ??
    raw?.topics ??
    []
  ).map((t: any) => ({
    subject: t.subject ?? 'Unknown',
    topic: t.topic ?? t.name ?? 'Unknown',
    totalQuestions: t.totalQuestions ?? t.total ?? 0,
    correct: t.correct ?? 0,
    accuracy: t.accuracy ?? (t.totalQuestions > 0 ? Math.round((t.correct / t.totalQuestions) * 100) : 0),
    avgTimeSeconds: t.avgTimeSeconds ?? t.avgTime ?? 0,
  }));

  const difficulty: DifficultyBreakdown = {
    easy: {
      total: raw?.difficulty?.easy?.total ?? 0,
      correct: raw?.difficulty?.easy?.correct ?? 0,
      accuracy: raw?.difficulty?.easy?.accuracy ?? 0,
    },
    medium: {
      total: raw?.difficulty?.medium?.total ?? 0,
      correct: raw?.difficulty?.medium?.correct ?? 0,
      accuracy: raw?.difficulty?.medium?.accuracy ?? 0,
    },
    hard: {
      total: raw?.difficulty?.hard?.total ?? 0,
      correct: raw?.difficulty?.hard?.correct ?? 0,
      accuracy: raw?.difficulty?.hard?.accuracy ?? 0,
    },
  };

  // Determine weak and strong topics from topic performance
  const sortedByAccuracy = [...topicPerformance]
    .filter((t) => t.totalQuestions >= 1)
    .sort((a, b) => a.accuracy - b.accuracy);

  const weakTopics: TopicPerformance[] =
    raw?.weakTopics ??
    sortedByAccuracy.filter((t) => t.accuracy < 50).slice(0, 5);

  const strongTopics: TopicPerformance[] =
    raw?.strongTopics ??
    [...sortedByAccuracy].reverse().filter((t) => t.accuracy >= 60).slice(0, 5);

  return {
    overall,
    recentTrend,
    subjectPerformance,
    topicPerformance,
    difficulty,
    weakTopics,
    strongTopics,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PerformanceAnalyticsPage() {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const raw = await testAttemptService.getStudentAnalytics();
        setAnalytics(normalizeAnalytics(raw));
      } catch {
        toast.error('Failed to load analytics');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Empty state — no tests taken
  // -------------------------------------------------------------------------

  if (!analytics || analytics.overall.testsTaken === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-heading font-semibold">
            Performance Analytics
          </h1>
          <p className="text-muted-foreground mt-1">
            Detailed breakdown of your test performance.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center py-12 text-muted-foreground gap-3">
              <Target className="h-12 w-12" />
              <p className="text-base font-medium">No analytics available yet</p>
              <p className="text-sm">
                Take at least one test to see your performance breakdown.
              </p>
              <button
                onClick={() => navigate('/student/tests')}
                className="mt-3 inline-flex items-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Browse Tests
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { overall, recentTrend, subjectPerformance, topicPerformance, difficulty, weakTopics, strongTopics } = analytics;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-heading font-semibold">
          Performance Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          Detailed breakdown of your test performance.
        </p>
      </div>

      {/* ----- 1. Overall Stats Cards ----- */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tests Taken</p>
                <p className="text-2xl font-heading font-bold">
                  {overall.testsTaken}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">
                  Overall Accuracy
                </p>
                <p className="text-2xl font-heading font-bold">
                  {overall.overallAccuracy}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Best Score</p>
                <p className="text-2xl font-heading font-bold">
                  {overall.bestScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Score</p>
                <p className="text-2xl font-heading font-bold">
                  {overall.averageScore}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----- 2. Recent Trend Chart ----- */}
      {recentTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Score Trend (Recent Tests)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={recentTrend}
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="testName"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload as TrendPoint;
                      return (
                        <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">
                          <p className="font-medium">{d.testName}</p>
                          <p className="text-muted-foreground">
                            Score: <span className="font-semibold text-foreground">{d.scorePercent}%</span>
                          </p>
                          {d.date && (
                            <p className="text-xs text-muted-foreground">{d.date}</p>
                          )}
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="scorePercent"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----- 3. Subject Performance ----- */}
      {subjectPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Subject Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjectPerformance.map((s) => (
                <div key={s.subject} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{s.subject}</span>
                    <span className={cn('font-semibold', getAccuracyColor(s.accuracy))}>
                      {s.accuracy}%
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-500',
                        getAccuracyBgColor(s.accuracy),
                      )}
                      style={{ width: `${Math.min(s.accuracy, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {s.correct}/{s.totalQuestions} correct
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ----- 4. Weak vs Strong Topics ----- */}
      {(weakTopics.length > 0 || strongTopics.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Focus Areas (weak) */}
          <Card className="border-red-200 dark:border-red-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-500" />
                <CardTitle className="text-base text-red-700 dark:text-red-400">
                  Focus Areas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {weakTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No weak areas identified yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {weakTopics.map((t, i) => (
                    <div
                      key={`${t.subject}-${t.topic}-${i}`}
                      className="flex items-center justify-between rounded-md bg-red-50 dark:bg-red-950/20 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.topic}</p>
                        <p className="text-xs text-muted-foreground">{t.subject}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 shrink-0 ml-2"
                      >
                        {t.accuracy}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Strong Areas */}
          <Card className="border-green-200 dark:border-green-900/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <CardTitle className="text-base text-green-700 dark:text-green-400">
                  Strong Areas
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {strongTopics.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No strong areas identified yet.
                </p>
              ) : (
                <div className="space-y-3">
                  {strongTopics.map((t, i) => (
                    <div
                      key={`${t.subject}-${t.topic}-${i}`}
                      className="flex items-center justify-between rounded-md bg-green-50 dark:bg-green-950/20 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{t.topic}</p>
                        <p className="text-xs text-muted-foreground">{t.subject}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 shrink-0 ml-2"
                      >
                        {t.accuracy}%
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ----- 5. Difficulty Breakdown ----- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Easy */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                Easy
              </Badge>
              <p className={cn('text-3xl font-heading font-bold', getAccuracyColor(difficulty.easy.accuracy))}>
                {difficulty.easy.accuracy}%
              </p>
              <p className="text-xs text-muted-foreground">
                {difficulty.easy.correct}/{difficulty.easy.total} correct
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Medium */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                Medium
              </Badge>
              <p className={cn('text-3xl font-heading font-bold', getAccuracyColor(difficulty.medium.accuracy))}>
                {difficulty.medium.accuracy}%
              </p>
              <p className="text-xs text-muted-foreground">
                {difficulty.medium.correct}/{difficulty.medium.total} correct
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Hard */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                Hard
              </Badge>
              <p className={cn('text-3xl font-heading font-bold', getAccuracyColor(difficulty.hard.accuracy))}>
                {difficulty.hard.accuracy}%
              </p>
              <p className="text-xs text-muted-foreground">
                {difficulty.hard.correct}/{difficulty.hard.total} correct
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ----- 6. Topic-wise Performance Table ----- */}
      {topicPerformance.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Topic-wise Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead className="text-center">Questions</TableHead>
                  <TableHead className="text-center">Correct</TableHead>
                  <TableHead className="text-center">Accuracy</TableHead>
                  <TableHead className="text-center">
                    <span className="flex items-center justify-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      Avg Time
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topicPerformance.map((t, i) => (
                  <TableRow key={`${t.subject}-${t.topic}-${i}`}>
                    <TableCell className="font-medium">{t.subject}</TableCell>
                    <TableCell>{t.topic}</TableCell>
                    <TableCell className="text-center">{t.totalQuestions}</TableCell>
                    <TableCell className="text-center">{t.correct}</TableCell>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold',
                          t.accuracy >= 75
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : t.accuracy >= 50
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                        )}
                      >
                        {t.accuracy}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center text-muted-foreground">
                      {formatTime(t.avgTimeSeconds)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
