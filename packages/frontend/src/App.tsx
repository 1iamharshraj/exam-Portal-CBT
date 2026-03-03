import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { router } from '@/routes';
import { useAuthStore } from '@/stores/auth.store';
import { ErrorBoundary } from '@/components/common/error-boundary';

function App() {
  const checkAuth = useAuthStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
      <Toaster position="bottom-center" richColors />
    </ErrorBoundary>
  );
}

export default App;
