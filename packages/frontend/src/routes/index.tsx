import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicRoute } from './public-route';
import { ProtectedRoute } from './protected-route';
import { AuthLayout } from '@/layouts/auth-layout';
import { AdminLayout } from '@/components/layout/admin-layout';
import { StudentLayout } from '@/components/layout/student-layout';
import { LoginPage } from '@/pages/auth/login';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { ChangePasswordPage } from '@/pages/auth/change-password';
import { AdminDashboard } from '@/pages/admin/dashboard';
import { TeacherDashboard } from '@/pages/teacher/dashboard';
import { StudentDashboard } from '@/pages/student/dashboard';
import { DashboardRedirect } from '@/pages/dashboard';
import { UserListPage } from '@/pages/admin/users';
import { QuestionBankPage } from '@/pages/admin/questions';
import { TestListPage } from '@/pages/admin/tests';
import { TestBuilderPage } from '@/pages/admin/tests/test-builder';
import { StudentTestsPage } from '@/pages/student/tests';
import { ExamPage } from '@/pages/student/tests/exam-page';
import { ResultPage } from '@/pages/student/tests/result-page';
import { TestResultsPage } from '@/pages/admin/tests/test-results';
import { BatchListPage } from '@/pages/admin/batches';
import { StudentProfilePage } from '@/pages/student/profile';
import { NotFoundPage } from '@/pages/not-found';

export const router = createBrowserRouter([
  // Public auth routes
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/login', element: <LoginPage /> },
          { path: '/forgot-password', element: <ForgotPasswordPage /> },
          { path: '/reset-password/:token', element: <ResetPasswordPage /> },
        ],
      },
    ],
  },

  // Protected routes
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/change-password', element: <ChangePasswordPage /> },

      // Dashboard redirect based on role
      { path: '/dashboard', element: <DashboardRedirect /> },

      // Admin/Teacher layout with sidebar
      {
        element: <AdminLayout />,
        children: [
          { path: '/admin/dashboard', element: <AdminDashboard /> },
          { path: '/teacher/dashboard', element: <TeacherDashboard /> },
          { path: '/users', element: <UserListPage /> },
          { path: '/questions', element: <QuestionBankPage /> },
          { path: '/tests', element: <TestListPage /> },
          { path: '/tests/:id/builder', element: <TestBuilderPage /> },
          { path: '/tests/:id/results', element: <TestResultsPage /> },
          { path: '/batches', element: <BatchListPage /> },
        ],
      },

      // Student layout with top nav
      {
        element: <StudentLayout />,
        children: [
          { path: '/student/dashboard', element: <StudentDashboard /> },
          { path: '/student/tests', element: <StudentTestsPage /> },
          { path: '/student/results/:attemptId', element: <ResultPage /> },
          { path: '/student/profile', element: <StudentProfilePage /> },
        ],
      },

      // Full-screen exam (no layout chrome)
      { path: '/student/exam/:attemptId', element: <ExamPage /> },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);
