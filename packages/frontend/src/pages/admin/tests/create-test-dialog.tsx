import { useState, useEffect } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import {
  ExamType,
  EXAM_PRESETS,
  type ICreateTestRequest,
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
import { Separator } from '@/components/ui/separator';
import { SUBJECTS } from '@exam-portal/shared';

interface SectionForm {
  name: string;
  subject: string;
  questionCount: number;
  totalMarks: number;
  timeLimit: number;
  markingScheme: { correct: number; incorrect: number; unanswered: number };
}

interface CreateTestDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ICreateTestRequest) => Promise<void>;
  isSubmitting: boolean;
}

export function CreateTestDialog({
  open,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateTestDialogProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [examType, setExamType] = useState<ExamType>(ExamType.CUSTOM);
  const [sections, setSections] = useState<SectionForm[]>([
    { name: 'Section 1', subject: 'Physics', questionCount: 25, totalMarks: 100, timeLimit: 60, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
  ]);
  const [totalTimeMinutes, setTotalTimeMinutes] = useState(180);
  const [hasSectionTimeLimit, setHasSectionTimeLimit] = useState(false);
  const [randomizeQuestions, setRandomizeQuestions] = useState(false);
  const [randomizeOptions, setRandomizeOptions] = useState(false);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [assignedBatches, setAssignedBatches] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setDescription('');
    setExamType(ExamType.CUSTOM);
    setSections([
      { name: 'Section 1', subject: 'Physics', questionCount: 25, totalMarks: 100, timeLimit: 60, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
    ]);
    setTotalTimeMinutes(180);
    setHasSectionTimeLimit(false);
    setRandomizeQuestions(false);
    setRandomizeOptions(false);
    setStartTime('');
    setEndTime('');
    setAssignedBatches('');
    setError('');
  }, [open]);

  const applyPreset = (type: ExamType) => {
    setExamType(type);
    const preset = EXAM_PRESETS[type];
    if (!preset) return;

    setTotalTimeMinutes(preset.totalTime);
    setSections(
      preset.sections.map((s) => ({
        name: s.name,
        subject: s.subject,
        questionCount: s.questionCount,
        totalMarks: s.questionCount * s.markingScheme.correct,
        timeLimit: Math.floor(preset.totalTime / preset.sections.length),
        markingScheme: { correct: s.markingScheme.correct, incorrect: s.markingScheme.incorrect, unanswered: s.markingScheme.unanswered },
      })),
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { name: `Section ${prev.length + 1}`, subject: 'Physics', questionCount: 10, totalMarks: 40, timeLimit: 30, markingScheme: { correct: 4, incorrect: -1, unanswered: 0 } },
    ]);
  };

  const removeSection = (i: number) => {
    if (sections.length <= 1) return;
    setSections((prev) => prev.filter((_, idx) => idx !== i));
  };

  const updateSection = (i: number, field: string, value: unknown) => {
    setSections((prev) =>
      prev.map((s, idx) => (idx === i ? { ...s, [field]: value } : s)),
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (!title.trim()) { setError('Title is required'); return; }
    if (sections.length === 0) { setError('At least one section is required'); return; }

    const data: ICreateTestRequest = {
      title,
      description: description || undefined,
      examType,
      sections: sections.map((s) => ({
        ...s,
        questionIds: [],
      })),
      totalTimeMinutes,
      hasSectionTimeLimit,
      randomizeQuestions,
      randomizeOptions,
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      assignedBatches: assignedBatches ? assignedBatches.split(',').map((b) => b.trim()) : [],
    };

    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Test</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md p-2">{error}</p>
          )}

          {/* Basic Info */}
          <div className="space-y-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. JEE Main Mock Test 1" />
          </div>

          <div className="space-y-2">
            <Label>Description (optional)</Label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Brief description..." />
          </div>

          {/* Exam Type Preset */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Exam Type</Label>
              <Select value={examType} onValueChange={(v) => applyPreset(v as ExamType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ExamType.JEE_MAIN}>JEE Main</SelectItem>
                  <SelectItem value={ExamType.JEE_ADVANCED}>JEE Advanced</SelectItem>
                  <SelectItem value={ExamType.NEET}>NEET</SelectItem>
                  <SelectItem value={ExamType.CUSTOM}>Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Total Time (minutes)</Label>
              <Input type="number" value={totalTimeMinutes} onChange={(e) => setTotalTimeMinutes(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <Separator />

          {/* Sections */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Sections</Label>
              <Button variant="outline" size="sm" onClick={addSection}>
                <Plus className="h-4 w-4 mr-1" />
                Add Section
              </Button>
            </div>

            {sections.map((s, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Section {i + 1}</p>
                  {sections.length > 1 && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => removeSection(i)}>
                      <Trash2 className="h-4 w-4 text-muted-foreground" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input value={s.name} onChange={(e) => updateSection(i, 'name', e.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Subject</Label>
                    <Select value={s.subject} onValueChange={(v) => updateSection(i, 'subject', v)}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SUBJECTS.map((sub) => (
                          <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Questions</Label>
                    <Input type="number" value={s.questionCount} onChange={(e) => updateSection(i, 'questionCount', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Total Marks</Label>
                    <Input type="number" value={s.totalMarks} onChange={(e) => updateSection(i, 'totalMarks', parseInt(e.target.value) || 0)} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">+Marks</Label>
                    <Input type="number" value={s.markingScheme.correct} onChange={(e) => updateSection(i, 'markingScheme', { ...s.markingScheme, correct: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">−Marks</Label>
                    <Input type="number" value={s.markingScheme.incorrect} onChange={(e) => updateSection(i, 'markingScheme', { ...s.markingScheme, incorrect: parseFloat(e.target.value) || 0 })} className="h-8 text-sm" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Separator />

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Checkbox checked={randomizeQuestions} onCheckedChange={(c) => setRandomizeQuestions(c as boolean)} />
              <Label className="text-sm font-normal">Randomize question order</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={randomizeOptions} onCheckedChange={(c) => setRandomizeOptions(c as boolean)} />
              <Label className="text-sm font-normal">Randomize option order</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox checked={hasSectionTimeLimit} onCheckedChange={(c) => setHasSectionTimeLimit(c as boolean)} />
              <Label className="text-sm font-normal">Enable section-wise time limits</Label>
            </div>
          </div>

          <Separator />

          {/* Scheduling */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time (optional)</Label>
              <Input type="datetime-local" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>End Time (optional)</Label>
              <Input type="datetime-local" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Assigned Batches (comma-separated)</Label>
            <Input value={assignedBatches} onChange={(e) => setAssignedBatches(e.target.value)} placeholder="e.g. JEE-2026-A, JEE-2026-B" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
