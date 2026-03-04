import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Search, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { ITest } from '@exam-portal/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Pagination } from '@/components/common/pagination';
import { cn } from '@/lib/utils';
import { testService, type TestFilters } from '@/services/test.service';

export function AdminResultsPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ITest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [status, setStatus] = useState('');
  const [examType, setExamType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 25;

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: TestFilters = { page, limit };
      if (search) filters.search = search;
      if (status && status !== 'all') filters.status = status;
      if (examType && examType !== 'all') filters.examType = examType;

      const result = await testService.getAll(filters);
      setTests(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch {
      toast.error('Failed to load tests');
    } finally {
      setIsLoading(false);
    }
  }, [page, search, status, examType, limit]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setExamType('');
    setPage(1);
  };

  const statusLabel = (s: string) => {
    const map: Record<string, string> = {
      draft: 'Draft',
      published: 'Published',
      active: 'Active',
      completed: 'Completed',
    };
    return map[s] || s;
  };

  const statusColor = (s: string) => {
    if (s === 'published' || s === 'active')
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (s === 'completed')
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
  };

  const examTypeLabel = (type: string) => type.replace(/_/g, ' ');

  const hasFilters = searchInput || status || examType;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Results</h2>
          <p className="text-sm text-muted-foreground">
            View results and analytics for all tests
            {!isLoading && ` (${total} tests)`}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={examType} onValueChange={(v) => { setExamType(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="JEE_MAIN">JEE Main</SelectItem>
            <SelectItem value="JEE_ADVANCED">JEE Advanced</SelectItem>
            <SelectItem value="NEET">NEET</SelectItem>
            <SelectItem value="CUSTOM">Custom</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="icon" onClick={handleClearFilters} title="Clear filters">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              Loading tests...
            </div>
          ) : tests.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <FileText className="h-8 w-8" />
              <p>No tests found</p>
              {hasFilters && (
                <Button variant="link" size="sm" onClick={handleClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test</TableHead>
                    <TableHead className="hidden sm:table-cell">Type</TableHead>
                    <TableHead className="hidden md:table-cell">Total Marks</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="hidden lg:table-cell">Batches</TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test._id}>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{test.title}</p>
                          <p className="text-xs text-muted-foreground sm:hidden">
                            {examTypeLabel(test.examType)}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {examTypeLabel(test.examType)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {test.totalMarks}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary" className={cn('text-xs', statusColor(test.status))}>
                          {statusLabel(test.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {test.assignedBatches.length > 0
                          ? test.assignedBatches.join(', ')
                          : '—'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/tests/${test._id}/results`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
