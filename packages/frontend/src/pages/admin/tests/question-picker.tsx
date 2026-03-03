import { useState, useEffect, useCallback } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import type { IQuestion } from '@exam-portal/shared';
import { SUBJECTS, SUBJECT_TOPICS, DifficultyLevel, QuestionType } from '@exam-portal/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { questionService } from '@/services/question.service';

interface QuestionPickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (questions: IQuestion[]) => void;
  existingIds: string[];
  defaultSubject?: string;
}

const DIFF_COLORS: Record<string, string> = {
  EASY: 'bg-green-100 text-green-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  HARD: 'bg-red-100 text-red-700',
};

export function QuestionPicker({
  open,
  onClose,
  onAdd,
  existingIds,
  defaultSubject,
}: QuestionPickerProps) {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState(defaultSubject || '');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 15;

  const topics = subject && subject !== 'all' ? SUBJECT_TOPICS[subject] || [] : [];

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Record<string, string | number> = { page, limit };
      if (search) filters.search = search;
      if (subject && subject !== 'all') filters.subject = subject;
      if (topic && topic !== 'all') filters.topic = topic;
      if (difficulty && difficulty !== 'all') filters.difficultyLevel = difficulty;
      if (questionType && questionType !== 'all') filters.questionType = questionType;

      const result = await questionService.getAll(filters);
      setQuestions(result.data);
      setTotal(result.total);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [page, search, subject, topic, difficulty, questionType, limit]);

  useEffect(() => {
    if (open) fetchQuestions();
  }, [open, fetchQuestions]);

  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setSubject(defaultSubject || '');
      setTopic('');
      setSearchInput('');
      setSearch('');
      setPage(1);
    }
  }, [open, defaultSubject]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAdd = () => {
    const selectedQuestions = questions.filter((q) => selected.has(q._id));
    onAdd(selectedQuestions);
    onClose();
  };

  const stripHtml = (html: string) => html.replace(/<[^>]*>/g, '');
  const isAlreadyAdded = (id: string) => existingIds.includes(id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Add Questions</DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search questions..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Select value={subject} onValueChange={(v) => { setSubject(v); setTopic(''); setPage(1); }}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {SUBJECTS.map((s) => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {topics.length > 0 && (
            <Select value={topic} onValueChange={(v) => { setTopic(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Topics</SelectItem>
                {topics.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={difficulty} onValueChange={(v) => { setDifficulty(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-28">
              <SelectValue placeholder="Difficulty" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
              <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
              <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
            </SelectContent>
          </Select>
          <Select value={questionType} onValueChange={(v) => { setQuestionType(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-32">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value={QuestionType.MCQ_SINGLE}>MCQ Single</SelectItem>
              <SelectItem value={QuestionType.MCQ_MULTIPLE}>MCQ Multi</SelectItem>
              <SelectItem value={QuestionType.NUMERICAL}>Numerical</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Question List */}
        <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              Loading questions...
            </div>
          ) : questions.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground text-sm">
              No questions found
            </div>
          ) : (
            questions.map((q) => {
              const added = isAlreadyAdded(q._id);
              const isSelected = selected.has(q._id);
              return (
                <div
                  key={q._id}
                  className={`rounded-md border p-3 cursor-pointer transition-colors ${
                    added
                      ? 'opacity-50 cursor-not-allowed bg-muted'
                      : isSelected
                        ? 'border-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                  }`}
                  onClick={() => !added && toggleSelect(q._id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">
                      {added ? (
                        <div className="h-5 w-5 rounded border bg-muted flex items-center justify-center">
                          <Check className="h-3 w-3 text-muted-foreground" />
                        </div>
                      ) : (
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center ${
                          isSelected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                        }`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">
                        {stripHtml(q.questionText)}
                      </p>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <Badge variant="outline" className="text-[10px]">{q.subject}</Badge>
                        {q.topic && <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>}
                        <Badge className={`text-[10px] ${DIFF_COLORS[q.difficultyLevel]}`}>
                          {q.difficultyLevel}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {q.questionType.replace('_', ' ')}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          +{q.marks} / -{q.negativeMarks}
                        </span>
                        {added && (
                          <span className="text-[10px] text-muted-foreground italic">Already added</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t pt-3">
          <div className="text-sm text-muted-foreground">
            {total} questions found{selected.size > 0 && ` · ${selected.size} selected`}
            {page > 1 && (
              <Button variant="ghost" size="sm" className="ml-2" onClick={() => setPage((p) => p - 1)}>
                Prev
              </Button>
            )}
            {questions.length === limit && (
              <Button variant="ghost" size="sm" className="ml-1" onClick={() => setPage((p) => p + 1)}>
                Next
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={selected.size === 0}>
              <Plus className="h-4 w-4 mr-1" />
              Add {selected.size > 0 ? `(${selected.size})` : ''}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
