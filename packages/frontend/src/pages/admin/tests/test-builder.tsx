import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Shuffle,
  Send,
  GripVertical,
} from 'lucide-react';
import { toast } from 'sonner';
import type { ITest, IQuestion } from '@exam-portal/shared';
import { TestStatus, DifficultyLevel } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { testService } from '@/services/test.service';
import { MathRenderer } from '@/components/common/math-renderer';
import { QuestionPicker } from './question-picker';

export function TestBuilderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [test, setTest] = useState<ITest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState(0);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Auto-pick state
  const [autoPickCount, setAutoPickCount] = useState(10);
  const [autoPickDifficulty, setAutoPickDifficulty] = useState('');

  const fetchTest = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await testService.getById(id);
      setTest(data);
    } catch {
      toast.error('Failed to load test');
      navigate('/tests');
    } finally {
      setIsLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchTest();
  }, [fetchTest]);

  if (isLoading || !test) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        Loading test builder...
      </div>
    );
  }

  const section = test.sections[activeSection];
  // sections.questionIds is populated by backend, so it contains full question objects
  const sectionQuestions = (section?.questionIds || []) as unknown as IQuestion[];
  const questionIdStrings = sectionQuestions.map((q) =>
    typeof q === 'string' ? q : q._id,
  );

  const handleAddQuestions = async (questions: IQuestion[]) => {
    if (!id || !section) return;
    const existingSet = new Set(questionIdStrings);
    const deduped = questions.filter((q) => !existingSet.has(q._id));
    if (deduped.length === 0) {
      toast.info('All selected questions are already in this section');
      return;
    }
    const newIds = [...questionIdStrings, ...deduped.map((q) => q._id)];
    setIsSaving(true);
    try {
      const updated = await testService.updateSectionQuestions(id, activeSection, newIds);
      setTest(updated);
      toast.success(`Added ${deduped.length} question(s)`);
    } catch {
      toast.error('Failed to add questions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveQuestion = async (questionId: string) => {
    if (!id) return;
    const newIds = questionIdStrings.filter((qid) => qid !== questionId);
    setIsSaving(true);
    try {
      const updated = await testService.updateSectionQuestions(id, activeSection, newIds);
      setTest(updated);
      toast.success('Question removed');
    } catch {
      toast.error('Failed to remove question');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAutoPick = async () => {
    if (!id) return;
    setIsSaving(true);
    try {
      const updated = await testService.autoPickQuestions(id, activeSection, {
        subject: section.subject,
        difficultyLevel: autoPickDifficulty && autoPickDifficulty !== 'all' ? autoPickDifficulty : undefined,
        count: autoPickCount,
      });
      setTest(updated);
      toast.success('Questions auto-picked');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Auto-pick failed';
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!id) return;
    if (!confirm('Publish this test? It will become available to students.')) return;
    try {
      await testService.publish(id);
      toast.success('Test published');
      navigate('/tests');
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to publish';
      toast.error(message);
    }
  };

  const DIFF_COLORS: Record<string, string> = {
    EASY: 'bg-green-100 text-green-700',
    MEDIUM: 'bg-amber-100 text-amber-700',
    HARD: 'bg-red-100 text-red-700',
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/tests')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-heading font-semibold">{test.title}</h2>
            <p className="text-sm text-muted-foreground">
              {test.examType.replace('_', ' ')} · {test.totalTimeMinutes} min · {test.totalMarks} marks
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {test.status === TestStatus.DRAFT && (
            <Button size="sm" onClick={handlePublish}>
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
          )}
          <Badge
            variant="secondary"
            className={test.status === TestStatus.DRAFT ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-700'}
          >
            {test.status}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        {/* Section Tabs (Left sidebar) */}
        <div className="col-span-3 space-y-2">
          <p className="text-sm font-medium text-muted-foreground px-1">Sections</p>
          {test.sections.map((s, i) => {
            const sQuestions = (s.questionIds || []) as unknown as IQuestion[];
            const qCount = sQuestions.length;
            const needed = s.questionCount;
            const isFull = qCount >= needed;
            return (
              <Card
                key={i}
                className={cn(
                  'cursor-pointer transition-colors',
                  i === activeSection ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                )}
                onClick={() => setActiveSection(i)}
              >
                <CardContent className="p-3">
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">{s.subject}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs font-medium ${isFull ? 'text-green-600' : 'text-amber-600'}`}>
                      {qCount}/{needed} questions
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {s.totalMarks} marks
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isFull ? 'bg-green-500' : 'bg-amber-500'}`}
                      style={{ width: `${Math.min(100, (qCount / needed) * 100)}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Section Content (Right area) */}
        <div className="col-span-9 space-y-4">
          {section && (
            <>
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-medium">{section.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {section.subject} · +{section.markingScheme.correct} / {section.markingScheme.incorrect} marks
                    {section.timeLimit ? ` · ${section.timeLimit} min` : ''}
                  </p>
                </div>
                <Button size="sm" onClick={() => setPickerOpen(true)} disabled={isSaving}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Questions
                </Button>
              </div>

              {/* Auto-pick */}
              <Card>
                <CardContent className="p-3">
                  <div className="flex items-end gap-3">
                    <div className="flex-1">
                      <Label className="text-xs">Auto-pick from {section.subject}</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="number"
                          value={autoPickCount}
                          onChange={(e) => setAutoPickCount(parseInt(e.target.value) || 1)}
                          className="h-8 w-20 text-sm"
                          min={1}
                          max={50}
                        />
                        <Select value={autoPickDifficulty} onValueChange={setAutoPickDifficulty}>
                          <SelectTrigger className="h-8 w-32 text-sm">
                            <SelectValue placeholder="Any difficulty" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">Any difficulty</SelectItem>
                            <SelectItem value={DifficultyLevel.EASY}>Easy</SelectItem>
                            <SelectItem value={DifficultyLevel.MEDIUM}>Medium</SelectItem>
                            <SelectItem value={DifficultyLevel.HARD}>Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleAutoPick} disabled={isSaving}>
                      <Shuffle className="h-4 w-4 mr-1" />
                      Auto-pick
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Separator />

              {/* Question List */}
              {sectionQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <p className="text-sm text-muted-foreground">No questions added to this section yet</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => setPickerOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Browse Question Bank
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {sectionQuestions.map((q, i) => {
                    // q might be a string (id) if not populated, or a full object
                    const isPopulated = typeof q !== 'string' && q.questionText;
                    if (!isPopulated) {
                      return (
                        <div key={String(q)} className="rounded-md border p-3 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Question #{i + 1} (loading...)</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleRemoveQuestion(String(q))}
                            disabled={isSaving}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </Button>
                        </div>
                      );
                    }
                    return (
                      <div key={`${q._id}-${i}`} className="rounded-md border p-3 flex items-start gap-3">
                        <div className="flex items-center gap-1 mt-0.5 shrink-0">
                          <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                          <span className="text-xs font-medium text-muted-foreground w-5">
                            {i + 1}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <MathRenderer html={q.questionText} className="text-sm line-clamp-2" />
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            <Badge variant="outline" className="text-[10px]">{q.subject}</Badge>
                            {q.topic && (
                              <Badge variant="outline" className="text-[10px]">{q.topic}</Badge>
                            )}
                            <Badge className={`text-[10px] ${DIFF_COLORS[q.difficultyLevel] || ''}`}>
                              {q.difficultyLevel}
                            </Badge>
                            <Badge variant="secondary" className="text-[10px]">
                              {q.questionType.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">
                              +{q.marks} / -{q.negativeMarks}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() => handleRemoveQuestion(q._id)}
                          disabled={isSaving}
                        >
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Question Picker Dialog */}
      <QuestionPicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onAdd={handleAddQuestions}
        existingIds={questionIdStrings}
        defaultSubject={section?.subject}
      />
    </div>
  );
}
