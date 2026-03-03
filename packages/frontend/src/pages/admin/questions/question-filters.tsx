import { Search, X } from 'lucide-react';
import {
  QuestionType,
  DifficultyLevel,
  SUBJECTS,
  SUBJECT_TOPICS,
} from '@exam-portal/shared';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface QuestionFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  subject: string;
  onSubjectChange: (v: string) => void;
  topic: string;
  onTopicChange: (v: string) => void;
  questionType: string;
  onQuestionTypeChange: (v: string) => void;
  difficulty: string;
  onDifficultyChange: (v: string) => void;
  onClear: () => void;
}

const TYPE_LABELS: Record<string, string> = {
  [QuestionType.MCQ_SINGLE]: 'MCQ (Single)',
  [QuestionType.MCQ_MULTIPLE]: 'MCQ (Multiple)',
  [QuestionType.NUMERICAL]: 'Numerical',
  [QuestionType.ASSERTION_REASON]: 'Assertion-Reason',
};

export function QuestionFilters({
  search,
  onSearchChange,
  subject,
  onSubjectChange,
  topic,
  onTopicChange,
  questionType,
  onQuestionTypeChange,
  difficulty,
  onDifficultyChange,
  onClear,
}: QuestionFiltersProps) {
  const topics = subject && subject !== 'all' ? SUBJECT_TOPICS[subject] || [] : [];
  const hasFilters = search || subject || topic || questionType || difficulty;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search questions..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={subject} onValueChange={(v) => { onSubjectChange(v); onTopicChange(''); }}>
          <SelectTrigger className="w-full sm:w-[150px]">
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
          <Select value={topic} onValueChange={onTopicChange}>
            <SelectTrigger className="w-full sm:w-[180px]">
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
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={questionType} onValueChange={onQuestionTypeChange}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_LABELS).map(([val, label]) => (
              <SelectItem key={val} value={val}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={difficulty} onValueChange={onDifficultyChange}>
          <SelectTrigger className="w-full sm:w-[140px]">
            <SelectValue placeholder="Difficulty" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Levels</SelectItem>
            <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
            <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
            <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={onClear}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
