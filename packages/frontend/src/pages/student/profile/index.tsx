import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Phone,
  Layers,
  Calendar,
  ClipboardList,
  TrendingUp,
  Award,
  Pencil,
} from 'lucide-react';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AttemptStatus } from '@exam-portal/shared';
import type { ITestAttempt } from '@exam-portal/shared';
import { useAuth } from '@/hooks/use-auth';
import { testAttemptService } from '@/services/test-attempt.service';
import { userService } from '@/services/user.service';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be 10 digits')
    .optional()
    .or(z.literal('')),
});

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>;

export function StudentProfilePage() {
  const { user } = useAuth();
  const [attempts, setAttempts] = useState<ITestAttempt[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<UpdateProfileFormData>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    async function loadAttempts() {
      try {
        const data = await testAttemptService.getMyAttempts();
        setAttempts(data);
      } catch {
        // silently fail - stats will show zeros
      } finally {
        setIsLoading(false);
      }
    }
    loadAttempts();
  }, []);

  useEffect(() => {
    if (editOpen && user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone || '',
      });
    }
  }, [editOpen, user, reset]);

  const completedAttempts = attempts.filter(
    (a) => a.status === AttemptStatus.SUBMITTED || a.status === AttemptStatus.TIMED_OUT,
  );
  const totalTests = completedAttempts.length;

  const getMaxScore = (attempt: ITestAttempt) => {
    const test = attempt.testId as unknown as { totalMarks?: number };
    return test?.totalMarks ?? 0;
  };

  const avgScore =
    totalTests > 0
      ? Math.round(
          completedAttempts.reduce((sum, a) => {
            const max = getMaxScore(a);
            return sum + (max > 0 ? ((a.totalScore ?? 0) / max) * 100 : 0);
          }, 0) / totalTests,
        )
      : 0;
  const bestScore =
    totalTests > 0
      ? Math.round(
          Math.max(
            ...completedAttempts.map((a) => {
              const max = getMaxScore(a);
              return max > 0 ? ((a.totalScore ?? 0) / max) * 100 : 0;
            }),
          ),
        )
      : 0;

  const handleEditSubmit = async (data: UpdateProfileFormData) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      const updateData: Record<string, string> = {
        firstName: data.firstName,
        lastName: data.lastName,
      };
      if (data.phone) updateData.phone = data.phone;
      await userService.update(user._id, updateData);
      toast.success('Profile updated. Changes will appear on next login.');
      setEditOpen(false);
    } catch {
      toast.error('Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-semibold">My Profile</h1>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="h-4 w-4 mr-1" />
          Edit Profile
        </Button>
      </div>

      {/* Profile info card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Avatar */}
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary text-2xl font-bold text-primary-foreground shrink-0">
              {user.firstName[0]}
              {user.lastName[0]}
            </div>

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Full Name</p>
                  <p className="text-sm font-medium">
                    {user.firstName} {user.lastName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Phone</p>
                  <p className="text-sm font-medium">{user.phone || '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Batch</p>
                  <p className="text-sm font-medium">
                    {user.batch ? (
                      <Badge variant="outline" className="font-mono text-xs">
                        {user.batch}
                      </Badge>
                    ) : (
                      '—'
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Member Since</p>
                  <p className="text-sm font-medium">
                    {new Date(user.createdAt).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400">
                <ClipboardList className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Tests Completed</p>
                <p className="text-2xl font-semibold">{isLoading ? '...' : totalTests}</p>
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
                <p className="text-2xl font-semibold">{isLoading ? '...' : `${avgScore}%`}</p>
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
                <p className="text-2xl font-semibold">{isLoading ? '...' : `${bestScore}%`}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent test history */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Test History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading...</p>
          ) : completedAttempts.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No completed tests yet. Start taking tests to see your history here.
            </p>
          ) : (
            <div className="space-y-3">
              {completedAttempts.slice(0, 5).map((attempt) => (
                <div
                  key={attempt._id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {typeof attempt.testId === 'object'
                        ? (attempt.testId as { title?: string }).title
                        : 'Test'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {new Date(attempt.submittedAt || attempt.updatedAt).toLocaleDateString(
                        'en-IN',
                        { day: 'numeric', month: 'short', year: 'numeric' },
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">
                      {attempt.totalScore ?? 0}/{getMaxScore(attempt)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {getMaxScore(attempt) > 0
                        ? Math.round(((attempt.totalScore ?? 0) / getMaxScore(attempt)) * 100)
                        : 0}
                      %
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit profile dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => !v && setEditOpen(false)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(handleEditSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input id="firstName" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-xs text-destructive">{errors.firstName.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input id="lastName" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-xs text-destructive">{errors.lastName.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register('phone')} placeholder="10 digits" />
              {errors.phone && (
                <p className="text-xs text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
