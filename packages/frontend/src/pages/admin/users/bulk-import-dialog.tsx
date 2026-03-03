import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ParsedUser {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  batch?: string;
}

interface BulkImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (users: ParsedUser[]) => Promise<{ created: number; errors: Array<{ email: string; error: string }> }>;
}

export function BulkImportDialog({ open, onClose, onImport }: BulkImportDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedUsers, setParsedUsers] = useState<ParsedUser[]>([]);
  const [parseError, setParseError] = useState('');
  const [fileName, setFileName] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: Array<{ email: string; error: string }> } | null>(null);

  const resetState = () => {
    setParsedUsers([]);
    setParseError('');
    setFileName('');
    setResult(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleClose = () => {
    resetState();
    onClose();
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
          setParseError('CSV must have a header row and at least one data row');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const required = ['email', 'firstname', 'lastname', 'role'];
        const missing = required.filter((r) => !headers.includes(r));

        if (missing.length > 0) {
          setParseError(`Missing required columns: ${missing.join(', ')}`);
          return;
        }

        const users: ParsedUser[] = [];
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map((v) => v.trim());
          const row: Record<string, string> = {};
          headers.forEach((h, idx) => {
            row[h] = values[idx] || '';
          });

          if (!row.email) continue;

          users.push({
            email: row.email,
            firstName: row.firstname,
            lastName: row.lastname,
            role: row.role.toUpperCase(),
            phone: row.phone || undefined,
            batch: row.batch || undefined,
          });
        }

        setParsedUsers(users);
      } catch {
        setParseError('Failed to parse CSV file');
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const importResult = await onImport(parsedUsers);
      setResult(importResult);
    } catch {
      setParseError('Import failed. Please try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Bulk Import Users</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* CSV Format Info */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription className="text-xs">
              CSV format: <code className="bg-muted px-1 rounded">email,firstName,lastName,role,phone,batch</code>
              <br />
              Roles: ADMIN, TEACHER, STUDENT. Default password: <code className="bg-muted px-1 rounded">Student@123</code>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
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

          {/* Parse Error */}
          {parseError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{parseError}</AlertDescription>
            </Alert>
          )}

          {/* Preview */}
          {parsedUsers.length > 0 && !result && (
            <div className="rounded-md border p-3">
              <p className="text-sm font-medium mb-2">
                {parsedUsers.length} user{parsedUsers.length > 1 ? 's' : ''} ready to import
              </p>
              <div className="max-h-[150px] overflow-y-auto space-y-1">
                {parsedUsers.slice(0, 10).map((u, i) => (
                  <p key={i} className="text-xs text-muted-foreground">
                    {u.firstName} {u.lastName} — {u.email} ({u.role})
                  </p>
                ))}
                {parsedUsers.length > 10 && (
                  <p className="text-xs text-muted-foreground">
                    ...and {parsedUsers.length - 10} more
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="space-y-2">
              {result.created > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription>
                    Successfully imported {result.created} user{result.created > 1 ? 's' : ''}.
                  </AlertDescription>
                </Alert>
              )}
              {result.errors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <p className="font-medium mb-1">{result.errors.length} error{result.errors.length > 1 ? 's' : ''}:</p>
                    <div className="max-h-[100px] overflow-y-auto space-y-0.5">
                      {result.errors.map((err, i) => (
                        <p key={i} className="text-xs">{err.email}: {err.error}</p>
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
            <Button
              onClick={handleImport}
              disabled={parsedUsers.length === 0 || isImporting}
            >
              {isImporting ? 'Importing...' : `Import ${parsedUsers.length} Users`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
