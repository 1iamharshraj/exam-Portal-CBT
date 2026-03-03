import { cn } from '@/lib/utils';

interface ActivityEvent {
  id: string;
  icon: React.ElementType;
  text: string;
  time: string;
  color?: string;
}

interface ActivityFeedProps {
  events: ActivityEvent[];
  className?: string;
}

export function ActivityFeed({ events, className }: ActivityFeedProps) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className={cn('space-y-0', className)}>
      {events.map((event, index) => (
        <div key={event.id} className="flex gap-3 py-3">
          <div className="flex flex-col items-center">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full shrink-0',
                event.color || 'bg-primary/10 text-primary',
              )}
            >
              <event.icon className="h-4 w-4" />
            </div>
            {index < events.length - 1 && (
              <div className="w-px flex-1 bg-border mt-1" />
            )}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-sm text-foreground">{event.text}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{event.time}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
