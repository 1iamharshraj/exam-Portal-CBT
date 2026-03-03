import { CheckCircle2, XCircle } from 'lucide-react';
import type { IQuestion, INumericalAnswer } from '@exam-portal/shared';
import { QuestionType } from '@exam-portal/shared';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface QuestionPreviewProps {
  question: IQuestion | null;
  open: boolean;
  onClose: () => void;
}

export function QuestionPreview({ question, open, onClose }: QuestionPreviewProps) {
  if (!question) return null;

  const isNumerical = question.questionType === QuestionType.NUMERICAL;
  const numericalAnswer = isNumerical
    ? (question.correctAnswer as INumericalAnswer)
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Question Preview
            <Badge variant="outline" className="text-xs font-normal">
              {question.questionType}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Question text */}
          <div
            className="prose prose-sm dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: question.questionText }}
          />

          <Separator />

          {/* Options or Numerical Answer */}
          {!isNumerical && question.options.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Options</p>
              {question.options.map((opt, i) => (
                <div
                  key={opt.id || i}
                  className={cn(
                    'flex items-start gap-2 rounded-md border p-3 text-sm',
                    opt.isCorrect && 'border-green-500 bg-green-50 dark:bg-green-900/10',
                  )}
                >
                  {opt.isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  )}
                  <span className="font-medium mr-1">{String.fromCharCode(65 + i)}.</span>
                  <span dangerouslySetInnerHTML={{ __html: opt.text }} />
                </div>
              ))}
            </div>
          )}

          {isNumerical && numericalAnswer && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Correct Answer</p>
              <div className="rounded-md border border-green-500 bg-green-50 dark:bg-green-900/10 p-3 text-sm">
                <span className="font-semibold">{numericalAnswer.value}</span>
                {numericalAnswer.tolerance > 0 && (
                  <span className="text-muted-foreground"> (± {numericalAnswer.tolerance})</span>
                )}
              </div>
            </div>
          )}

          {/* Explanation */}
          {question.explanation && (
            <>
              <Separator />
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Explanation</p>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: question.explanation }}
                />
              </div>
            </>
          )}

          {/* Metadata */}
          <Separator />
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>{question.subject} → {question.topic}</span>
            {question.subtopic && <span>→ {question.subtopic}</span>}
            <span>| {question.difficultyLevel}</span>
            <span>| +{question.marks} / −{question.negativeMarks}</span>
            {question.tags.length > 0 && (
              <span>| Tags: {question.tags.join(', ')}</span>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
