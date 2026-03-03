import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@exam-portal/shared';

export function DashboardPage() {
  const { user } = useAuth();

  return (
    <div>
      <h1 className="text-2xl font-heading font-semibold mb-4">
        {user?.role === UserRole.ADMIN && 'Admin Dashboard'}
        {user?.role === UserRole.TEACHER && 'Teacher Dashboard'}
        {user?.role === UserRole.STUDENT && 'Student Dashboard'}
        {user?.role === UserRole.SUPER_ADMIN && 'Super Admin Dashboard'}
      </h1>
      <p className="text-muted-foreground">
        Welcome, {user?.firstName} {user?.lastName}. Dashboard widgets will be built in Sprint 2.
      </p>
    </div>
  );
}
