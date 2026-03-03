import { Clock, ClipboardList, TrendingUp, Award } from 'lucide-react';
import { StatCard } from '@/components/common/stat-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

const UPCOMING_TESTS = [
  { id: '1', title: 'JEE Main Mock Test 5', date: 'Mar 5, 2026 at 10:00 AM', duration: '3 hours', type: 'JEE Main' },
  { id: '2', title: 'NEET Weekly Test 12', date: 'Mar 7, 2026 at 2:00 PM', duration: '3 hours', type: 'NEET' },
];

const RECENT_RESULTS = [
  { id: '1', title: 'JEE Main Mock 4', score: '185/300', percentage: '61.7%', rank: '#12' },
  { id: '2', title: 'Physics Chapter Test', score: '68/100', percentage: '68%', rank: '#5' },
  { id: '3', title: 'Chemistry Weekly 8', score: '144/180', percentage: '80%', rank: '#3' },
];

export function StudentDashboard() {
  const { user } = useAuth();

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
          value="18"
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Avg Score"
          value="68%"
          trend="+5%"
          trendDirection="up"
          accentColor="bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
        />
        <StatCard
          icon={Award}
          label="Best Rank"
          value="#3"
          accentColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <StatCard
          icon={Clock}
          label="Upcoming"
          value="2"
          accentColor="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400"
        />
      </div>

      {/* Upcoming tests */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Tests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {UPCOMING_TESTS.map((test) => (
              <div key={test.id} className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">{test.title}</p>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {test.date}
                    </span>
                    <span>{test.duration}</span>
                    <span className="bg-secondary px-2 py-0.5 rounded text-foreground font-medium">
                      {test.type}
                    </span>
                  </div>
                </div>
                <Button size="sm">Start Test</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent results */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {RECENT_RESULTS.map((result) => (
              <div key={result.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">{result.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Score: {result.score} ({result.percentage})
                  </p>
                </div>
                <span className="text-sm font-semibold text-primary">{result.rank}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
