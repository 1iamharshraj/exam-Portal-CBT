import { cn } from '@/lib/utils';

function Bone({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-muted', className)} />
  );
}

/** Skeleton for list/table pages (users, tests, questions, results) */
export function TablePageSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="space-y-1">
        <Bone className="h-6 w-32" />
        <Bone className="h-4 w-48" />
      </div>

      {/* Filters bar */}
      <div className="flex gap-3">
        <Bone className="h-10 flex-1" />
        <Bone className="h-10 w-[160px]" />
      </div>

      {/* Table */}
      <div className="rounded-lg border">
        <div className="border-b px-4 py-3">
          <div className="flex gap-4">
            <Bone className="h-4 w-32" />
            <Bone className="h-4 w-20 hidden sm:block" />
            <Bone className="h-4 w-16 hidden md:block" />
            <Bone className="h-4 w-20 hidden sm:block" />
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b last:border-0 px-4 py-3">
            <Bone className="h-4 flex-1" />
            <Bone className="h-4 w-20 hidden sm:block" />
            <Bone className="h-4 w-16 hidden md:block" />
            <Bone className="h-8 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Skeleton for dashboard pages with stat cards */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <Bone className="h-7 w-40" />
        <Bone className="h-4 w-56" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <Bone className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Bone className="h-3 w-16" />
                <Bone className="h-6 w-12" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart area */}
      <div className="rounded-lg border p-6">
        <Bone className="h-5 w-32 mb-4" />
        <Bone className="h-48 w-full" />
      </div>
    </div>
  );
}

/** Skeleton for card-based list pages */
export function CardListSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <Bone className="h-6 w-32" />
        <Bone className="h-4 w-48" />
      </div>

      <div className="flex gap-3">
        <Bone className="h-10 flex-1" />
        <Bone className="h-10 w-[160px]" />
        <Bone className="h-10 w-[160px]" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <Bone className="h-5 w-16" />
              <Bone className="h-6 w-6 rounded" />
            </div>
            <Bone className="h-5 w-3/4" />
            <Bone className="h-4 w-1/2" />
            <div className="flex gap-2">
              <Bone className="h-5 w-14" />
              <Bone className="h-5 w-14" />
              <Bone className="h-5 w-14" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
