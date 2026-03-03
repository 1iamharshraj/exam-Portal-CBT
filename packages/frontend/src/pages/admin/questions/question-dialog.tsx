import { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { IQuestion } from '@exam-portal/shared';
import {
  QuestionType,
  DifficultyLevel,
  SUBJECTS,
  SUBJECT_TOPICS,
} from '@exam-portal/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuestionDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  question?: IQuestion | null;
  isSubmitting: boolean;
}

interface OptionState {
  text: string;
  isCorrect: boolean;
}

const TYPE_LABELS: Record<string, string> = {
  [QuestionType.MCQ_SINGLE]: 'MCQ (Single Correct)',
  [QuestionType.MCQ_MULTIPLE]: 'MCQ (Multiple Correct)',
  [QuestionType.NUMERICAL]: 'Numerical Value',
  [QuestionType.ASSERTION_REASON]: 'Assertion-Reason',
};

const DEFAULT_OPTIONS: OptionState[] = [
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
  { text: '', isCorrect: false },
];

export function QuestionDialog({
  open,
  onClose,
  onSubmit,
  question,
  isSubmitting,
}: QuestionDialogProps) {
  const isEditing = !!question;

  const [questionText, setQuestionText] = useState('');
  const [questionType, setQuestionType] = useState<QuestionType>(QuestionType.MCQ_SINGLE);
  const [options, setOptions] = useState<OptionState[]>(DEFAULT_OPTIONS);
  const [numericalValue, setNumericalValue] = useState('');
  const [numericalTolerance, setNumericalTolerance] = useState('0');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState<DifficultyLevel>(DifficultyLevel.MEDIUM);
  const [marks, setMarks] = useState('4');
  const [negativeMarks, setNegativeMarks] = useState('1');
  const [explanation, setExplanation] = useState('');
  const [tags, setTags] = useState('');
  const [error, setError] = useState('');

  const topics = subject ? SUBJECT_TOPICS[subject] || [] : [];
  const isNumerical = questionType === QuestionType.NUMERICAL;

  useEffect(() => {
    if (!open) return;
    setError('');

    if (question) {
      setQuestionText(question.questionText);
      setQuestionType(question.questionType);
      setSubject(question.subject);
      setTopic(question.topic);
      setSubtopic(question.subtopic || '');
      setDifficultyLevel(question.difficultyLevel);
      setMarks(String(question.marks));
      setNegativeMarks(String(question.negativeMarks));
      setExplanation(question.explanation || '');
      setTags(question.tags.join(', '));

      if (question.questionType === QuestionType.NUMERICAL) {
        const ans = question.correctAnswer as { value: number; tolerance: number };
        setNumericalValue(String(ans.value));
        setNumericalTolerance(String(ans.tolerance));
        setOptions(DEFAULT_OPTIONS);
      } else {
        setOptions(
          question.options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
        );
        setNumericalValue('');
        setNumericalTolerance('0');
      }
    } else {
      setQuestionText('');
      setQuestionType(QuestionType.MCQ_SINGLE);
      setOptions([...DEFAULT_OPTIONS]);
      setNumericalValue('');
      setNumericalTolerance('0');
      setSubject('');
      setTopic('');
      setSubtopic('');
      setDifficultyLevel(DifficultyLevel.MEDIUM);
      setMarks('4');
      setNegativeMarks('1');
      setExplanation('');
      setTags('');
    }
  }, [open, question]);

  const handleOptionCorrectChange = (index: number, checked: boolean) => {
    setOptions((prev) =>
      prev.map((opt, i) => {
        if (questionType === QuestionType.MCQ_SINGLE) {
          return { ...opt, isCorrect: i === index ? checked : false };
        }
        return i === index ? { ...opt, isCorrect: checked } : opt;
      }),
    );
  };

  const addOption = () => {
    setOptions((prev) => [...prev, { text: '', isCorrect: false }]);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setError('');

    if (!questionText.trim()) { setError('Question text is required'); return; }
    if (!subject) { setError('Subject is required'); return; }
    if (!topic) { setError('Topic is required'); return; }

    let correctAnswer: string[] | { value: number; tolerance: number };

    if (isNumerical) {
      if (!numericalValue) { setError('Numerical answer is required'); return; }
      correctAnswer = {
        value: parseFloat(numericalValue),
        tolerance: parseFloat(numericalTolerance) || 0,
      };
    } else {
      const hasCorrect = options.some((o) => o.isCorrect);
      if (!hasCorrect) { setError('Mark at least one correct option'); return; }
      if (options.some((o) => !o.text.trim())) { setError('All options must have text'); return; }
      correctAnswer = options
        .map((o, i) => (o.isCorrect ? String.fromCharCode(65 + i) : null))
        .filter(Boolean) as string[];
    }

    const data: Record<string, unknown> = {
      questionText,
      questionType,
      options: isNumerical ? [] : options.map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
      correctAnswer,
      subject,
      topic,
      subtopic: subtopic || undefined,
      difficultyLevel,
      marks: parseFloat(marks),
      negativeMarks: parseFloat(negativeMarks),
      explanation: explanation || undefined,
      tags: tags ? tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
    };

    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Question' : 'Add Question'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
          )}

          {/* Question Text */}
          <div className="space-y-2">
            <Label>Question Text</Label>
            <textarea
              className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="Enter question text (HTML/LaTeX supported)..."
            />
          </div>

          {/* Type + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Question Type</Label>
              <Select
                value={questionType}
                onValueChange={(v) => {
                  setQuestionType(v as QuestionType);
                  if (v === QuestionType.NUMERICAL) setOptions(DEFAULT_OPTIONS);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPE_LABELS).map(([val, label]) => (
                    <SelectItem key={val} value={val}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={difficultyLevel} onValueChange={(v) => setDifficultyLevel(v as DifficultyLevel)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                  <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                  <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subject + Topic */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subject</Label>
              <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Topic</Label>
              <Select value={topic} onValueChange={setTopic} disabled={!subject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  {topics.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subtopic */}
          <div className="space-y-2">
            <Label>Subtopic (optional)</Label>
            <Input value={subtopic} onChange={(e) => setSubtopic(e.target.value)} placeholder="e.g. Newton's Third Law" />
          </div>

          {/* Options or Numerical Input */}
          {isNumerical ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Correct Value</Label>
                <Input
                  type="number"
                  value={numericalValue}
                  onChange={(e) => setNumericalValue(e.target.value)}
                  placeholder="e.g. 4.5"
                />
              </div>
              <div className="space-y-2">
                <Label>Tolerance (±)</Label>
                <Input
                  type="number"
                  value={numericalTolerance}
                  onChange={(e) => setNumericalTolerance(e.target.value)}
                  placeholder="e.g. 0.01"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="space-y-2">
                {options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Checkbox
                      checked={opt.isCorrect}
                      onCheckedChange={(checked) =>
                        handleOptionCorrectChange(i, checked as boolean)
                      }
                    />
                    <span className="text-sm font-medium w-5">{String.fromCharCode(65 + i)}.</span>
                    <Input
                      className="flex-1"
                      value={opt.text}
                      onChange={(e) =>
                        setOptions((prev) =>
                          prev.map((o, idx) =>
                            idx === i ? { ...o, text: e.target.value } : o,
                          ),
                        )
                      }
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                    />
                    {options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeOption(i)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
                {options.length < 6 && (
                  <Button variant="outline" size="sm" onClick={addOption}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Option
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Check the box next to correct option(s)
              </p>
            </div>
          )}

          {/* Marks */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Positive Marks</Label>
              <Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Negative Marks</Label>
              <Input type="number" value={negativeMarks} onChange={(e) => setNegativeMarks(e.target.value)} />
            </div>
          </div>

          {/* Explanation */}
          <div className="space-y-2">
            <Label>Explanation (optional)</Label>
            <textarea
              className="w-full min-h-[60px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain the correct answer..."
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. JEE_2024, NCERT, HC_Verma"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Question'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
