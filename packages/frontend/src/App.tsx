import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/routes';
import { useAuthStore } from '@/stores/auth.store';
import { ErrorBoundary } from '@/components/common/error-boundary';
import { ThemeProvider } from '@/components/layout/theme-provider';

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster position="bottom-center" richColors />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
