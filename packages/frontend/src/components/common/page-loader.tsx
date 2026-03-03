import { LoadingSpinner } from './loading-spinner';

export function PageLoader() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size={40} />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
