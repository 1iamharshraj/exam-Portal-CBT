import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { ITest, ICreateTestRequest } from '@exam-portal/shared';
import { TestStatus, ExamType } from '@exam-portal/shared';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Pagination } from '@/components/common/pagination';
import { testService, type TestFilters } from '@/services/test.service';
import { TestCard } from './test-card';
import { CreateTestDialog } from './create-test-dialog';

export function TestListPage() {
  const navigate = useNavigate();
  const [tests, setTests] = useState<ITest[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [examType, setExamType] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleCreate = async (data: ICreateTestRequest) => {
    setIsSubmitting(true);
    try {
      await testService.create(data);
      toast.success('Test created');
      setCreateOpen(false);
      fetchTests();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to create test';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePublish = async (test: ITest) => {
    if (!confirm(`Publish "${test.title}"? This will make it available to students.`)) return;
    try {
      await testService.publish(test._id);
      toast.success('Test published');
      fetchTests();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || 'Failed to publish test';
      toast.error(message);
    }
  };

  const handleDelete = async (test: ITest) => {
    if (!confirm(`Delete "${test.title}"? This cannot be undone.`)) return;
    try {
      await testService.delete(test._id);
      toast.success('Test deleted');
      fetchTests();
    } catch {
      toast.error('Failed to delete test');
    }
  };

  const handleView = (test: ITest) => {
    navigate(`/tests/${test._id}/builder`);
  };

  const handleEdit = (test: ITest) => {
    navigate(`/tests/${test._id}/builder`);
  };

  const handleResults = (test: ITest) => {
    navigate(`/tests/${test._id}/results`);
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setExamType('');
    setPage(1);
  };

  const hasFilters = searchInput || status || examType;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-heading font-semibold">Tests</h2>
          <p className="text-sm text-muted-foreground">
            {total} test{total !== 1 ? 's' : ''} found
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Create Test
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tests..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 w-64"
        />
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={TestStatus.DRAFT}>Draft</SelectItem>
            <SelectItem value={TestStatus.PUBLISHED}>Published</SelectItem>
            <SelectItem value={TestStatus.ACTIVE}>Active</SelectItem>
            <SelectItem value={TestStatus.COMPLETED}>Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={examType} onValueChange={(v) => { setExamType(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value={ExamType.JEE_MAIN}>JEE Main</SelectItem>
            <SelectItem value={ExamType.JEE_ADVANCED}>JEE Advanced</SelectItem>
            <SelectItem value={ExamType.NEET}>NEET</SelectItem>
            <SelectItem value={ExamType.CUSTOM}>Custom</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClearFilters}>
            Clear
          </Button>
        )}
      </div>

      {/* Test List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Loading tests...
        </div>
      ) : tests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No tests found</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Create your first test
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {tests.map((t) => (
            <TestCard
              key={t._id}
              test={t}
              onView={handleView}
              onEdit={handleEdit}
              onPublish={handlePublish}
              onDelete={handleDelete}
              onResults={handleResults}
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

      {/* Create Dialog */}
      <CreateTestDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
