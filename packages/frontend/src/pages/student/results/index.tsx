import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, TrendingUp, Award, Eye, Search, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { AttemptStatus } from '@exam-portal/shared';
import type { ITestAttempt } from '@exam-portal/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';

type SortOption = 'recent' | 'oldest' | 'score-high' | 'score-low';

export function StudentResultsPage() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<ITestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('recent');

  useEffect(() => {
    async function load() {
      try {
        const data = await testAttemptService.getMyAttempts();
        setAttempts(data);
      } catch {
        toast.error('Failed to load results');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const getTest = (attempt: ITestAttempt) =>
    attempt.testId as unknown as { title?: string; totalMarks?: number; examType?: string };

  const completed = useMemo(
    () =>
      attempts.filter(
        (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.TIMED_OUT,
      ),
    [attempts],
  );

  // Stats
  const totalTests = completed.length;
  const avgScore =
    totalTests > 0
      ? Math.round(
          completed.reduce((sum, a) => {
            const max = getTest(a)?.totalMarks ?? 0;
            return sum + (max > 0 ? ((a.totalScore ?? 0) / max) * 100 : 0);
          }, 0) / totalTests,
        )
      : 0;
  const bestScore =
    totalTests > 0
      ? Math.round(
          Math.max(
            ...completed.map((a) => {
              const max = getTest(a)?.totalMarks ?? 0;
              return max > 0 ? ((a.totalScore ?? 0) / max) * 100 : 0;
            }),
          ),
        )
      : 0;

  // Filtered and sorted results
  const filteredResults = useMemo(() => {
    let results = completed;

    // Search filter
    if (search) {
      const q = search.toLowerCase();
      results = results.filter((a) => {
        const test = getTest(a);
        return (
          test?.title?.toLowerCase().includes(q) ||
          test?.examType?.toLowerCase().replace('_', ' ').includes(q)
        );
      });
    }

    // Sort
    results = [...results].sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return new Date(b.submittedAt || b.createdAt).getTime() - new Date(a.submittedAt || a.createdAt).getTime();
        case 'oldest':
          return new Date(a.submittedAt || a.createdAt).getTime() - new Date(b.submittedAt || b.createdAt).getTime();
        case 'score-high': {
          const pctA = (getTest(a)?.totalMarks ?? 0) > 0 ? ((a.totalScore ?? 0) / (getTest(a)?.totalMarks ?? 1)) * 100 : 0;
          const pctB = (getTest(b)?.totalMarks ?? 0) > 0 ? ((b.totalScore ?? 0) / (getTest(b)?.totalMarks ?? 1)) * 100 : 0;
          return pctB - pctA;
        }
        case 'score-low': {
          const pctA = (getTest(a)?.totalMarks ?? 0) > 0 ? ((a.totalScore ?? 0) / (getTest(a)?.totalMarks ?? 1)) * 100 : 0;
          const pctB = (getTest(b)?.totalMarks ?? 0) > 0 ? ((b.totalScore ?? 0) / (getTest(b)?.totalMarks ?? 1)) * 100 : 0;
          return pctA - pctB;
        }
        default:
          return 0;
      }
    });

    return results;
  }, [completed, search, sortBy]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading results...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-heading font-semibold">My Results</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tests Completed</p>
                <p className="text-2xl font-semibold">{totalTests}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Average Score</p>
                <p className="text-2xl font-semibold">{avgScore}%</p>
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
                <p className="text-2xl font-semibold">{bestScore}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Results list */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-base">All Results</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-[220px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tests..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
                <SelectTrigger className="w-[140px] h-9">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Most Recent</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="score-high">Highest Score</SelectItem>
                  <SelectItem value="score-low">Lowest Score</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {completed.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-muted-foreground gap-2">
              <ClipboardList className="h-10 w-10" />
              <p className="text-sm font-medium">No completed tests yet</p>
              <p className="text-xs">Take a test to see your results here.</p>
              <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/student/tests')}>
                Browse Tests
              </Button>
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No results match your search</p>
              <Button variant="link" size="sm" onClick={() => setSearchInput('')}>
                Clear search
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((attempt) => {
                const test = getTest(attempt);
                const max = test?.totalMarks ?? 0;
                const pct = max > 0 ? Math.round(((attempt.totalScore ?? 0) / max) * 100) : 0;

                return (
                  <div
                    key={attempt._id}
                    className="flex items-center justify-between rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{test?.title || 'Test'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {test?.examType && (
                          <span className="bg-secondary px-2 py-0.5 rounded text-foreground font-medium">
                            {test.examType.replace(/_/g, ' ')}
                          </span>
                        )}
                        <span>
                          {attempt.submittedAt
                            ? new Date(attempt.submittedAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </span>
                        {attempt.status === AttemptStatus.TIMED_OUT && (
                          <Badge variant="destructive" className="text-[10px]">
                            Timed Out
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <p className="text-sm font-semibold">
                          {attempt.totalScore ?? 0}/{max}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn(
                            'text-xs',
                            pct >= 60
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : pct >= 40
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                          )}
                        >
                          {pct}%
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/student/results/${attempt._id}`)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
