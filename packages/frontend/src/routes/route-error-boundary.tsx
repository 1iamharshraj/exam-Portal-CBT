import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function RouteErrorBoundary() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = 'Something went wrong';
  let message = 'An unexpected error occurred. Please try again.';

  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      title = 'Page not found';
      message = 'The page you are looking for does not exist.';
    } else if (error.status === 403) {
      title = 'Access denied';
      message = 'You do not have permission to view this page.';
    } else {
      title = `Error ${error.status}`;
      message = error.statusText || message;
    }
  } else if (error instanceof Error) {
    message = error.message;
  }

  return (
    <div className="flex h-[60vh] w-full items-center justify-center px-4">
      <div className="max-w-md text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </div>
        <h2 className="text-xl font-heading font-semibold text-foreground mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground mb-6">{message}</p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Go Back
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-1.5" />
            Reload
          </Button>
          <Button onClick={() => navigate('/dashboard')}>
            <Home className="h-4 w-4 mr-1.5" />
            Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
