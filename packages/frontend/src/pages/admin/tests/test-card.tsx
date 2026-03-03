import { Calendar, Clock, Users, MoreHorizontal, Eye, Pencil, Trash2, Send, BarChart3 } from 'lucide-react';
import type { ITest } from '@exam-portal/shared';
import { TestStatus } from '@exam-portal/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TestCardProps {
  test: ITest;
  onView: (t: ITest) => void;
  onEdit: (t: ITest) => void;
  onPublish: (t: ITest) => void;
  onDelete: (t: ITest) => void;
  onResults?: (t: ITest) => void;
}

const STATUS_STYLES: Record<string, string> = {
  [TestStatus.DRAFT]: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  [TestStatus.PUBLISHED]: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  [TestStatus.ACTIVE]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [TestStatus.COMPLETED]: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
};

export function TestCard({ test, onView, onEdit, onPublish, onDelete, onResults }: TestCardProps) {
  const totalQuestions = test.sections.reduce((sum, s) => sum + s.questionCount, 0);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold truncate">{test.title}</h3>
              <Badge variant="secondary" className={cn('text-xs font-normal shrink-0', STATUS_STYLES[test.status])}>
                {test.status}
              </Badge>
            </div>

            {test.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">{test.description}</p>
            )}

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {test.totalTimeMinutes} min
              </span>
              <span>{totalQuestions} questions</span>
              <span>{test.totalMarks} marks</span>
              <span>{test.sections.length} sections</span>
              <Badge variant="outline" className="text-xs font-normal">
                {test.examType.replace('_', ' ')}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              {test.startTime && (
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(test.startTime)}
                </span>
              )}
              {test.assignedBatches.length > 0 && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {test.assignedBatches.join(', ')}
                </span>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onView(test)}>
                <Eye className="h-4 w-4 mr-2" />
                View Details
              </DropdownMenuItem>
              {test.status === TestStatus.DRAFT && (
                <DropdownMenuItem onClick={() => onEdit(test)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>
              )}
              {test.status === TestStatus.DRAFT && (
                <DropdownMenuItem onClick={() => onPublish(test)}>
                  <Send className="h-4 w-4 mr-2" />
                  Publish
                </DropdownMenuItem>
              )}
              {test.status !== TestStatus.DRAFT && onResults && (
                <DropdownMenuItem onClick={() => onResults(test)}>
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Results
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDelete(test)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}
