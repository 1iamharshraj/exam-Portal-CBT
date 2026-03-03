import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2, Download } from 'lucide-react';
import type { ICreateQuestionRequest } from '@exam-portal/shared';
import { QuestionType, DifficultyLevel } from '@exam-portal/shared';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface QuestionImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (questions: ICreateQuestionRequest[]) => Promise<{
    created: number;
    errors: Array<{ index: number; error: string }>;
  }>;
}

export function QuestionImportDialog({
  open,
  onClose,
  onImport,
}: QuestionImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ICreateQuestionRequest[]>([]);
  const [parseError, setParseError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{
    created: number;
    errors: Array<{ index: number; error: string }>;
  } | null>(null);

  const resetState = () => {
    setParsed([]);
    setParseError('');
    setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const downloadTemplate = () => {
    const csv =
      'question_type,question_text,option_a,option_b,option_c,option_d,correct_answer,subject,topic,difficulty,marks,negative_marks,explanation,tags\n' +
      'MCQ_SINGLE,What is 2+2?,1,2,3,4,D,Mathematics,Algebra,EASY,4,1,2+2=4,basic_math\n' +
      'NUMERICAL,Value of pi to 2 decimal places?,,,,,3.14|0.01,Mathematics,Trigonometry,MEDIUM,4,1,Pi is approximately 3.14159,constants';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'question_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResult(null);
    setParseError('');

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split('\n').filter((l) => l.trim());

        if (lines.length < 2) {
          setParseError('CSV must have a header and at least one data row');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const required = ['question_type', 'question_text', 'correct_answer', 'subject', 'topic', 'difficulty'];
        const missing = required.filter((r) => !headers.includes(r));

        if (missing.length > 0) {
          setParseError(`Missing columns: ${missing.join(', ')}`);
          return;
        }

        const questions: ICreateQuestionRequest[] = [];

        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => (row[h] = values[idx] || ''));

          if (!row.question_text) continue;

          const qType = row.question_type as QuestionType;
          const isNum = qType === QuestionType.NUMERICAL;

          let correctAnswer: string[] | { value: number; tolerance: number };
          let options: Array<{ text: string; isCorrect: boolean }> = [];

          if (isNum) {
            const parts = row.correct_answer.split('|');
            correctAnswer = {
              value: parseFloat(parts[0]),
              tolerance: parseFloat(parts[1] || '0'),
            };
          } else {
            const optTexts = [row.option_a, row.option_b, row.option_c, row.option_d].filter(Boolean);
            const correctLetters = row.correct_answer.split('').map((c) => c.toUpperCase());
            correctAnswer = correctLetters;
            options = optTexts.map((text, idx) => ({
              text,
              isCorrect: correctLetters.includes(String.fromCharCode(65 + idx)),
            }));
          }

          questions.push({
            questionText: row.question_text,
            questionType: qType,
            options,
            correctAnswer,
            subject: row.subject,
            topic: row.topic,
            difficultyLevel: (row.difficulty || 'MEDIUM') as DifficultyLevel,
            marks: parseFloat(row.marks || '4'),
            negativeMarks: parseFloat(row.negative_marks || '1'),
            explanation: row.explanation || undefined,
            tags: row.tags ? row.tags.split(';') : [],
          });
        }

        setParsed(questions);
      } catch {
        setParseError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const importResult = await onImport(parsed);
      setResult(importResult);
    } catch {
      setParseError('Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Import Questions from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Alert className="flex-1">
              <FileText className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Columns: question_type, question_text, option_a–d, correct_answer, subject, topic, difficulty, marks, negative_marks
              </AlertDescription>
            </Alert>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="shrink-0">
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
          </div>

          <div
            className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              {fileName || 'Click to upload CSV file'}
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {parsed.length > 0 && !result && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium mb-2">
                {parsed.length} question{parsed.length > 1 ? 's' : ''} ready
              </p>
              <div className="max-h-[120px] overflow-y-auto space-y-1">
                {parsed.slice(0, 8).map((q, i) => (
                  <p key={i} className="text-xs text-muted-foreground truncate">
                    {i + 1}. [{q.questionType}] {q.questionText.slice(0, 60)}...
                  </p>
                ))}
                {parsed.length > 8 && (
                  <p className="text-xs text-muted-foreground">...and {parsed.length - 8} more</p>
                )}
              </div>
            </div>
          )}

          {result && (
            <div className="space-y-2">
              {result.created > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Imported {result.created} question{result.created > 1 ? 's' : ''}.
                  </AlertDescription>
                </Alert>
              )}
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">{result.errors.length} error(s):</p>
                    <div className="max-h-[80px] overflow-y-auto space-y-0.5">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs">Row {err.index + 1}: {err.error}</p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {result ? 'Close' : 'Cancel'}
          </Button>
          {!result && (
            <Button onClick={handleImport} disabled={parsed.length === 0 || isImporting}>
              {isImporting ? 'Importing...' : `Import ${parsed.length} Questions`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
