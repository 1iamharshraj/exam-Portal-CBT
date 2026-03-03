import {
  Users,
  ClipboardList,
  BookOpen,
  TrendingUp,
  UserPlus,
  FileCheck,
  AlertTriangle,
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { StatCard } from '@/components/common/stat-card';
import { ActivityFeed } from '@/components/common/activity-feed';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Mock data — will be replaced by TanStack Query API calls
const PERFORMANCE_DATA = [
  { test: 'Test 1', avg: 62 },
  { test: 'Test 2', avg: 68 },
  { test: 'Test 3', avg: 55 },
  { test: 'Test 4', avg: 72 },
  { test: 'Test 5', avg: 65 },
  { test: 'Test 6', avg: 78 },
];

const SUBJECT_DATA = [
  { name: 'Physics', value: 320, color: '#3B82F6' },
  { name: 'Chemistry', value: 280, color: '#22C55E' },
  { name: 'Mathematics', value: 350, color: '#F59E0B' },
  { name: 'Biology', value: 190, color: '#8B5CF6' },
];

const UPCOMING_TESTS = [
  { id: '1', title: 'JEE Main Mock Test 5', date: 'Mar 5, 2026', students: 142, status: 'Published' },
  { id: '2', title: 'NEET Weekly Test 12', date: 'Mar 7, 2026', students: 98, status: 'Published' },
  { id: '3', title: 'Physics Chapter Test', date: 'Mar 10, 2026', students: 45, status: 'Draft' },
];

const ACTIVITY_EVENTS = [
  { id: '1', icon: UserPlus, text: 'Batch JEE-2026-B: 25 new students imported', time: '2 hours ago', color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' },
  { id: '2', icon: FileCheck, text: 'JEE Main Mock Test 4 completed — 138 submissions', time: '5 hours ago', color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' },
  { id: '3', icon: AlertTriangle, text: '3 proctoring violations flagged for review', time: '1 day ago', color: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' },
  { id: '4', icon: BookOpen, text: '50 new questions added to Physics bank', time: '2 days ago', color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400' },
];

export function AdminDashboard() {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Users}
          label="Total Students"
          value="186"
          trend="+12%"
          trendDirection="up"
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          icon={ClipboardList}
          label="Active Tests"
          value="4"
          trend="+2"
          trendDirection="up"
          accentColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          icon={BookOpen}
          label="Questions"
          value="1,140"
          trend="+50"
          trendDirection="up"
          accentColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Score"
          value="67%"
          trend="+3%"
          trendDirection="up"
          accentColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Performance trend */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Test Performance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PERFORMANCE_DATA}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="test" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avg"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', r: 4 }}
                    name="Avg Score %"
                  />
                </LineChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={SUBJECT_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {SUBJECT_DATA.map((entry) => (
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
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {SUBJECT_DATA.map((item) => (
                <div key={item.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="ml-auto font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming tests + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming tests */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {UPCOMING_TESTS.map((test) => (
                <div
                  key={test.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">{test.title}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {test.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {test.students} students
                      </span>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      test.status === 'Published'
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    {test.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Activity feed */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityFeed events={ACTIVITY_EVENTS} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
