import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Clock,
  AlertTriangle,
  CheckCircle,
  Shield,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { testAttemptService } from '@/services/test-attempt.service';

type FilterTab = 'all' | 'in_progress' | 'high_risk' | 'submitted';

interface ViolationEntry {
  type: string;
  message: string;
  timestamp: string;
}

interface AttemptData {
  _id: string;
  studentId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    batch?: string;
  };
  status: 'IN_PROGRESS' | 'SUBMITTED' | 'TIMED_OUT';
  riskLevel: 'low' | 'medium' | 'high';
  violationCount: number;
  violations: ViolationEntry[];
  startedAt: string;
  submittedAt?: string;
}

interface LiveStatusData {
  test: {
    _id: string;
    title: string;
    totalTimeMinutes: number;
    totalMarks: number;
  };
  attempts: AttemptData[];
}

const VIOLATION_LABELS: Record<string, string> = {
  tab_switch: 'Tab Switch',
  fullscreen_exit: 'Fullscreen Exit',
  focus_lost: 'Focus Lost',
  devtools: 'DevTools Opened',
  no_face: 'No Face Detected',
  multiple_faces: 'Multiple Faces',
};

function formatElapsed(startedAt: string): string {
  const ms = Date.now() - new Date(startedAt).getTime();
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function ProctorDashboardPage() {
  const { id: testId } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [liveData, setLiveData] = useState<LiveStatusData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [forceSubmitTarget, setForceSubmitTarget] = useState<AttemptData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    if (!testId) return;
    try {
      const data = await testAttemptService.getLiveTestStatus(testId);
      setLiveData(data);
    } catch {
      // Only toast on initial load
      if (isLoading) {
        toast.error('Failed to load live status');
      }
    } finally {
      setIsLoading(false);
    }
  }, [testId, isLoading]);

  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  const handleForceSubmit = async () => {
    if (!forceSubmitTarget) return;
    setIsSubmitting(true);
    try {
      await testAttemptService.forceSubmitAttempt(forceSubmitTarget._id);
      toast.success(
        `Force-submitted ${forceSubmitTarget.studentId.firstName} ${forceSubmitTarget.studentId.lastName}'s attempt`,
      );
      setForceSubmitTarget(null);
      await fetchData();
    } catch {
      toast.error('Failed to force submit');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !liveData) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading live proctor dashboard...
      </div>
    );
  }

  const attempts = liveData.attempts || [];

  // Compute summary counts
  const totalStudents = attempts.length;
  const inProgressCount = attempts.filter((a) => a.status === 'IN_PROGRESS').length;
  const submittedCount = attempts.filter(
    (a) => a.status === 'SUBMITTED' || a.status === 'TIMED_OUT',
  ).length;
  const highRiskCount = attempts.filter((a) => a.riskLevel === 'high').length;

  // Filter
  const filteredAttempts = attempts.filter((a) => {
    switch (activeFilter) {
      case 'in_progress':
        return a.status === 'IN_PROGRESS';
      case 'high_risk':
        return a.riskLevel === 'high';
      case 'submitted':
        return a.status === 'SUBMITTED' || a.status === 'TIMED_OUT';
      default:
        return true;
    }
  });

  const filterTabs: { key: FilterTab; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: totalStudents },
    { key: 'in_progress', label: 'In Progress', count: inProgressCount },
    { key: 'high_risk', label: 'High Risk', count: highRiskCount },
    { key: 'submitted', label: 'Submitted', count: submittedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-heading font-semibold">
              Live Proctor Dashboard
            </h2>
            <p className="text-sm text-muted-foreground">
              {liveData.test.title} &middot; {liveData.test.totalTimeMinutes} min &middot;{' '}
              {liveData.test.totalMarks} marks
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalStudents}</p>
              <p className="text-xs text-muted-foreground">Total Students</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{inProgressCount}</p>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{submittedCount}</p>
              <p className="text-xs text-muted-foreground">Submitted</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{highRiskCount}</p>
              <p className="text-xs text-muted-foreground">High Risk</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={cn(
              'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              activeFilter === tab.key
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
          >
            {tab.label}{' '}
            <span
              className={cn(
                'ml-1 text-xs',
                activeFilter === tab.key ? 'text-primary-foreground/80' : 'text-muted-foreground',
              )}
            >
              ({tab.count})
            </span>
          </button>
        ))}
      </div>

      {/* Student Grid */}
      {filteredAttempts.length === 0 ? (
        <div className="text-center py-10 text-muted-foreground text-sm">
          No students match the current filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAttempts.map((attempt) => {
            const student = attempt.studentId;
            const isExpanded = expandedCard === attempt._id;
            const riskColors: Record<string, string> = {
              low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
              high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            };
            const statusLabels: Record<string, string> = {
              IN_PROGRESS: 'In Progress',
              SUBMITTED: 'Submitted',
              TIMED_OUT: 'Timed Out',
            };
            const statusColors: Record<string, string> = {
              IN_PROGRESS: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              SUBMITTED: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              TIMED_OUT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
            };

            return (
              <Card
                key={attempt._id}
                className={cn(
                  'transition-shadow',
                  attempt.riskLevel === 'high' && 'border-red-300 dark:border-red-700',
                  attempt.riskLevel === 'medium' && 'border-amber-300 dark:border-amber-700',
                )}
              >
                <CardContent className="p-4 space-y-3">
                  {/* Student info row */}
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-sm">
                        {student?.firstName} {student?.lastName}
                      </p>
                      {student?.batch && (
                        <p className="text-xs text-muted-foreground">
                          Batch: {student.batch}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <Badge
                        className={cn(
                          'text-[10px] px-1.5',
                          statusColors[attempt.status] || '',
                        )}
                      >
                        {statusLabels[attempt.status] || attempt.status}
                      </Badge>
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <Badge
                      className={cn(
                        'text-[10px] px-1.5',
                        riskColors[attempt.riskLevel] || riskColors.low,
                      )}
                    >
                      <Shield className="h-3 w-3 mr-0.5" />
                      {attempt.riskLevel.charAt(0).toUpperCase() + attempt.riskLevel.slice(1)} Risk
                    </Badge>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {attempt.violationCount || 0} violations
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatElapsed(attempt.startedAt)}
                    </span>
                  </div>

                  {/* Actions row */}
                  <div className="flex items-center gap-2">
                    {attempt.status === 'IN_PROGRESS' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setForceSubmitTarget(attempt)}
                      >
                        Force Submit
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs h-7 ml-auto"
                      onClick={() =>
                        setExpandedCard(isExpanded ? null : attempt._id)
                      }
                    >
                      {isExpanded ? (
                        <>
                          Hide Violations <ChevronUp className="h-3 w-3 ml-1" />
                        </>
                      ) : (
                        <>
                          Violations <ChevronDown className="h-3 w-3 ml-1" />
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Expanded violation timeline */}
                  {isExpanded && (
                    <div className="border-t pt-3 space-y-2 max-h-48 overflow-y-auto">
                      {(!attempt.violations || attempt.violations.length === 0) ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          No violations recorded
                        </p>
                      ) : (
                        attempt.violations.map((v, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs"
                          >
                            <div className="h-1.5 w-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                            <div>
                              <span className="font-medium">
                                {VIOLATION_LABELS[v.type] || v.type}
                              </span>
                              <span className="text-muted-foreground ml-1">
                                &mdash; {v.message}
                              </span>
                              <p className="text-muted-foreground mt-0.5">
                                {new Date(v.timestamp).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  second: '2-digit',
                                })}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <p className="text-center text-xs text-muted-foreground">
        Auto-refreshing every 10 seconds
      </p>

      {/* Force Submit Confirmation Dialog */}
      <Dialog
        open={!!forceSubmitTarget}
        onOpenChange={(open) => {
          if (!open) setForceSubmitTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Submit Attempt</DialogTitle>
            <DialogDescription>
              Are you sure you want to force-submit the test for{' '}
              <strong>
                {forceSubmitTarget?.studentId.firstName}{' '}
                {forceSubmitTarget?.studentId.lastName}
              </strong>
              ? This action cannot be undone. The student's current answers will
              be graded and the exam will end immediately.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setForceSubmitTarget(null)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleForceSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Force Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
