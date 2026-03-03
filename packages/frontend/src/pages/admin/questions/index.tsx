import { useState, useEffect, useCallback } from 'react';
import { Plus, Upload, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import type { IQuestion, ICreateQuestionRequest } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/common/pagination';
import {
  questionService,
  type QuestionFilters as Filters,
} from '@/services/question.service';
import { QuestionFilters } from './question-filters';
import { QuestionCard } from './question-card';
import { QuestionDialog } from './question-dialog';
import { QuestionPreview } from './question-preview';
import { QuestionImportDialog } from './question-import-dialog';

export function QuestionBankPage() {
  const [questions, setQuestions] = useState<IQuestion[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [questionType, setQuestionType] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Dialogs
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<IQuestion | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewQuestion, setPreviewQuestion] = useState<IQuestion | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState<{ total: number } | null>(null);

  const fetchQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: Filters = { page, limit };
      if (search) filters.search = search;
      if (subject && subject !== 'all') filters.subject = subject;
      if (topic && topic !== 'all') filters.topic = topic;
      if (questionType && questionType !== 'all') filters.questionType = questionType;
      if (difficulty && difficulty !== 'all') filters.difficultyLevel = difficulty;

      const result = await questionService.getAll(filters);
      setQuestions(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Failed to load questions');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, subject, topic, questionType, difficulty, limit]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    questionService.getStats().then(setStats).catch(() => {});
  }, []);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleCreate = () => {
    setEditingQuestion(null);
    setDialogOpen(true);
  };

  const handleEdit = (q: IQuestion) => {
    setEditingQuestion(q);
    setDialogOpen(true);
  };

  const handleDialogSubmit = async (data: Record<string, unknown>) => {
    setIsSubmitting(true);
    try {
      if (editingQuestion) {
        await questionService.update(editingQuestion._id, data);
        toast.success('Question updated');
      } else {
        await questionService.create(data as unknown as ICreateQuestionRequest);
        toast.success('Question created');
      }
      setDialogOpen(false);
      fetchQuestions();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Operation failed';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (q: IQuestion) => {
    if (!confirm('Delete this question? This cannot be undone.')) return;
    try {
      await questionService.delete(q._id);
      toast.success('Question deleted');
      fetchQuestions();
    } catch {
      toast.error('Failed to delete question');
    }
  };

  const handleImport = async (questions: ICreateQuestionRequest[]) => {
    const result = await questionService.bulkImport(questions);
    if (result.created > 0) fetchQuestions();
    return result;
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setSubject('');
    setTopic('');
    setQuestionType('');
    setDifficulty('');
    setPage(1);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Question Bank</h2>
          <p className="text-sm text-muted-foreground">
            {stats ? `${stats.total} total questions` : `${total} questions found`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Import CSV
          </Button>
          <Button size="sm" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Filters */}
      <QuestionFilters
        search={searchInput}
        onSearchChange={setSearchInput}
        subject={subject}
        onSubjectChange={(v) => { setSubject(v); setPage(1); }}
        topic={topic}
        onTopicChange={(v) => { setTopic(v); setPage(1); }}
        questionType={questionType}
        onQuestionTypeChange={(v) => { setQuestionType(v); setPage(1); }}
        difficulty={difficulty}
        onDifficultyChange={(v) => { setDifficulty(v); setPage(1); }}
        onClear={handleClearFilters}
      />

      {/* Questions List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading questions...
        </div>
      ) : questions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No questions found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-1" />
            Add your first question
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q, i) => (
            <QuestionCard
              key={q._id}
              question={q}
              index={(page - 1) * limit + i + 1}
              onPreview={setPreviewQuestion}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={limit}
          onPageChange={setPage}
        />
      )}

      {/* Dialogs */}
      <QuestionDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handleDialogSubmit}
        question={editingQuestion}
        isSubmitting={isSubmitting}
      />

      <QuestionPreview
        question={previewQuestion}
        open={!!previewQuestion}
        onClose={() => setPreviewQuestion(null)}
      />

      <QuestionImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
      />
    </div>
  );
}
