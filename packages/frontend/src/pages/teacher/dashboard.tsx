import {
  BookOpen,
  ClipboardList,
  TrendingUp,
  Users,
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
import { useAuth } from '@/hooks/use-auth';

const MY_TESTS_DATA = [
  { name: 'Mock 1', avgScore: 72 },
  { name: 'Mock 2', avgScore: 65 },
  { name: 'Mock 3', avgScore: 78 },
  { name: 'Mock 4', avgScore: 70 },
  { name: 'Mock 5', avgScore: 82 },
];

const RECENT_TESTS = [
  { id: '1', title: 'Physics Chapter Test - Optics', date: 'Mar 2, 2026', submissions: 42, avgScore: '68%' },
  { id: '2', title: 'Chemistry Weekly Test 8', date: 'Feb 28, 2026', submissions: 45, avgScore: '72%' },
  { id: '3', title: 'JEE Main Mock 4', date: 'Feb 25, 2026', submissions: 138, avgScore: '65%' },
];

export function TeacherDashboard() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <p className="text-muted-foreground">
        Welcome back, {user?.firstName}. Here&apos;s your teaching overview.
      </p>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={BookOpen}
          label="My Questions"
          value="320"
          trend="+15"
          trendDirection="up"
          accentColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Tests Created"
          value="12"
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          icon={Users}
          label="My Students"
          value="89"
          accentColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Batch Score"
          value="71%"
          trend="+5%"
          trendDirection="up"
          accentColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      {/* Chart + Recent tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Test Average Scores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={MY_TESTS_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="avgScore" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Avg %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {RECENT_TESTS.map((test) => (
                <div key={test.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{test.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {test.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileCheck className="h-3 w-3" />
                        {test.submissions} submissions
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-primary">{test.avgScore}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
