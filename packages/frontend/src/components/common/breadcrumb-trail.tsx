import { Link, useLocation } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  admin: 'Admin',
  teacher: 'Teacher',
  student: 'Student',
  users: 'Users',
  questions: 'Question Bank',
  tests: 'Tests',
  results: 'Results',
  settings: 'Settings',
  batches: 'Batches',
  analytics: 'Analytics',
  leaderboard: 'Leaderboard',
  profile: 'Profile',
  new: 'New',
  edit: 'Edit',
  import: 'Import',
  builder: 'Builder',
  proctor: 'Live Monitor',
  review: 'Solution Review',
  report: 'Report Card',
};

/** MongoDB ObjectIds and other hex IDs should be skipped in breadcrumbs */
function isIdSegment(segment: string): boolean {
  return /^[a-f0-9]{24}$/.test(segment) || /^[a-f0-9-]{36}$/.test(segment);
}

export function BreadcrumbTrail() {
  const location = useLocation();
  const segments = location.pathname.split('/').filter(Boolean);

  if (segments.length <= 1) return null;

  // Filter out raw ID segments for display
  const displaySegments = segments.filter((s) => !isIdSegment(s));

  if (displaySegments.length <= 1) return null;

  return (
    <nav className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
      {displaySegments.map((segment, index) => {
        // Build the actual path including any IDs between display segments
        const segmentPosInOriginal = segments.indexOf(segment);
        const path = '/' + segments.slice(0, segmentPosInOriginal + 1).join('/');
        const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        const isLast = index === displaySegments.length - 1;

        return (
          <span key={path} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-3 w-3" />}
            {isLast ? (
              <span className="text-foreground font-medium">{label}</span>
            ) : (
              <Link to={path} className="hover:text-foreground transition-colors">
                {label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
