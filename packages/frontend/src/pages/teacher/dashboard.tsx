import { useState, useEffect } from 'react';
import {
  BookOpen,
  ClipboardList,
  FileCheck,
  Clock,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth.store';
import { questionService, type QuestionStats } from '@/services/question.service';
import { testService } from '@/services/test.service';
import type { ITest } from '@exam-portal/shared';

interface DashboardData {
  totalQuestions: number;
  totalTests: number;
  questionStats: QuestionStats | null;
  recentTests: ITest[];
}

export function TeacherDashboard() {
  const user = useAuthStore((s) => s.user);
  const [data, setData] = useState<DashboardData>({
    totalQuestions: 0,
    totalTests: 0,
    questionStats: null,
    recentTests: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [qStats, testsRes, recentRes] = await Promise.all([
          questionService.getStats(),
          testService.getAll({ limit: 1 }),
          testService.getAll({ limit: 5 }),
        ]);

        setData({
          totalQuestions: qStats.total,
          totalTests: testsRes.total,
          questionStats: qStats,
          recentTests: recentRes.data,
        });
      } catch {
        // Load gracefully with zeros
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const difficultyData =
    data.questionStats?.byDifficulty.map((d) => ({
      name: d._id.charAt(0).toUpperCase() + d._id.slice(1),
      count: d.count,
    })) ?? [];

  const statusLabel = (status: string) => {
    const map: Record<string, string> = {
      draft: 'Draft',
      published: 'Published',
      active: 'Active',
      completed: 'Completed',
    };
    return map[status] || status;
  };

  const statusColor = (status: string) => {
    if (status === 'published' || status === 'active')
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (status === 'completed')
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Welcome back, {user?.firstName}. Here&apos;s your teaching overview.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="Total Questions"
          value={isLoading ? '...' : data.totalQuestions.toLocaleString()}
          accentColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Tests Created"
          value={isLoading ? '...' : data.totalTests.toLocaleString()}
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        {(data.questionStats?.bySubject ?? []).slice(0, 2).map((s) => (
          <StatCard
            key={s._id}
            icon={FileCheck}
            label={`${s._id} Qs`}
            value={isLoading ? '...' : s.count.toLocaleString()}
            accentColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
          />
        ))}
      </div>

      {/* Chart + Recent tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {difficultyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Questions" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {isLoading ? 'Loading...' : 'No question data yet'}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
            ) : data.recentTests.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No tests created yet</p>
            ) : (
              <div className="space-y-3">
                {data.recentTests.map((test) => (
                  <div key={test._id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{test.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {test.totalTimeMinutes} min
                        </span>
                        <span>{test.totalMarks} marks</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className={statusColor(test.status)}>
                      {statusLabel(test.status)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
