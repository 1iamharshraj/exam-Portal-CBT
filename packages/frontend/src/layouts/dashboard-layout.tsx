import { Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';

export function DashboardLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Placeholder header — full sidebar + topbar built in Sprint 2 */}
      <header className="border-b bg-card px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-heading font-semibold text-navy">CBT Platform</h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {user?.firstName} {user?.lastName}
          </span>
          <span className="text-xs bg-secondary px-2 py-0.5 rounded font-medium">
            {user?.role}
          </span>
          <button
            onClick={() => logout()}
            className="text-sm text-destructive hover:underline"
          >
            Logout
          </button>
        </div>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  );
}
