import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Trophy, Medal, Users, ArrowLeft, Clock, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
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
import { useAuthStore } from '@/stores/auth.store';
import { testAttemptService } from '@/services/test-attempt.service';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LeaderboardEntry {
  _id: string;
  studentId: string;
  studentName: string;
  batch?: string;
  totalScore: number;
  totalMarks: number;
  percentage: number;
  timeTaken: number;
  correct: number;
  incorrect: number;
  unanswered: number;
  rank: number;
}

interface BatchComparison {
  batch: string;
  avgScore: number;
  avgPercentage: number;
  studentCount: number;
  topScorer: string;
  topScore: number;
}

interface LeaderboardData {
  testTitle: string;
  totalMarks: number;
  entries: LeaderboardEntry[];
  batchComparison: BatchComparison[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format seconds into a human-readable duration */
function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

/** Derive leaderboard from raw test results when API returns raw attempts */
function deriveLeaderboard(results: any[]): LeaderboardData {
  const entries: LeaderboardEntry[] = results
    .map((attempt: any) => {
      const test = attempt.testId as any;
      const student = attempt.studentId as any;
      const totalMarks = test?.totalMarks ?? 0;
      const totalScore = attempt.totalScore ?? 0;
      const correct = attempt.sectionScores?.reduce((s: number, ss: any) => s + (ss.correct ?? 0), 0) ?? 0;
      const incorrect = attempt.sectionScores?.reduce((s: number, ss: any) => s + (ss.incorrect ?? 0), 0) ?? 0;
      const unanswered = attempt.sectionScores?.reduce((s: number, ss: any) => s + (ss.unanswered ?? 0), 0) ?? 0;

      const startedAt = attempt.startedAt ? new Date(attempt.startedAt).getTime() : 0;
      const submittedAt = attempt.submittedAt ? new Date(attempt.submittedAt).getTime() : 0;
      const timeTaken = startedAt && submittedAt ? Math.round((submittedAt - startedAt) / 1000) : 0;

      return {
        _id: attempt._id,
        studentId: student?._id ?? attempt.studentId,
        studentName: student?.name ?? student?.firstName
          ? `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim()
          : 'Unknown',
        batch: student?.batch?.name ?? student?.batchId?.name ?? student?.batch ?? '',
        totalScore,
        totalMarks,
        percentage: totalMarks > 0 ? Math.round((totalScore / totalMarks) * 100) : 0,
        timeTaken,
        correct,
        incorrect,
        unanswered,
        rank: 0,
      };
    })
    .sort((a: LeaderboardEntry, b: LeaderboardEntry) => {
      // Sort by percentage desc, then by time asc (faster = better)
      if (b.percentage !== a.percentage) return b.percentage - a.percentage;
      return a.timeTaken - b.timeTaken;
    })
    .map((entry: LeaderboardEntry, index: number) => ({
      ...entry,
      rank: index + 1,
    }));

  // Derive batch comparison
  const batchMap = new Map<string, LeaderboardEntry[]>();
  entries.forEach((entry) => {
    const batch = entry.batch || 'Unassigned';
    if (!batchMap.has(batch)) batchMap.set(batch, []);
    batchMap.get(batch)!.push(entry);
  });

  const batchComparison: BatchComparison[] = Array.from(batchMap.entries())
    .map(([batch, batchEntries]) => {
      const avgScore = Math.round(
        batchEntries.reduce((sum, e) => sum + e.totalScore, 0) / batchEntries.length,
      );
      const avgPercentage = Math.round(
        batchEntries.reduce((sum, e) => sum + e.percentage, 0) / batchEntries.length,
      );
      const topEntry = batchEntries.reduce((best, e) =>
        e.percentage > best.percentage ? e : best,
      );
      return {
        batch,
        avgScore,
        avgPercentage,
        studentCount: batchEntries.length,
        topScorer: topEntry.studentName,
        topScore: topEntry.percentage,
      };
    })
    .sort((a, b) => b.avgPercentage - a.avgPercentage);

  const testTitle = (results[0]?.testId as any)?.title ?? 'Test';
  const totalMarks = (results[0]?.testId as any)?.totalMarks ?? 0;

  return { testTitle, totalMarks, entries, batchComparison };
}

// ---------------------------------------------------------------------------
// Batch color palette for visual differentiation
// ---------------------------------------------------------------------------

const BATCH_COLORS = [
  'border-l-blue-500',
  'border-l-emerald-500',
  'border-l-violet-500',
  'border-l-amber-500',
  'border-l-rose-500',
  'border-l-cyan-500',
  'border-l-orange-500',
  'border-l-teal-500',
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PodiumCard({
  entry,
  position,
}: {
  entry: LeaderboardEntry;
  position: 1 | 2 | 3;
}) {
  const config = {
    1: {
      height: 'h-36',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-300 dark:border-amber-700',
      badge: 'bg-amber-400 text-amber-950',
      icon: 'text-amber-500',
      label: '1st',
    },
    2: {
      height: 'h-28',
      bg: 'bg-slate-50 dark:bg-slate-950/20',
      border: 'border-slate-300 dark:border-slate-700',
      badge: 'bg-slate-400 text-slate-950',
      icon: 'text-slate-400',
      label: '2nd',
    },
    3: {
      height: 'h-24',
      bg: 'bg-orange-50 dark:bg-orange-950/20',
      border: 'border-orange-300 dark:border-orange-700',
      badge: 'bg-orange-400 text-orange-950',
      icon: 'text-orange-500',
      label: '3rd',
    },
  }[position];

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Student info */}
      <div className="text-center">
        <div
          className={cn(
            'mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 font-bold text-lg',
            config.border,
            config.bg,
          )}
        >
          {position === 1 ? (
            <Trophy className={cn('h-6 w-6', config.icon)} />
          ) : (
            <Medal className={cn('h-6 w-6', config.icon)} />
          )}
        </div>
        <p className="mt-2 text-sm font-semibold truncate max-w-[120px]">
          {entry.studentName}
        </p>
        {entry.batch && (
          <p className="text-[10px] text-muted-foreground truncate max-w-[120px]">
            {entry.batch}
          </p>
        )}
      </div>

      {/* Podium bar */}
      <div
        className={cn(
          'w-24 rounded-t-lg flex flex-col items-center justify-center border',
          config.height,
          config.bg,
          config.border,
        )}
      >
        <Badge className={cn('text-xs font-bold', config.badge)}>
          {config.label}
        </Badge>
        <p className="text-lg font-bold mt-1">{entry.percentage}%</p>
        <p className="text-[10px] text-muted-foreground">
          {entry.totalScore}/{entry.totalMarks}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeaderboardPage() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);

  const [leaderboard, setLeaderboard] = useState<LeaderboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!testId) return;

    async function load() {
      try {
        // Try the dedicated leaderboard endpoint first
        const data = await testAttemptService.getLeaderboard(testId!);

        // If the API returns structured leaderboard data, use it directly
        if (data?.entries) {
          setLeaderboard(data);
        } else if (Array.isArray(data)) {
          // API returned raw attempts -- derive leaderboard client-side
          setLeaderboard(deriveLeaderboard(data));
        } else {
          // Fallback: fetch test results and derive leaderboard
          const results = await testAttemptService.getTestResults(testId!);
          setLeaderboard(deriveLeaderboard(results));
        }
      } catch {
        // Fallback to test results endpoint
        try {
          const results = await testAttemptService.getTestResults(testId!);
          if (results.length === 0) {
            toast.error('No results found for this test');
            navigate(-1 as any);
            return;
          }
          setLeaderboard(deriveLeaderboard(results));
        } catch {
          toast.error('Failed to load leaderboard');
          navigate(-1 as any);
        }
      } finally {
        setIsLoading(false);
      }
    }

    load();
  }, [testId, navigate]);

  // Find current user's entry
  const currentUserEntry = useMemo(() => {
    if (!leaderboard || !currentUser) return null;
    return leaderboard.entries.find(
      (e) =>
        e.studentId === (currentUser as any)._id ||
        e.studentId === (currentUser as any).id,
    );
  }, [leaderboard, currentUser]);

  // Top 3 for podium
  const top3 = useMemo(() => {
    if (!leaderboard) return [];
    return leaderboard.entries.slice(0, 3);
  }, [leaderboard]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading leaderboard...
      </div>
    );
  }

  if (!leaderboard || leaderboard.entries.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-heading font-semibold">Leaderboard</h1>
        </div>
        <div className="flex flex-col items-center py-16 text-muted-foreground gap-2">
          <Trophy className="h-12 w-12" />
          <p className="text-sm font-medium">No results available yet</p>
          <p className="text-xs">The leaderboard will appear once students submit the test.</p>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Main render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1 as any)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-heading font-semibold">Leaderboard</h1>
          <p className="text-sm text-muted-foreground">
            {leaderboard.testTitle} -- {leaderboard.entries.length} student
            {leaderboard.entries.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Current user rank summary */}
      {currentUserEntry && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-lg">
                  #{currentUserEntry.rank}
                </div>
                <div>
                  <p className="text-sm font-semibold">Your Rank</p>
                  <p className="text-xs text-muted-foreground">
                    out of {leaderboard.entries.length} students
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm">
                <div className="text-center">
                  <p className="text-lg font-bold text-primary">{currentUserEntry.percentage}%</p>
                  <p className="text-[10px] text-muted-foreground">Score</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">
                    {currentUserEntry.totalScore}/{currentUserEntry.totalMarks}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Marks</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{formatDuration(currentUserEntry.timeTaken)}</p>
                  <p className="text-[10px] text-muted-foreground">Time</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top 3 Podium */}
      {top3.length >= 3 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-center gap-4 pt-4 pb-2">
              {/* 2nd place (left) */}
              <PodiumCard entry={top3[1]} position={2} />
              {/* 1st place (center, tallest) */}
              <PodiumCard entry={top3[0]} position={1} />
              {/* 3rd place (right) */}
              <PodiumCard entry={top3[2]} position={3} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Leaderboard Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Medal className="h-4 w-4 text-muted-foreground" />
            Full Rankings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-[60px] text-center">#</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden sm:table-cell">Batch</TableHead>
                  <TableHead className="text-center">Score</TableHead>
                  <TableHead className="text-center hidden md:table-cell">Percentage</TableHead>
                  <TableHead className="text-center hidden lg:table-cell">
                    <span className="flex items-center justify-center gap-1">
                      <Clock className="h-3 w-3" />
                      Time
                    </span>
                  </TableHead>
                  <TableHead className="text-center hidden xl:table-cell">
                    <span className="flex items-center justify-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-500" />
                    </span>
                  </TableHead>
                  <TableHead className="text-center hidden xl:table-cell">
                    <span className="flex items-center justify-center gap-1">
                      <XCircle className="h-3 w-3 text-red-500" />
                    </span>
                  </TableHead>
                  <TableHead className="text-center hidden xl:table-cell">
                    <span className="flex items-center justify-center gap-1">
                      <MinusCircle className="h-3 w-3 text-gray-400" />
                    </span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaderboard.entries.map((entry) => {
                  const isCurrentUser =
                    currentUser &&
                    (entry.studentId === (currentUser as any)._id ||
                      entry.studentId === (currentUser as any).id);

                  return (
                    <TableRow
                      key={entry._id}
                      className={cn(
                        isCurrentUser &&
                          'bg-primary/5 border-l-2 border-l-primary font-medium',
                      )}
                    >
                      <TableCell className="text-center">
                        {entry.rank <= 3 ? (
                          <span
                            className={cn(
                              'inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold',
                              entry.rank === 1 &&
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                              entry.rank === 2 &&
                                'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                              entry.rank === 3 &&
                                'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
                            )}
                          >
                            {entry.rank}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">{entry.rank}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate max-w-[180px]">
                            {entry.studentName}
                          </span>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              You
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {entry.batch ? (
                          <Badge variant="secondary" className="text-xs">
                            {entry.batch}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">--</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold">
                          {entry.totalScore}/{entry.totalMarks}
                        </span>
                      </TableCell>
                      <TableCell className="text-center hidden md:table-cell">
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            entry.percentage >= 60
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : entry.percentage >= 40
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          )}
                        >
                          {entry.percentage}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center text-sm text-muted-foreground hidden lg:table-cell">
                        {formatDuration(entry.timeTaken)}
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <span className="text-sm text-green-600 font-medium">{entry.correct}</span>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <span className="text-sm text-red-600 font-medium">{entry.incorrect}</span>
                      </TableCell>
                      <TableCell className="text-center hidden xl:table-cell">
                        <span className="text-sm text-muted-foreground">{entry.unanswered}</span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Batch Comparison */}
      {leaderboard.batchComparison.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              Batch Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaderboard.batchComparison.map((batch, idx) => (
                <div
                  key={batch.batch}
                  className={cn(
                    'rounded-lg border border-l-4 p-4 space-y-3',
                    BATCH_COLORS[idx % BATCH_COLORS.length],
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold">{batch.batch}</h4>
                    <Badge variant="secondary" className="text-xs">
                      {batch.studentCount} student{batch.studentCount !== 1 ? 's' : ''}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    {/* Average score bar */}
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-muted-foreground">Avg Score</span>
                        <span className="font-semibold">{batch.avgPercentage}%</span>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            batch.avgPercentage >= 60
                              ? 'bg-green-500'
                              : batch.avgPercentage >= 40
                                ? 'bg-amber-500'
                                : 'bg-red-500',
                          )}
                          style={{ width: `${Math.max(0, Math.min(100, batch.avgPercentage))}%` }}
                        />
                      </div>
                    </div>

                    {/* Top scorer */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Trophy className="h-3 w-3 text-amber-500" />
                        Top Scorer
                      </span>
                      <span className="font-medium truncate max-w-[120px]">
                        {batch.topScorer} ({batch.topScore}%)
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
