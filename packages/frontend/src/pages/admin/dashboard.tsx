import { useState, useEffect } from 'react';
import {
  Users,
  ClipboardList,
  BookOpen,
  Layers,
  Clock,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { userService } from '@/services/user.service';
import { testService } from '@/services/test.service';
import { questionService, type QuestionStats } from '@/services/question.service';
import { batchService } from '@/services/batch.service';
import type { ITest } from '@exam-portal/shared';

const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#3B82F6',
  Chemistry: '#22C55E',
  Mathematics: '#F59E0B',
  Biology: '#8B5CF6',
  'Physical Chemistry': '#06B6D4',
  'Organic Chemistry': '#EC4899',
  'Inorganic Chemistry': '#14B8A6',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
};

interface DashboardData {
  totalStudents: number;
  totalTests: number;
  totalQuestions: number;
  totalBatches: number;
  questionStats: QuestionStats | null;
  recentTests: ITest[];
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData>({
    totalStudents: 0,
    totalTests: 0,
    totalQuestions: 0,
    totalBatches: 0,
    questionStats: null,
    recentTests: [],
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [studentsRes, testsRes, qStats, batchesRes, recentTestsRes] = await Promise.all([
          userService.getAll({ role: 'student', limit: 1 }),
          testService.getAll({ limit: 1 }),
          questionService.getStats(),
          batchService.getAll({ limit: 1 }),
          testService.getAll({ limit: 5 }),
        ]);

        setData({
          totalStudents: studentsRes.total,
          totalTests: testsRes.total,
          totalQuestions: qStats.total,
          totalBatches: batchesRes.total,
          questionStats: qStats,
          recentTests: recentTestsRes.data,
        });
      } catch {
        // Dashboard loads gracefully with zeros
      } finally {
        setIsLoading(false);
      }
    }
    loadDashboard();
  }, []);

  const subjectData =
    data.questionStats?.bySubject.map((s) => ({
      name: s._id,
      value: s.count,
      color: SUBJECT_COLORS[s._id] || '#6B7280',
    })) ?? [];

  const difficultyData =
    data.questionStats?.byDifficulty.map((d) => ({
      name: d._id.charAt(0).toUpperCase() + d._id.slice(1),
      count: d.count,
      color: DIFFICULTY_COLORS[d._id] || '#6B7280',
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
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value={isLoading ? '...' : data.totalStudents.toLocaleString()}
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Total Tests"
          value={isLoading ? '...' : data.totalTests.toLocaleString()}
          accentColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          icon={BookOpen}
          label="Questions"
          value={isLoading ? '...' : data.totalQuestions.toLocaleString()}
          accentColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          icon={Layers}
          label="Batches"
          value={isLoading ? '...' : data.totalBatches.toLocaleString()}
          accentColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Difficulty distribution */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Questions by Difficulty</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              {difficultyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={difficultyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Questions" radius={[4, 4, 0, 0]}>
                      {difficultyData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Bar>
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

        {/* Subject distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Questions by Subject</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px]">
              {subjectData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={subjectData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {subjectData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                  {isLoading ? 'Loading...' : 'No questions yet'}
                </div>
              )}
            </div>
            {subjectData.length > 0 && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {subjectData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-muted-foreground truncate">{item.name}</span>
                    <span className="ml-auto font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Tests</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-6">Loading...</p>
          ) : data.recentTests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No tests created yet
            </p>
          ) : (
            <div className="space-y-3">
              {data.recentTests.map((test) => (
                <div
                  key={test._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{test.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {test.totalTimeMinutes} min
                      </span>
                      <span>{test.totalMarks} marks</span>
                      {test.assignedBatches.length > 0 && (
                        <span>{test.assignedBatches.length} batch(es)</span>
                      )}
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
  );
}
