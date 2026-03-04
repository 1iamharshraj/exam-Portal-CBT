import { LoadingSpinner } from './loading-spinner';

interface PageLoaderProps {
  fullScreen?: boolean;
}

export function PageLoader({ fullScreen = false }: PageLoaderProps) {
  return (
    <div className={`flex w-full items-center justify-center ${fullScreen ? 'h-screen' : 'h-[60vh]'}`}>
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size={40} />
        <p className="text-muted-foreground text-sm">Loading...</p>
      </div>
    </div>
  );
}
