import { MoreHorizontal, Eye, Pencil, Trash2 } from 'lucide-react';
import type { IQuestion } from '@exam-portal/shared';
import { QuestionType, DifficultyLevel } from '@exam-portal/shared';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MathRenderer } from '@/components/common/math-renderer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface QuestionCardProps {
  question: IQuestion;
  index: number;
  onPreview: (q: IQuestion) => void;
  onEdit: (q: IQuestion) => void;
  onDelete: (q: IQuestion) => void;
}

const TYPE_LABELS: Record<string, string> = {
  [QuestionType.MCQ_SINGLE]: 'MCQ Single',
  [QuestionType.MCQ_MULTIPLE]: 'MCQ Multiple',
  [QuestionType.NUMERICAL]: 'Numerical',
  [QuestionType.ASSERTION_REASON]: 'Assertion-Reason',
};

const DIFFICULTY_STYLES: Record<string, string> = {
  [DifficultyLevel.EASY]: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  [DifficultyLevel.MEDIUM]: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  [DifficultyLevel.HARD]: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export function QuestionCard({
  question,
  index,
  onPreview,
  onEdit,
  onDelete,
}: QuestionCardProps) {
  return (
    <div className="flex gap-3 rounded-lg border bg-card p-4 hover:shadow-sm transition-shadow">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
        {index}
      </div>

      <div className="flex-1 min-w-0 space-y-2">
        <MathRenderer html={question.questionText} className="text-sm font-medium leading-snug line-clamp-2" />

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs font-normal">
            {question.subject}
          </Badge>
          <Badge variant="secondary" className="text-xs font-normal">
            {question.topic}
          </Badge>
          <Badge
            variant="secondary"
            className={cn('text-xs font-normal', DIFFICULTY_STYLES[question.difficultyLevel])}
          >
            {question.difficultyLevel}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal">
            {TYPE_LABELS[question.questionType] || question.questionType}
          </Badge>
          <Badge variant="outline" className="text-xs font-normal">
            +{question.marks}/−{question.negativeMarks}
          </Badge>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onPreview(question)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(question)}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive"
            onClick={() => onDelete(question)}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
