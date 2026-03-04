import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PublicRoute } from './public-route';
import { ProtectedRoute } from './protected-route';
import { RouteErrorBoundary } from './route-error-boundary';
import { AuthLayout } from '@/layouts/auth-layout';
import { AdminLayout } from '@/components/layout/admin-layout';
import { StudentLayout } from '@/components/layout/student-layout';
import { PageLoader } from '@/components/common/page-loader';

// Auth pages (small, eagerly loaded for fast login)
import { LoginPage } from '@/pages/auth/login';
import { ForgotPasswordPage } from '@/pages/auth/forgot-password';
import { ResetPasswordPage } from '@/pages/auth/reset-password';
import { ChangePasswordPage } from '@/pages/auth/change-password';
import { DashboardRedirect } from '@/pages/dashboard';
import { NotFoundPage } from '@/pages/not-found';

// Lazy-loaded pages (code splitting)
const AdminDashboard = lazy(() => import('@/pages/admin/dashboard').then((m) => ({ default: m.AdminDashboard })));
const TeacherDashboard = lazy(() => import('@/pages/teacher/dashboard').then((m) => ({ default: m.TeacherDashboard })));
const UserListPage = lazy(() => import('@/pages/admin/users').then((m) => ({ default: m.UserListPage })));
const QuestionBankPage = lazy(() => import('@/pages/admin/questions').then((m) => ({ default: m.QuestionBankPage })));
const TestListPage = lazy(() => import('@/pages/admin/tests').then((m) => ({ default: m.TestListPage })));
const TestBuilderPage = lazy(() => import('@/pages/admin/tests/test-builder').then((m) => ({ default: m.TestBuilderPage })));
const TestResultsPage = lazy(() => import('@/pages/admin/tests/test-results').then((m) => ({ default: m.TestResultsPage })));
const BatchListPage = lazy(() => import('@/pages/admin/batches').then((m) => ({ default: m.BatchListPage })));
const AdminResultsPage = lazy(() => import('@/pages/admin/results').then((m) => ({ default: m.AdminResultsPage })));
const SettingsPage = lazy(() => import('@/pages/admin/settings').then((m) => ({ default: m.SettingsPage })));
const StudentDashboard = lazy(() => import('@/pages/student/dashboard').then((m) => ({ default: m.StudentDashboard })));
const StudentTestsPage = lazy(() => import('@/pages/student/tests').then((m) => ({ default: m.StudentTestsPage })));
const StudentResultsPage = lazy(() => import('@/pages/student/results').then((m) => ({ default: m.StudentResultsPage })));
const ResultPage = lazy(() => import('@/pages/student/tests/result-page').then((m) => ({ default: m.ResultPage })));
const StudentProfilePage = lazy(() => import('@/pages/student/profile').then((m) => ({ default: m.StudentProfilePage })));
const ExamPage = lazy(() => import('@/pages/student/tests/exam-page').then((m) => ({ default: m.ExamPage })));

function LazyPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

export const router = createBrowserRouter([
  // Public auth routes
  {
    element: <PublicRoute />,
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/change-password', element: <ChangePasswordPage /> },

      // Dashboard redirect based on role
      { path: '/dashboard', element: <DashboardRedirect /> },

      // Admin/Teacher layout with sidebar
      {
        element: <AdminLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/admin/dashboard', element: <LazyPage><AdminDashboard /></LazyPage> },
          { path: '/teacher/dashboard', element: <LazyPage><TeacherDashboard /></LazyPage> },
          { path: '/users', element: <LazyPage><UserListPage /></LazyPage> },
          { path: '/questions', element: <LazyPage><QuestionBankPage /></LazyPage> },
          { path: '/tests', element: <LazyPage><TestListPage /></LazyPage> },
          { path: '/tests/:id/builder', element: <LazyPage><TestBuilderPage /></LazyPage> },
          { path: '/tests/:id/results', element: <LazyPage><TestResultsPage /></LazyPage> },
          { path: '/batches', element: <LazyPage><BatchListPage /></LazyPage> },
          { path: '/results', element: <LazyPage><AdminResultsPage /></LazyPage> },
          { path: '/settings', element: <LazyPage><SettingsPage /></LazyPage> },
        ],
      },

      // Student layout with top nav
      {
        element: <StudentLayout />,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/student/dashboard', element: <LazyPage><StudentDashboard /></LazyPage> },
          { path: '/student/tests', element: <LazyPage><StudentTestsPage /></LazyPage> },
          { path: '/student/results', element: <LazyPage><StudentResultsPage /></LazyPage> },
          { path: '/student/results/:attemptId', element: <LazyPage><ResultPage /></LazyPage> },
          { path: '/student/profile', element: <LazyPage><StudentProfilePage /></LazyPage> },
        ],
      },

      // Full-screen exam (no layout chrome)
      { path: '/student/exam/:attemptId', element: <LazyPage><ExamPage /></LazyPage> },
    ],
  },

  // Root redirect
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);
