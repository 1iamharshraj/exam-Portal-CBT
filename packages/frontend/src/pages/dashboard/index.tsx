import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { UserRole } from '@exam-portal/shared';
import { PageLoader } from '@/components/common/page-loader';

export function DashboardRedirect() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) return <PageLoader />;

  switch (user.role) {
    case UserRole.SUPER_ADMIN:
    case UserRole.ADMIN:
      return <Navigate to="/admin/dashboard" replace />;
    case UserRole.TEACHER:
      return <Navigate to="/teacher/dashboard" replace />;
    case UserRole.STUDENT:
      return <Navigate to="/student/dashboard" replace />;
    default:
      return <Navigate to="/login" replace />;
  }
}
